import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createAbacatePayService } from '@/services/abacatePayService';
import {
  authenticateRequest,
  checkPaymentRateLimit,
  validateAmount,
  sanitizeString,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';

// ============================================
// POST Handler - Create PIX Payment for Store Order (Secured)
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

    // 8. Check if AbacatePay is enabled for this academy
    const academyRef = doc(db, 'academies', academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return createErrorResponse('Academy not found', 404);
    }

    if (!academySnap.data().abacatePayEnabled) {
      return createErrorResponse('Payment processing not enabled for this academy');
    }

    // 9. Verify the order exists and belongs to the student
    const orderRef = doc(db, `academies/${academyId}/storeOrders`, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return createErrorResponse('Order not found', 404);
    }

    const orderData = orderSnap.data();
    if (orderData.studentId !== studentId) {
      return createErrorResponse('Order does not belong to this student', 403);
    }

    if (orderData.status !== 'pending_payment') {
      return createErrorResponse('This order is not pending payment');
    }

    // 10. Verify amount matches order total
    if (orderData.totalAmount !== amount) {
      return createErrorResponse('Amount does not match order total', 400);
    }

    // 11. Create PIX payment for store order
    const abacatePayService = createAbacatePayService(academyId);
    const paymentLink = await abacatePayService.createPixPayment(
      amount,
      sanitizeString(description) || 'Pedido da Loja',
      `order_${orderId}`, // Prefix with 'order_' to differentiate from financial records
      studentId,
      sanitizeString(studentName) || 'Aluno'
    );

    if (!paymentLink) {
      return createErrorResponse('Failed to create PIX payment', 500);
    }

    return createSuccessResponse({
      pixCode: paymentLink.pixCode,
      qrCodeUrl: paymentLink.qrCodeUrl,
      expiresAt: paymentLink.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating store order PIX payment:', error);
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
