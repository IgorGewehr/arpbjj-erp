import { NextRequest, NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
// Types
// ============================================
type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

interface WithdrawRequest {
  academyId: string;
  amount: number; // in centavos
  pixKey: string;
  pixKeyType: PixKeyType;
}

interface AbacatePayWithdrawResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  fee?: number;
}

// ============================================
// Minimum withdrawal amount (in centavos)
// ============================================
const MIN_WITHDRAWAL_AMOUNT = 1000; // R$ 10.00

// ============================================
// Validate PIX Key Type
// ============================================
function isValidPixKeyType(type: unknown): type is PixKeyType {
  return ['cpf', 'cnpj', 'email', 'phone', 'random'].includes(type as string);
}

// ============================================
// Get API Key from Environment
// ============================================
function getApiKey(): string | null {
  return process.env.ABACATEPAY_API_KEY || null;
}

// ============================================
// POST Handler - Request Withdrawal
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

    // 6. Validate user is the academy owner
    const academyRef = doc(db, 'academies', academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return createErrorResponse('Academy not found', 404);
    }

    const academyData = academySnap.data();
    if (academyData.ownerId !== user.uid) {
      return createErrorResponse(
        'Access denied: Only the academy owner can request withdrawals',
        403
      );
    }

    // 7. Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return createErrorResponse(amountValidation.error || 'Invalid amount');
    }

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      return createErrorResponse(
        `Minimum withdrawal amount is R$ ${(MIN_WITHDRAWAL_AMOUNT / 100).toFixed(2)}`
      );
    }

    // 8. Validate PIX key type
    if (!isValidPixKeyType(pixKeyType)) {
      return createErrorResponse('Invalid PIX key type');
    }

    // 9. Validate PIX key format based on type
    const sanitizedPixKey = sanitizeString(pixKey);
    if (!sanitizedPixKey) {
      return createErrorResponse('Invalid PIX key');
    }

    // 10. Check wallet balance
    const walletRef = doc(db, `academies/${academyId}/wallet`, 'balance');
    const walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) {
      return createErrorResponse('No wallet found. You need to receive payments first.');
    }

    const walletData = walletSnap.data();
    const availableBalance = walletData.availableBalance || 0;

    if (availableBalance < amount) {
      return createErrorResponse(
        `Insufficient balance. Available: R$ ${(availableBalance / 100).toFixed(2)}`
      );
    }

    // 11. Check if AbacatePay is configured
    const apiKey = getApiKey();
    if (!apiKey) {
      return createErrorResponse(
        'Payment processing not configured. Contact support.',
        500
      );
    }

    // 12. Process withdrawal with AbacatePay
    let abacatePayResponse: AbacatePayWithdrawResponse;
    try {
      const response = await fetch('https://api.abacatepay.com/v1/pix/withdraw', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          pixKey: sanitizedPixKey,
          pixKeyType,
          metadata: {
            academyId,
            requestedBy: user.uid,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AbacatePay withdrawal error:', errorData);
        return createErrorResponse(
          errorData.message || 'Failed to process withdrawal',
          500
        );
      }

      abacatePayResponse = await response.json();
    } catch (error) {
      console.error('AbacatePay API error:', error);
      return createErrorResponse('Failed to connect to payment provider', 500);
    }

    // 13. Update wallet and create transaction record (atomically)
    const walletTransactionsRef = collection(db, `academies/${academyId}/walletTransactions`);

    try {
      await runTransaction(db, async (transaction) => {
        // Re-read wallet balance inside transaction
        const freshWalletSnap = await transaction.get(walletRef);
        if (!freshWalletSnap.exists()) {
          throw new Error('Wallet not found');
        }

        const freshBalance = freshWalletSnap.data().availableBalance || 0;
        if (freshBalance < amount) {
          throw new Error('Insufficient balance');
        }

        // Deduct from wallet
        transaction.update(walletRef, {
          availableBalance: increment(-amount),
          totalWithdrawn: increment(amount),
          transactionCount: increment(1),
          lastTransactionAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Create transaction record (outside transaction for better error handling)
      await addDoc(walletTransactionsRef, {
        academyId,
        type: 'withdrawal',
        amount,
        status: abacatePayResponse.status === 'completed' ? 'completed' : 'pending',
        abacatePayTransactionId: abacatePayResponse.id,
        withdrawalPixKey: sanitizedPixKey,
        withdrawalPixKeyType: pixKeyType,
        requestedBy: user.uid,
        description: `Saque via PIX - ${pixKeyType.toUpperCase()}`,
        fee: abacatePayResponse.fee || 0,
        createdAt: serverTimestamp(),
        completedAt: abacatePayResponse.status === 'completed' ? serverTimestamp() : null,
      });
    } catch (error) {
      console.error('Transaction error:', error);
      // Note: AbacatePay withdrawal may have succeeded even if our DB update failed
      // In production, you'd want to handle this with a reconciliation process
      return createErrorResponse(
        'Failed to update wallet. Please contact support.',
        500
      );
    }

    return createSuccessResponse({
      transactionId: abacatePayResponse.id,
      status: abacatePayResponse.status,
      amount,
      message: 'Withdrawal request submitted successfully',
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
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
