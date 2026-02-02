import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase/admin';
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
  data: {
    id: string;
    status: 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'COMPLETE' | 'REFUNDED';
    devMode: boolean;
    receiptUrl?: string;
    kind: string;
    amount: number;
    platformFee: number;
    createdAt: string;
    updatedAt: string;
  };
  error: string | null;
}

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

    // 6. Validate user is an admin of the academy
    if (user.role !== 'admin') {
      return createErrorResponse(
        'Access denied: Only admins can request withdrawals',
        403
      );
    }

    const academyRef = adminDb.collection('academies').doc(academyId);
    const academySnap = await academyRef.get();

    if (!academySnap.exists) {
      return createErrorResponse('Academy not found', 404);
    }

    const academyData = academySnap.data()!;

    // 7. Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return createErrorResponse(amountValidation.error || 'Invalid amount');
    }

    // 8. Validate PIX key type
    if (!isValidPixKeyType(pixKeyType)) {
      return createErrorResponse('Invalid PIX key type');
    }

    // 9. Validate and format PIX key
    const sanitizedPixKey = sanitizeString(pixKey);
    if (!sanitizedPixKey) {
      return createErrorResponse('Invalid PIX key');
    }

    // Format CPF/CNPJ with punctuation for AbacatePay API
    let formattedPixKey = sanitizedPixKey;
    if (pixKeyType === 'cpf') {
      const digits = sanitizedPixKey.replace(/\D/g, '');
      if (digits.length === 11) {
        formattedPixKey = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
      }
    } else if (pixKeyType === 'cnpj') {
      const digits = sanitizedPixKey.replace(/\D/g, '');
      if (digits.length === 14) {
        formattedPixKey = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
      }
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

    // 11. Check if AbacatePay is configured
    const apiKey = getApiKey();
    if (!apiKey) {
      return createErrorResponse(
        'Payment processing not configured. Contact support.',
        500
      );
    }

    // 12. Process withdrawal with AbacatePay
    const withdrawalExternalId = `withdraw-${academyId}-${Date.now()}`;
    let abacatePayResponse: AbacatePayWithdrawResponse;
    try {
      const pixTypeMap: Record<PixKeyType, string> = {
        cpf: 'CPF',
        cnpj: 'CNPJ',
        email: 'EMAIL',
        phone: 'PHONE',
        random: 'RANDOM',
      };

      const requestBody = {
        externalId: withdrawalExternalId,
        method: 'PIX',
        amount,
        pix: {
          type: pixTypeMap[pixKeyType],
          key: formattedPixKey,
        },
        description: `Saque ${academyData.name || academyId}`,
      };

      const response = await fetch('https://api.abacatepay.com/v1/withdraw/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AbacatePay withdrawal error:', response.status, errorText);
        let errorMessage = 'Failed to process withdrawal';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        return createErrorResponse(errorMessage, 500);
      }

      abacatePayResponse = await response.json();

      if (abacatePayResponse.error) {
        console.error('AbacatePay withdrawal error:', abacatePayResponse.error);
        return createErrorResponse(
          abacatePayResponse.error || 'Failed to process withdrawal',
          500
        );
      }
    } catch (error) {
      console.error('AbacatePay API error:', error);
      return createErrorResponse('Failed to connect to payment provider', 500);
    }

    // 13. Map AbacatePay status to internal status
    const withdrawData = abacatePayResponse.data;
    const statusMap: Record<string, string> = {
      PENDING: 'pending',
      COMPLETE: 'completed',
      EXPIRED: 'failed',
      CANCELLED: 'cancelled',
      REFUNDED: 'cancelled',
    };
    const internalStatus = statusMap[withdrawData.status] || 'pending';

    // 14. Update wallet and create transaction record (atomically)
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
          availableBalance: admin.firestore.FieldValue.increment(-amount),
          totalWithdrawn: admin.firestore.FieldValue.increment(amount),
          transactionCount: admin.firestore.FieldValue.increment(1),
          lastTransactionAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Create transaction record (outside transaction for better error handling)
      await walletTransactionsRef.add({
        academyId,
        type: 'withdrawal',
        amount,
        status: internalStatus === 'completed' ? 'completed' : 'pending',
        abacatePayTransactionId: withdrawData.id,
        externalId: withdrawalExternalId,
        withdrawalPixKey: sanitizedPixKey,
        withdrawalPixKeyType: pixKeyType,
        requestedBy: user.uid,
        description: `Saque via PIX - ${pixKeyType.toUpperCase()}`,
        fee: withdrawData.platformFee || 0,
        receiptUrl: withdrawData.receiptUrl || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: internalStatus === 'completed' ? admin.firestore.FieldValue.serverTimestamp() : null,
      });
    } catch (error) {
      console.error('Transaction error:', error);
      return createErrorResponse(
        'Failed to update wallet. Please contact support.',
        500
      );
    }

    return createSuccessResponse({
      transactionId: withdrawData.id,
      status: internalStatus,
      amount,
      fee: withdrawData.platformFee,
      receiptUrl: withdrawData.receiptUrl,
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
