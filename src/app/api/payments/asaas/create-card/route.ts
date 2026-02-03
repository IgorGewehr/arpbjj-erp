import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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
import { getAsaasBaseUrl, getAcademyAsaasApiKey, toAsaasAmount, fromAsaasAmount } from '@/lib/asaas';
import { getOrCreateAsaasCustomer } from '@/lib/asaasCustomer';

// ============================================
// POST Handler - Create Card Payment via Asaas
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

    // 13. Check if Asaas is enabled for this academy
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();

    if (!academySnap.exists) {
      return createErrorResponse('Academy not found', 404);
    }

    const academyData = academySnap.data()!;

    if (!academyData.asaasEnabled) {
      return createErrorResponse('Asaas payment processing not enabled for this academy');
    }

    // 14. Verify the financial record exists and belongs to the student
    if (!financialId.startsWith('order_')) {
      const financialSnap = await adminDb.doc(`academies/${academyId}/financials/${financialId}`).get();

      if (!financialSnap.exists) {
        return createErrorResponse('Financial record not found', 404);
      }

      const financialData = financialSnap.data()!;
      if (financialData.studentId !== studentId) {
        return createErrorResponse('Financial record does not belong to this student', 403);
      }

      if (financialData.status === 'paid') {
        return createErrorResponse('This payment has already been completed');
      }
    }

    // 15. Get the academy's Asaas API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      console.error(`[ASAAS] API key not configured for academy ${academyId}`);
      return createErrorResponse('Payment service not configured', 500);
    }

    // 16. Get or create Asaas customer for this student
    const asaasCustomerId = await getOrCreateAsaasCustomer(academyId, studentId, apiKey);
    if (!asaasCustomerId) {
      console.error(`[ASAAS] Failed to get/create customer for student ${studentId}`);
      return createErrorResponse('Failed to create payment customer', 500);
    }

    // 17. Get student data for creditCardHolderInfo
    const studentSnap = await adminDb.doc(`academies/${academyId}/students/${studentId}`).get();
    const studentData = studentSnap.exists ? studentSnap.data() : null;
    const studentEmail = studentData?.email || '';
    const studentZipCode = studentData?.address?.zipCode || academyData.zipCode || '';

    // 18. Prepare expiry fields for Asaas
    const expiryMonth = month.toString().padStart(2, '0');
    const expiryYear = year < 100 ? `20${year.toString().padStart(2, '0')}` : year.toString();

    // 19. Create card payment in Asaas
    const baseUrl = getAsaasBaseUrl();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const paymentResponse = await fetch(`${baseUrl}/v3/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'CREDIT_CARD',
        value: toAsaasAmount(amount),
        description: sanitizeString(description) || 'Pagamento',
        externalReference: `${academyId}_${financialId}`,
        dueDate: today,
        creditCard: {
          holderName: sanitizeString(cardHolder) || '',
          number: cleanedCardNumber,
          expiryMonth,
          expiryYear,
          ccv: cleanedCvv,
        },
        creditCardHolderInfo: {
          name: sanitizeString(cardHolder) || '',
          cpfCnpj: cpf.replace(/\D/g, ''),
          email: studentEmail,
          postalCode: studentZipCode.replace(/\D/g, ''),
          addressNumber: '0',
        },
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('[ASAAS] Error creating card payment:', errorData);

      // Extract user-friendly message from Asaas errors
      const asaasErrors = errorData.errors;
      const errorMessage = Array.isArray(asaasErrors) && asaasErrors.length > 0
        ? asaasErrors[0].description || 'Failed to process card payment'
        : 'Failed to process card payment';

      return createErrorResponse(errorMessage, 500);
    }

    const paymentData = await paymentResponse.json();
    const asaasPaymentId = paymentData.id;
    const asaasStatus = paymentData.status; // CONFIRMED, PENDING, etc.

    if (!asaasPaymentId) {
      console.error('[ASAAS] No payment ID in response:', JSON.stringify(paymentData));
      return createErrorResponse('Payment service returned invalid response', 500);
    }

    // 20. Determine fee from response (Asaas returns netValue in Reais)
    const fee = paymentData.value != null && paymentData.netValue != null
      ? fromAsaasAmount(paymentData.value - paymentData.netValue)
      : 0;

    // 21. Create walletTransaction record
    const isConfirmed = asaasStatus === 'CONFIRMED';
    const transactionStatus = isConfirmed ? 'completed' : 'pending';

    const walletTransactionData: Record<string, unknown> = {
      academyId,
      type: 'payment',
      amount,
      fee,
      status: transactionStatus,
      financialId,
      studentId,
      studentName: sanitizeString(studentName) || 'Aluno',
      asaasPaymentId,
      description: sanitizeString(description) || 'Pagamento',
      paymentMethod: 'credit_card',
      createdAt: FieldValue.serverTimestamp(),
    };

    if (isConfirmed) {
      walletTransactionData.completedAt = FieldValue.serverTimestamp();
      walletTransactionData.netAmount = amount - fee;
    }

    await adminDb.collection(`academies/${academyId}/walletTransactions`).add(walletTransactionData);

    // 22. If payment was confirmed synchronously, update financial and wallet
    if (isConfirmed) {
      // Update financial record
      if (!financialId.startsWith('order_')) {
        await adminDb.doc(`academies/${academyId}/financials/${financialId}`).update({
          status: 'paid',
          paymentDate: FieldValue.serverTimestamp(),
          method: 'credit_card',
          paidViaAsaas: true,
          asaasFee: fee,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Update wallet balance
      const netAmount = amount - fee;
      const walletRef = adminDb.doc(`academies/${academyId}/wallet/balance`);
      const walletSnap = await walletRef.get();

      if (!walletSnap.exists) {
        await walletRef.set({
          academyId,
          availableBalance: netAmount,
          pendingBalance: 0,
          totalReceived: amount,
          totalFees: fee,
          totalWithdrawn: 0,
          transactionCount: 1,
          lastTransactionAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await walletRef.update({
          availableBalance: FieldValue.increment(netAmount),
          totalReceived: FieldValue.increment(amount),
          totalFees: FieldValue.increment(fee),
          transactionCount: FieldValue.increment(1),
          lastTransactionAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 23. Return response
    const message = isConfirmed
      ? 'Pagamento aprovado com sucesso'
      : 'Pagamento em processamento';

    return createSuccessResponse({
      transactionId: asaasPaymentId,
      message,
    });
  } catch (error) {
    console.error('[ASAAS] Error creating card payment:', error);
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
