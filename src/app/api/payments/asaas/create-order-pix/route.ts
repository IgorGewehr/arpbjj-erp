import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  authenticateRequest,
  checkPaymentRateLimit,
  validateAmount,
  sanitizeString,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';
import { getAsaasBaseUrl, getAcademyAsaasApiKey, toAsaasAmount } from '@/lib/asaas';
import { getOrCreateAsaasCustomer } from '@/lib/asaasCustomer';

// ============================================
// POST Handler - Create PIX Payment for Store Order via Asaas
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 2. Check rate limit
    const rateLimit = checkPaymentRateLimit(user.uid);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        429
      );
    }

    // 3. Parse and validate body
    const body = await request.json();
    const { academyId, amount, description, orderId, studentId, studentName } = body;

    // 4. Validate required fields
    if (!academyId || !amount || !orderId || !studentId) {
      return createErrorResponse(
        'Missing required fields: academyId, amount, orderId, studentId'
      );
    }

    // 5. Validate user belongs to academy
    if (user.academyId !== academyId) {
      return createErrorResponse('Access denied: Invalid academy', 403);
    }

    // 6. Validate user is paying for themselves or is staff
    const isStaff = user.role === 'admin' || user.role === 'instructor';
    if (!isStaff && user.studentId !== studentId) {
      return createErrorResponse('Access denied: Cannot pay for another student', 403);
    }

    // 7. Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return createErrorResponse(amountValidation.error || 'Invalid amount');
    }

    // 8. Check if Asaas is enabled for this academy
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();

    if (!academySnap.exists) {
      return createErrorResponse('Academy not found', 404);
    }

    if (!academySnap.data()?.asaasEnabled) {
      return createErrorResponse('Asaas payment processing not enabled for this academy');
    }

    // 9. Verify the order exists and belongs to the student
    const orderRef = adminDb.doc(`academies/${academyId}/storeOrders/${orderId}`);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return createErrorResponse('Order not found', 404);
    }

    const orderData = orderSnap.data()!;
    if (orderData.studentId !== studentId) {
      return createErrorResponse('Order does not belong to this student', 403);
    }

    if (orderData.status !== 'pending_payment') {
      return createErrorResponse('This order is not pending payment');
    }

    // 10. Verify amount matches order total (allow 1 cent tolerance)
    const orderTotal = orderData.total ?? orderData.totalAmount;
    if (Math.abs(orderTotal - amount) > 1) {
      return createErrorResponse(
        `Amount (${amount}) does not match order total (${orderTotal})`,
        400
      );
    }

    // 11. Get the academy's Asaas API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      console.error(`[ASAAS] API key not configured for academy ${academyId}`);
      return createErrorResponse('Payment service not configured', 500);
    }

    // 12. Get or create Asaas customer for this student
    const asaasCustomerId = await getOrCreateAsaasCustomer(academyId, studentId, apiKey);
    if (!asaasCustomerId) {
      console.error(`[ASAAS] Failed to get/create customer for student ${studentId}`);
      return createErrorResponse('Failed to create payment customer', 500);
    }

    // 13. Create PIX payment in Asaas
    const baseUrl = getAsaasBaseUrl();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dueDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    const paymentResponse = await fetch(`${baseUrl}/v3/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: toAsaasAmount(amount),
        description: sanitizeString(description) || 'Pedido da Loja',
        externalReference: `${academyId}_order_${orderId}`,
        dueDate,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('[ASAAS] Error creating PIX payment for order:', errorData);
      return createErrorResponse('Failed to create PIX payment', 500);
    }

    const paymentData = await paymentResponse.json();
    const asaasPaymentId = paymentData.id;

    if (!asaasPaymentId) {
      console.error('[ASAAS] No payment ID in response:', JSON.stringify(paymentData));
      return createErrorResponse('Payment service returned invalid response', 500);
    }

    // 14. Get PIX QR Code
    const qrCodeResponse = await fetch(`${baseUrl}/v3/payments/${asaasPaymentId}/pixQrCode`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
      },
    });

    if (!qrCodeResponse.ok) {
      const qrError = await qrCodeResponse.json();
      console.error('[ASAAS] Error fetching PIX QR code:', qrError);
      return createErrorResponse('Failed to generate PIX QR code', 500);
    }

    const qrCodeData = await qrCodeResponse.json();
    const pixCode = qrCodeData.payload || '';
    const qrCodeUrl = qrCodeData.encodedImage || '';

    // 15. Create walletTransaction record for webhook to find
    await adminDb.collection(`academies/${academyId}/walletTransactions`).add({
      academyId,
      type: 'payment',
      amount: Math.round(amount),
      status: 'pending',
      financialId: `order_${orderId}`,
      studentId,
      studentName: sanitizeString(studentName) || 'Aluno',
      asaasPaymentId,
      pixCode: pixCode || null,
      qrCodeUrl: qrCodeUrl || null,
      description: sanitizeString(description) || 'Pedido da Loja',
      createdAt: FieldValue.serverTimestamp(),
    });

    // 16. Update order with payment info
    await orderRef.update({
      asaasPaymentId,
      pixCode: pixCode || null,
      paymentMethod: 'pix',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return createSuccessResponse({
      pixCode,
      qrCodeUrl,
      asaasPaymentId,
      expiresAt,
    });
  } catch (error) {
    console.error('[ASAAS] Error creating store order PIX payment:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// ============================================
// OPTIONS Handler - CORS (Restrictive)
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
