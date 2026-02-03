import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAsaasBaseUrl, getAcademyAsaasApiKey } from '@/lib/asaas';
import { getOrCreateAsaasCustomer } from '@/lib/asaasCustomer';

// ============================================
// POST Handler - Generate Asaas PIX Payment for Store Order
// (No auth - called server-side)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { academyId, orderId } = body;

    // 1. Validate required fields
    if (!academyId || !orderId) {
      return NextResponse.json(
        { error: 'academyId and orderId are required' },
        { status: 400 }
      );
    }

    // 2. Check if Asaas is enabled for this academy
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();

    if (!academySnap.exists) {
      return NextResponse.json(
        { error: 'Academy not found' },
        { status: 404 }
      );
    }

    if (!academySnap.data()?.asaasEnabled) {
      return NextResponse.json(
        { error: 'Asaas is not enabled for this academy' },
        { status: 400 }
      );
    }

    // 3. Get the order
    const orderRef = adminDb.doc(`academies/${academyId}/storeOrders/${orderId}`);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderSnap.data()!;

    if (order.status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Order is not pending payment' },
        { status: 400 }
      );
    }

    // 4. Get the academy's Asaas API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      console.error(`[ASAAS] API key not configured for academy ${academyId}`);
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // 5. Get or create Asaas customer for this student
    const asaasCustomerId = await getOrCreateAsaasCustomer(academyId, order.studentId, apiKey);
    if (!asaasCustomerId) {
      console.error(`[ASAAS] Failed to get/create customer for student ${order.studentId}`);
      return NextResponse.json(
        { error: 'Failed to create payment customer' },
        { status: 500 }
      );
    }

    // 6. Create PIX payment in Asaas
    // Store order total is already in Reais (not centavos)
    const baseUrl = getAsaasBaseUrl();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dueDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    const orderTotal = order.total ?? order.totalAmount;

    const paymentResponse = await fetch(`${baseUrl}/v3/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: orderTotal,
        description: `Pedido #${orderId.slice(-6).toUpperCase()} - ${order.studentName || 'Aluno'}`,
        externalReference: `${academyId}_order_${orderId}`,
        dueDate,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('[ASAAS] Error creating PIX payment:', errorData);
      return NextResponse.json(
        { error: errorData.errors?.[0]?.description || 'Failed to create PIX payment' },
        { status: 500 }
      );
    }

    const paymentData = await paymentResponse.json();
    const asaasPaymentId = paymentData.id;

    if (!asaasPaymentId) {
      console.error('[ASAAS] No payment ID in response:', JSON.stringify(paymentData));
      return NextResponse.json(
        { error: 'Payment service returned invalid response' },
        { status: 500 }
      );
    }

    // 7. Get PIX QR Code
    const qrCodeResponse = await fetch(`${baseUrl}/v3/payments/${asaasPaymentId}/pixQrCode`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
      },
    });

    if (!qrCodeResponse.ok) {
      const qrError = await qrCodeResponse.json();
      console.error('[ASAAS] Error fetching PIX QR code:', qrError);
      return NextResponse.json(
        { error: 'Failed to generate PIX QR code' },
        { status: 500 }
      );
    }

    const qrCodeData = await qrCodeResponse.json();
    const pixCode = qrCodeData.payload || '';
    const qrCodeUrl = qrCodeData.encodedImage || '';

    // 8. Create walletTransaction record for webhook to find
    await adminDb.collection(`academies/${academyId}/walletTransactions`).add({
      academyId,
      type: 'payment',
      amount: orderTotal,
      status: 'pending',
      financialId: `order_${orderId}`,
      studentId: order.studentId,
      studentName: order.studentName || 'Aluno',
      asaasPaymentId,
      description: `Pedido #${orderId.slice(-6).toUpperCase()} - ${order.studentName || 'Aluno'}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 9. Update order with payment info
    await orderRef.update({
      asaasPaymentId,
      externalPaymentId: asaasPaymentId,
      pixCode,
      paymentMethod: 'pix',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    return NextResponse.json({
      success: true,
      paymentLink: {
        pixCode,
        qrCodeUrl,
        expiresAt,
        createdAt,
      },
    });
  } catch (error) {
    console.error('[ASAAS] Error generating store payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
