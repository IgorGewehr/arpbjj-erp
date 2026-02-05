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

// AbacatePay API configuration
const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

function getApiKey(): string | null {
  return process.env.ABACATEPAY_API_KEY || null;
}

// ============================================
// POST Handler - Create PIX Payment (Secured)
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
    const { academyId, amount, description, financialId, studentId, studentName } = body;

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

    // 8. Check if AbacatePay is enabled for this academy (using Admin SDK)
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();

    if (!academySnap.exists) {
      return createErrorResponse('Academy not found', 404);
    }

    if (!academySnap.data()?.abacatePayEnabled) {
      return createErrorResponse('Payment processing not enabled for this academy');
    }

    // 9. Verify the financial record exists and belongs to the student
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

    // Re-validate amount against Firestore financial record
    if (financialData.amount !== amount) {
      return createErrorResponse('Valor não corresponde ao registro financeiro', 400);
    }

    // 10. Get API key
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('ABACATEPAY_API_KEY not configured');
      return createErrorResponse('Payment service not configured', 500);
    }

    // 11. Call AbacatePay API - pixQrCode/create
    const response = await fetch(`${ABACATEPAY_API_URL}/pixQrCode/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        description: sanitizeString(description) || 'Mensalidade',
        externalReference: `${academyId}_${financialId}`,
        expiresIn: 86400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AbacatePay API error:', errorData);
      return createErrorResponse('Failed to create PIX payment', 500);
    }

    const responseData = await response.json();
    const pixData = responseData.data || responseData;
    const abacatePayId = pixData.id;

    if (!abacatePayId) {
      console.error('No PIX ID in AbacatePay response:', JSON.stringify(responseData));
      return createErrorResponse('Payment service returned invalid response', 500);
    }

    // 12. Update financial record with PIX info (using Admin SDK)
    await adminDb.doc(`academies/${academyId}/financials/${financialId}`).update({
      pixCode: pixData.brCode || null,
      pixQrCode: pixData.brCodeBase64 || null,
      externalId: abacatePayId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 13. Create walletTransaction record for webhook to find (using Admin SDK)
    await adminDb.collection(`academies/${academyId}/walletTransactions`).add({
      academyId,
      type: 'payment',
      amount,
      status: 'pending',
      financialId,
      studentId,
      studentName: sanitizeString(studentName) || 'Aluno',
      abacatePayTransactionId: abacatePayId,
      pixCode: pixData.brCode || null,
      qrCodeUrl: pixData.brCodeBase64 || null,
      description: sanitizeString(description) || 'Mensalidade',
      createdAt: FieldValue.serverTimestamp(),
    });

    return createSuccessResponse({
      pixCode: pixData.brCode || '',
      qrCodeUrl: pixData.brCodeBase64 || '',
      abacatePayId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error creating PIX payment:', error);
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
