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

// ============================================
// Types
// ============================================
type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

interface WithdrawRequest {
  academyId: string;
  amount: number; // in centavos
  pixKey: string;
  pixKeyType: PixKeyType;
}

// ============================================
// Validate PIX Key Type
// ============================================
function isValidPixKeyType(type: unknown): type is PixKeyType {
  return ['cpf', 'cnpj', 'email', 'phone', 'random'].includes(type as string);
}

// ============================================
// POST Handler - Request Withdrawal via Asaas
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 2. Check rate limit (stricter for withdrawals)
    const rateLimit = checkPaymentRateLimit(`withdraw:${user.uid}`);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        429
      );
    }

    // 3. Parse and validate body
    const body: WithdrawRequest = await request.json();
    const { academyId, amount, pixKey, pixKeyType } = body;

    // 4. Validate required fields
    if (!academyId || !amount || !pixKey || !pixKeyType) {
      return createErrorResponse(
        'Missing required fields: academyId, amount, pixKey, pixKeyType'
      );
    }

    // 5. Validate user belongs to academy
    if (user.academyId !== academyId) {
      return createErrorResponse('Access denied: Invalid academy', 403);
    }

    // 6. Validate user is an admin of the academy
    if (user.role !== 'admin') {
      return createErrorResponse(
        'Access denied: Only admins can request withdrawals',
        403
      );
    }

    // 7. Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return createErrorResponse(amountValidation.error || 'Invalid amount');
    }

    // 8. Validate PIX key type
    if (!isValidPixKeyType(pixKeyType)) {
      return createErrorResponse('Invalid PIX key type');
    }

    // 9. Validate and sanitize PIX key
    const sanitizedPixKey = sanitizeString(pixKey);
    if (!sanitizedPixKey) {
      return createErrorResponse('Invalid PIX key');
    }

    // 10. Check wallet balance
    const walletRef = adminDb.collection('academies').doc(academyId).collection('wallet').doc('balance');
    const walletSnap = await walletRef.get();

    if (!walletSnap.exists) {
      return createErrorResponse('No wallet found. You need to receive payments first.');
    }

    const walletData = walletSnap.data()!;
    const availableBalance = walletData.availableBalance || 0;

    if (availableBalance < amount) {
      return createErrorResponse(
        `Insufficient balance. Available: R$ ${(availableBalance / 100).toFixed(2)}`
      );
    }

    // 11. Get the academy's Asaas API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      console.error(`[ASAAS] API key not configured for academy ${academyId}`);
      return createErrorResponse('Payment service not configured', 500);
    }

    // 12. Get academy data for description
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();
    const academyData = academySnap.data();

    // 13. Map pixKeyType to Asaas format
    const pixKeyTypeMap: Record<PixKeyType, string> = {
      cpf: 'CPF',
      cnpj: 'CNPJ',
      email: 'EMAIL',
      phone: 'PHONE',
      random: 'EVP',
    };

    // 14. Process withdrawal with Asaas transfer endpoint
    const baseUrl = getAsaasBaseUrl();
    let transferData: { id: string; status: string };

    try {
      const requestBody = {
        value: toAsaasAmount(amount),
        operationType: 'PIX',
        pixAddressKeyType: pixKeyTypeMap[pixKeyType],
        pixAddressKey: sanitizedPixKey,
        description: `Saque ${academyData?.name || academyId}`,
      };

      const response = await fetch(`${baseUrl}/v3/transfers`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ASAAS] Transfer error:', response.status, errorText);
        let errorMessage = 'Failed to process withdrawal';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.errors?.[0]?.description || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return createErrorResponse(errorMessage, 500);
      }

      transferData = await response.json();

      if (!transferData.id) {
        console.error('[ASAAS] No transfer ID in response:', JSON.stringify(transferData));
        return createErrorResponse('Payment service returned invalid response', 500);
      }
    } catch (error) {
      console.error('[ASAAS] Transfer API error:', error);
      return createErrorResponse('Failed to connect to payment provider', 500);
    }

    // 15. Update wallet and create transaction record (atomically)
    const walletTransactionsRef = adminDb.collection('academies').doc(academyId).collection('walletTransactions');

    try {
      await adminDb.runTransaction(async (transaction) => {
        // Re-read wallet balance inside transaction
        const freshWalletSnap = await transaction.get(walletRef);
        if (!freshWalletSnap.exists) {
          throw new Error('Wallet not found');
        }

        const freshBalance = freshWalletSnap.data()!.availableBalance || 0;
        if (freshBalance < amount) {
          throw new Error('Insufficient balance');
        }

        // Deduct from wallet
        transaction.update(walletRef, {
          availableBalance: FieldValue.increment(-amount),
          totalWithdrawn: FieldValue.increment(amount),
          transactionCount: FieldValue.increment(1),
          lastTransactionAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      // Create transaction record (outside transaction for better error handling)
      await walletTransactionsRef.add({
        academyId,
        type: 'withdrawal',
        amount,
        status: 'pending',
        asaasPaymentId: transferData.id,
        withdrawalPixKey: sanitizedPixKey,
        withdrawalPixKeyType: pixKeyType,
        requestedBy: user.uid,
        description: `Saque via PIX - ${pixKeyType.toUpperCase()}`,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('[ASAAS] Transaction error:', error);
      return createErrorResponse(
        'Failed to update wallet. Please contact support.',
        500
      );
    }

    return createSuccessResponse({
      transactionId: transferData.id,
      status: transferData.status,
      amount,
      message: 'Withdrawal request submitted successfully',
    });
  } catch (error) {
    console.error('[ASAAS] Withdrawal error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// ============================================
// OPTIONS Handler - CORS
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
