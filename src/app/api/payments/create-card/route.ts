import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createAbacatePayService } from '@/services/abacatePayService';
import {
  authenticateRequest,
  checkPaymentRateLimit,
  validateAmount,
  validateCPF,
  validateCardNumber,
  sanitizeString,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';

// ============================================
// POST Handler - Create Card Payment (Secured)
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
    const {
      academyId,
      amount,
      description,
      financialId,
      studentId,
      studentName,
      cardNumber,
      cardHolder,
      expirationMonth,
      expirationYear,
      cvv,
      cpf,
    } = body;

    // 4. Validate required fields
    if (!academyId || !amount || !financialId || !studentId) {
      return createErrorResponse(
        'Missing required fields: academyId, amount, financialId, studentId'
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

    // 8. Validate card data
    if (!cardNumber || !cardHolder || !expirationMonth || !expirationYear || !cvv || !cpf) {
      return createErrorResponse(
        'Missing card data: cardNumber, cardHolder, expirationMonth, expirationYear, cvv, cpf'
      );
    }

    // 9. Validate card number (Luhn algorithm)
    const cleanedCardNumber = cardNumber.toString().replace(/\D/g, '');
    if (!validateCardNumber(cleanedCardNumber)) {
      return createErrorResponse('Invalid card number');
    }

    // 10. Validate CPF
    if (!validateCPF(cpf)) {
      return createErrorResponse('Invalid CPF');
    }

    // 11. Validate expiration date
    const month = parseInt(expirationMonth, 10);
    const year = parseInt(expirationYear, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      return createErrorResponse('Invalid expiration month');
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return createErrorResponse('Card has expired');
    }

    // 12. Validate CVV
    const cleanedCvv = cvv.toString().replace(/\D/g, '');
    if (cleanedCvv.length < 3 || cleanedCvv.length > 4) {
      return createErrorResponse('Invalid CVV');
    }

    // 13. Check if AbacatePay is enabled for this academy
    const academyRef = doc(db, 'academies', academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return createErrorResponse('Academy not found', 404);
    }

    if (!academySnap.data().abacatePayEnabled) {
      return createErrorResponse('Payment processing not enabled for this academy');
    }

    // 14. Verify the financial record exists and belongs to the student
    if (!financialId.startsWith('order_')) {
      const financialRef = doc(db, `academies/${academyId}/financials`, financialId);
      const financialSnap = await getDoc(financialRef);

      if (!financialSnap.exists()) {
        return createErrorResponse('Financial record not found', 404);
      }

      const financialData = financialSnap.data();
      if (financialData.studentId !== studentId) {
        return createErrorResponse('Financial record does not belong to this student', 403);
      }

      if (financialData.status === 'paid') {
        return createErrorResponse('This payment has already been completed');
      }
    }

    // 15. Create card payment (sanitize inputs)
    const abacatePayService = createAbacatePayService(academyId);
    const result = await abacatePayService.createCardPayment(
      amount,
      sanitizeString(description) || 'Pagamento',
      financialId,
      studentId,
      sanitizeString(studentName) || 'Aluno',
      {
        cardNumber: cleanedCardNumber,
        cardHolder: sanitizeString(cardHolder) || '',
        expirationMonth: expirationMonth.toString().padStart(2, '0'),
        expirationYear: year.toString(),
        cvv: cleanedCvv,
        cpf: cpf.replace(/\D/g, ''),
      }
    );

    if (!result.success) {
      // Log failed attempt for security monitoring
      console.warn(`Card payment failed for user ${user.uid}: ${result.message}`);
      return createErrorResponse(result.message || 'Failed to process card payment');
    }

    return createSuccessResponse({
      transactionId: result.transactionId,
      message: result.message,
    });
  } catch (error) {
    console.error('Error creating card payment:', error);
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
