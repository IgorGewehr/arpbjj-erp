import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// AbacatePay API configuration
const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

function getApiKey(): string | null {
  return process.env.ABACATEPAY_API_KEY || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { academyId, orderId, method = 'PIX' } = body;

    // Validate required fields
    if (!academyId || !orderId) {
      return NextResponse.json(
        { error: 'academyId and orderId are required' },
        { status: 400 }
      );
    }

    // Check if AbacatePay is enabled for this academy
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();

    if (!academySnap.exists) {
      return NextResponse.json(
        { error: 'Academy not found' },
        { status: 404 }
      );
    }

    if (!academySnap.data()?.abacatePayEnabled) {
      return NextResponse.json(
        { error: 'AbacatePay is not enabled for this academy' },
        { status: 400 }
      );
    }

    // Get the order
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

    // Get API key
    const apiKey = getApiKey();

    if (!apiKey) {
      console.error('ABACATEPAY_API_KEY not configured');
      return NextResponse.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Use /billing/create for PIX - returns billing ID that matches webhook payload
    const requestBody = {
      frequency: 'ONE_TIME',
      methods: [method],
      products: order.items.map((item: { productId: string; productName: string; quantity: number; unitPrice: number }) => ({
        externalId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/portal/loja/pedidos`,
      completionUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/portal/loja/pedidos?success=true`,
      metadata: {
        academyId,
        orderId,
        studentId: order.studentId,
        type: 'store_order',
      },
    };
    console.log('[GENERATE-PAYMENT] Sending to AbacatePay /billing/create:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[GENERATE-PAYMENT] AbacatePay response status:', response.status);
    console.log('[GENERATE-PAYMENT] AbacatePay response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('AbacatePay API error:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to create PIX payment' },
        { status: 500 }
      );
    }

    const billingData = data.data || data;
    const abacatePayId = billingData.id;
    const brCode = billingData.pix?.brcode || '';
    const brCodeBase64 = billingData.pix?.qrcode || '';

    if (!abacatePayId) {
      console.error('[GENERATE-PAYMENT] No billing ID in response:', data);
      return NextResponse.json(
        { error: 'Billing ID not returned by payment service' },
        { status: 500 }
      );
    }

    if (!brCode) {
      console.error('[GENERATE-PAYMENT] No brCode in response:', data);
      return NextResponse.json(
        { error: 'PIX code not returned by payment service' },
        { status: 500 }
      );
    }

    // Create walletTransaction record for webhook to find
    await adminDb.collection(`academies/${academyId}/walletTransactions`).add({
      academyId,
      type: 'payment',
      amount: order.totalAmount,
      status: 'pending',
      financialId: `order_${orderId}`,
      studentId: order.studentId,
      studentName: order.studentName,
      abacatePayTransactionId: abacatePayId,
      description: `Pedido #${orderId.slice(-6).toUpperCase()} - ${order.studentName}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update order with payment info (using Admin SDK - bypasses rules)
    await orderRef.update({
      abacatePayTransactionId: abacatePayId,
      pixCode: brCode,
      paymentMethod: 'pix',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      paymentLink: {
        pixCode: brCode,
        qrCodeUrl: brCodeBase64,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
