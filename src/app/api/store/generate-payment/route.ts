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

    // Call AbacatePay API
    const response = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
          academyId: academyId,
          orderId: orderId,
          studentId: order.studentId,
          type: 'store_order',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AbacatePay API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const abacatePayId = data.data.id;

    // Create walletTransaction record for webhook to find
    await adminDb.collection(`academies/${academyId}/walletTransactions`).add({
      academyId,
      type: 'payment',
      amount: order.total,
      status: 'pending',
      financialId: `order_${orderId}`,
      studentId: order.studentId,
      studentName: order.studentName,
      abacatePayTransactionId: abacatePayId,
      pixCode: data.data.pix?.brcode || null,
      qrCodeUrl: data.data.pix?.qrcode || null,
      description: `Pedido #${orderId.slice(-6).toUpperCase()}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update order with payment info (using Admin SDK - bypasses rules)
    if (method === 'PIX') {
      await orderRef.update({
        abacatePayTransactionId: abacatePayId,
        pixCode: data.data.pix?.brcode,
        qrCodeUrl: data.data.pix?.qrcode,
        paymentMethod: 'pix',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        paymentLink: {
          pixCode: data.data.pix?.brcode || '',
          qrCodeUrl: data.data.pix?.qrcode || '',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      });
    } else {
      // For CARD, AbacatePay returns a checkout URL
      await orderRef.update({
        abacatePayTransactionId: abacatePayId,
        paymentMethod: 'credit_card',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        paymentLink: {
          pixCode: '',
          qrCodeUrl: data.data.url || '',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Error generating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
