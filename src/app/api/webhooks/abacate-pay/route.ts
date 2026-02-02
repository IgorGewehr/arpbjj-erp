import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { pushNotificationService } from '@/services/server';

// ============================================
// Types - AbacatePay Webhook Payload
// ============================================
interface AbacatePayWebhookPayload {
  event: 'billing.paid' | 'billing.expired' | 'billing.cancelled' | 'withdraw.done' | 'withdraw.failed';
  data: {
    // PIX payments come as pixQrCode
    pixQrCode?: {
      id: string;
      amount: number;
      kind: string;
      status: 'PAID' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
    };
    // Billing payments come as billing
    billing?: {
      id: string;
      amount: number;
      status: 'PAID' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
      products?: Array<{
        id: string;
        externalId: string;
        quantity: number;
      }>;
      paidAmount?: number;
    };
    // Payment info (for billing events)
    payment?: {
      amount: number;    // Amount received
      fee: number;       // AbacatePay fee
      method: 'PIX' | 'CARD';
    };
    // Withdraw transaction (for withdraw events)
    transaction?: {
      id: string;
      status: 'COMPLETE' | 'CANCELLED' | 'PENDING';
      devMode: boolean;
      receiptUrl: string;
      kind: string;
      amount: number;
      platformFee: number;
      externalId?: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  devMode: boolean;
}

// Our stored transaction record
interface WalletTransaction {
  academyId: string;
  financialId?: string;
  studentId?: string;
  studentName?: string;
  abacatePayTransactionId: string;
  externalId?: string;
  amount: number;
  fee?: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  type: 'payment' | 'withdrawal';
}

// ============================================
// Rate Limiting for Webhook (prevent replay attacks)
// ============================================
const processedWebhooks = new Map<string, number>();
const WEBHOOK_DEDUP_WINDOW = 5 * 60 * 1000; // 5 minutes

function isWebhookDuplicate(transactionId: string): boolean {
  const now = Date.now();

  // Clean old entries
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_DEDUP_WINDOW) {
      processedWebhooks.delete(key);
    }
  }

  if (processedWebhooks.has(transactionId)) {
    return true;
  }

  processedWebhooks.set(transactionId, now);
  return false;
}

// AbacatePay public key for HMAC-SHA256 webhook signature verification
const ABACATEPAY_PUBLIC_KEY = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

// ============================================
// Validate Webhook - Query String Secret
// AbacatePay appends ?webhookSecret=xxx to the URL
// ============================================
function validateWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const receivedSecret = request.nextUrl.searchParams.get('webhookSecret');
  if (!receivedSecret) return false;

  // Timing-safe comparison
  try {
    const a = Buffer.from(secret);
    const b = Buffer.from(receivedSecret);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ============================================
// Validate HMAC-SHA256 Signature (X-Webhook-Signature header)
// ============================================
function validateHmacSignature(rawBody: string, signatureHeader: string): boolean {
  try {
    const expectedSig = createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
      .update(Buffer.from(rawBody, 'utf8'))
      .digest('base64');

    const a = Buffer.from(expectedSig);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ============================================
// Find Transaction by AbacatePay ID or financialId
// Uses collectionGroup query to search across all academies
// ============================================
async function findTransaction(
  abacatePayId: string,
  financialId?: string
): Promise<{ academyId: string; transaction: WalletTransaction; docRef: FirebaseFirestore.DocumentReference } | null> {
  try {
    // 1. Try by abacatePayTransactionId first
    let snapshot = await adminDb
      .collectionGroup('walletTransactions')
      .where('abacatePayTransactionId', '==', abacatePayId)
      .get();

    // 2. Fallback: search by financialId (handles pixQrCode/create → billing.paid mismatch)
    if (snapshot.empty && financialId) {
      console.log(`[WEBHOOK] Not found by abacatePayId ${abacatePayId}, trying financialId: ${financialId}`);
      snapshot = await adminDb
        .collectionGroup('walletTransactions')
        .where('financialId', '==', financialId)
        .get();
    }

    if (snapshot.empty) {
      console.error(`[WEBHOOK] Transaction not found for abacatePayId: ${abacatePayId}, financialId: ${financialId}`);
      return null;
    }

    const docSnap = snapshot.docs[0];
    const transaction = docSnap.data() as WalletTransaction;

    // Extract academyId from the document path
    // Path: academies/{academyId}/walletTransactions/{transactionId}
    const pathParts = docSnap.ref.path.split('/');
    const academyId = pathParts[1];

    return {
      academyId,
      transaction,
      docRef: docSnap.ref,
    };
  } catch (error) {
    console.error('[WEBHOOK] Error finding transaction:', error);
    return null;
  }
}

// ============================================
// Update Wallet Balance (Server-side only)
// ============================================
async function updateWalletBalance(
  academyId: string,
  amount: number,
  fee: number
): Promise<void> {
  const walletRef = adminDb.doc(`academies/${academyId}/wallet/balance`);
  const walletSnap = await walletRef.get();

  // Net amount after AbacatePay fee
  const netAmount = amount - fee;

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

// ============================================
// Handle Payment Confirmed
// ============================================
async function handlePaymentConfirmed(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference,
  amount: number,
  fee: number
): Promise<void> {
  const { financialId, studentId, studentName, abacatePayTransactionId } = transaction;

  // Update transaction status
  await transactionDocRef.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    fee,
    netAmount: amount - fee,
  });

  // Determine if this is a store order or financial payment
  const isStoreOrder = financialId?.startsWith('order_');

  if (isStoreOrder && financialId) {
    // Handle store order payment
    const orderId = financialId.replace('order_', '');
    await handleStoreOrderPayment(academyId, orderId, amount, fee, studentName, abacatePayTransactionId);
  } else if (financialId) {
    // Handle financial (mensalidade) payment
    await handleFinancialPayment(academyId, financialId, amount, fee, studentName);
  }

  // Update wallet balance (with fee deducted)
  await updateWalletBalance(academyId, amount, fee);
}

// ============================================
// Handle Financial Payment
// ============================================
async function handleFinancialPayment(
  academyId: string,
  financialId: string,
  amount: number,
  fee: number,
  studentName?: string
): Promise<void> {
  const financialRef = adminDb.doc(`academies/${academyId}/financials/${financialId}`);
  const financialSnap = await financialRef.get();

  if (!financialSnap.exists) {
    console.error(`Financial record not found: ${financialId}`);
    return;
  }

  // Only update if not already paid (idempotency)
  if (financialSnap.data()?.status === 'paid') {
    console.log(`Financial ${financialId} already paid, skipping`);
    return;
  }

  await financialRef.update({
    status: 'paid',
    paymentDate: FieldValue.serverTimestamp(),
    method: 'pix',
    paidViaAbacatePay: true,
    abacatePayFee: fee,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify admin
  await notifyAdmin(academyId, 'payment_received', {
    title: 'Pagamento Recebido',
    message: `${studentName || 'Aluno'} pagou R$ ${(amount / 100).toFixed(2)} via PIX.`,
    financialId,
  });
}

// ============================================
// Handle Store Order Payment
// ============================================
async function handleStoreOrderPayment(
  academyId: string,
  orderId: string,
  amount: number,
  fee: number,
  studentName?: string,
  abacatePayTransactionId?: string
): Promise<void> {
  const orderRef = adminDb.doc(`academies/${academyId}/storeOrders/${orderId}`);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    console.error('Order not found:', orderId);
    return;
  }

  const orderData = orderSnap.data()!;

  // Only update if pending (idempotency)
  if (orderData.status !== 'pending_payment') {
    console.log(`Order ${orderId} already processed, skipping`);
    return;
  }

  await orderRef.update({
    status: 'paid',
    paidAt: FieldValue.serverTimestamp(),
    abacatePayFee: fee,
    ...(abacatePayTransactionId && { externalPaymentId: abacatePayTransactionId }),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Decrement stock for in_stock products
  const items = orderData.items as Array<{ productId: string; quantity: number }> | undefined;
  if (items && items.length > 0) {
    for (const item of items) {
      const productRef = adminDb.doc(`academies/${academyId}/storeProducts/${item.productId}`);
      const productSnap = await productRef.get();
      if (productSnap.exists) {
        const productData = productSnap.data()!;
        if (productData.stockType === 'in_stock') {
          await productRef.update({
            stockQuantity: FieldValue.increment(-item.quantity),
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`Decremented stock for product ${item.productId} by ${item.quantity}`);
        }
      }
    }
  }

  // Notify admin
  await notifyAdmin(academyId, 'order_paid', {
    title: 'Pedido Pago',
    message: `${studentName || orderData.studentName || 'Aluno'} pagou o pedido #${orderId.slice(-6).toUpperCase()} - R$ ${(amount / 100).toFixed(2)}.`,
    actionUrl: `/loja/pedidos?id=${orderId}`,
    actionLabel: 'Ver pedido',
  });
}

// ============================================
// Handle Payment Cancelled/Expired
// ============================================
async function handlePaymentCancelled(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  // Update transaction status
  await transactionDocRef.update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // If it's a store order, cancel the order
  if (transaction.financialId?.startsWith('order_')) {
    const orderId = transaction.financialId.replace('order_', '');
    const orderRef = adminDb.doc(`academies/${academyId}/storeOrders/${orderId}`);
    const orderSnap = await orderRef.get();

    if (orderSnap.exists && orderSnap.data()?.status === 'pending_payment') {
      await orderRef.update({
        status: 'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: 'payment_expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
}

// ============================================
// Notify Admin
// ============================================
async function notifyAdmin(
  academyId: string,
  type: string,
  data: {
    title: string;
    message: string;
    financialId?: string;
    actionUrl?: string;
    actionLabel?: string;
  }
): Promise<void> {
  try {
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();

    if (!academySnap.exists) return;

    const ownerId = academySnap.data()?.ownerId;
    if (!ownerId) return;

    // Create in-app notification
    await adminDb.collection(`academies/${academyId}/notifications`).add({
      academyId,
      userId: ownerId,
      type,
      priority: 'high',
      title: data.title,
      message: data.message,
      financialId: data.financialId,
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
      read: false,
      channels: ['in_app', 'push'],
      sentVia: ['in_app'],
      createdAt: FieldValue.serverTimestamp(),
    });

    // Send push notification
    if (type === 'payment_received' && data.financialId) {
      await pushNotificationService.notifyPaymentReceived(
        ownerId,
        data.message.split(' pagou')[0], // Extract student name
        0, // Amount already in message
        data.financialId
      );
    }
  } catch (error) {
    console.error('Error notifying admin:', error);
  }
}

// ============================================
// Find Withdraw Transaction by AbacatePay ID or externalId
// ============================================
async function findWithdrawTransaction(
  abacatePayId: string,
  externalId?: string
): Promise<{ academyId: string; transaction: WalletTransaction; docRef: FirebaseFirestore.DocumentReference } | null> {
  try {
    let snapshot = await adminDb
      .collectionGroup('walletTransactions')
      .where('abacatePayTransactionId', '==', abacatePayId)
      .get();

    if (snapshot.empty && externalId) {
      console.log(`[WEBHOOK] Withdraw not found by abacatePayId ${abacatePayId}, trying externalId: ${externalId}`);
      snapshot = await adminDb
        .collectionGroup('walletTransactions')
        .where('externalId', '==', externalId)
        .get();
    }

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    const transaction = docSnap.data() as WalletTransaction;
    const pathParts = docSnap.ref.path.split('/');
    const academyId = pathParts[1];

    return { academyId, transaction, docRef: docSnap.ref };
  } catch (error) {
    console.error('[WEBHOOK] Error finding withdraw transaction:', error);
    return null;
  }
}

// ============================================
// Process Withdraw Webhook
// ============================================
async function processWithdrawWebhook(
  event: 'withdraw.done' | 'withdraw.failed',
  data: AbacatePayWebhookPayload['data']
): Promise<NextResponse> {
  const transaction = data.transaction;
  if (!transaction) {
    console.error('[WEBHOOK] No transaction in withdraw payload:', JSON.stringify(data));
    return NextResponse.json(
      { error: 'Invalid payload: missing transaction' },
      { status: 400 }
    );
  }

  const { id: transactionId, amount, platformFee, externalId, receiptUrl, status } = transaction;

  console.log(`[WEBHOOK] Received: ${event} for withdraw ${transactionId}, amount: ${amount}, fee: ${platformFee}, status: ${status}`);

  // Check for duplicate webhook (idempotency)
  if (isWebhookDuplicate(`withdraw_${transactionId}`)) {
    console.log(`Duplicate webhook detected for withdraw transaction ${transactionId}`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Find the withdrawal transaction in our database
  const result = await findWithdrawTransaction(transactionId, externalId);

  if (!result) {
    console.error(`[WEBHOOK] Withdraw transaction not found: transactionId=${transactionId}, externalId=${externalId}`);
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    );
  }

  const { academyId, transaction: walletTransaction, docRef } = result;

  // Validate it's actually a withdrawal
  if (walletTransaction.type !== 'withdrawal') {
    console.error(`[WEBHOOK] Transaction ${transactionId} is not a withdrawal, type: ${walletTransaction.type}`);
    return NextResponse.json(
      { error: 'Transaction type mismatch' },
      { status: 400 }
    );
  }

  // Process event
  if (event === 'withdraw.done') {
    await handleWithdrawDone(academyId, walletTransaction, docRef, platformFee, receiptUrl);
    console.log(`[WEBHOOK] Withdraw completed for transaction ${transactionId}`);
  } else {
    await handleWithdrawFailed(academyId, walletTransaction, docRef);
    console.log(`[WEBHOOK] Withdraw failed for transaction ${transactionId}`);
  }

  return NextResponse.json({ received: true });
}

// ============================================
// Handle Withdraw Done
// ============================================
async function handleWithdrawDone(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference,
  platformFee: number,
  receiptUrl?: string
): Promise<void> {
  // Idempotency: don't process if already completed
  if (transaction.status === 'completed') {
    console.log('[WEBHOOK] Withdrawal already completed, skipping');
    return;
  }

  await transactionDocRef.update({
    status: 'completed',
    fee: platformFee,
    completedAt: FieldValue.serverTimestamp(),
    ...(receiptUrl && { receiptUrl }),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmin(academyId, 'withdrawal_completed', {
    title: 'Saque Concluído',
    message: `Saque de R$ ${(transaction.amount / 100).toFixed(2)} via PIX foi concluído com sucesso.`,
  });
}

// ============================================
// Handle Withdraw Failed
// ============================================
async function handleWithdrawFailed(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  // Idempotency: don't process if already failed or cancelled
  if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    console.log('[WEBHOOK] Withdrawal already failed/cancelled, skipping');
    return;
  }

  const amount = transaction.amount;

  // Update transaction status
  await transactionDocRef.update({
    status: 'failed',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Refund wallet - the amount was deducted when the withdrawal was created
  const walletRef = adminDb.doc(`academies/${academyId}/wallet/balance`);
  await walletRef.update({
    availableBalance: FieldValue.increment(amount),
    totalWithdrawn: FieldValue.increment(-amount),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmin(academyId, 'withdrawal_failed', {
    title: 'Saque Falhou',
    message: `O saque de R$ ${(amount / 100).toFixed(2)} via PIX falhou. O valor foi devolvido ao saldo.`,
  });
}

// ============================================
// POST Handler
// ============================================
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Parse payload
    let payload: AbacatePayWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('Invalid JSON in webhook payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { event, data, devMode } = payload;

    // Authenticate webhook request (two-layer per AbacatePay docs)
    // Layer 1: Query string secret (?webhookSecret=xxx)
    if (!validateWebhookSecret(request)) {
      console.error('[WEBHOOK] Invalid or missing webhookSecret query parameter');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Layer 2: HMAC-SHA256 signature (X-Webhook-Signature header) - optional
    const hmacSignature = request.headers.get('x-webhook-signature');
    if (hmacSignature) {
      if (!validateHmacSignature(rawBody, hmacSignature)) {
        console.error('[WEBHOOK] Invalid HMAC signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      console.log('[WEBHOOK] HMAC signature verified');
    }

    // Handle withdraw events (different payload structure)
    if (event === 'withdraw.done' || event === 'withdraw.failed') {
      return await processWithdrawWebhook(event, data);
    }

    // --- Billing events ---
    // AbacatePay sends pixQrCode for PIX payments, billing for billing payments
    const source = data.pixQrCode || data.billing;
    if (!source) {
      console.error('[WEBHOOK] No pixQrCode or billing in payload:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'Invalid payload: missing pixQrCode or billing' },
        { status: 400 }
      );
    }

    const transactionId = source.id;
    const amount = source.amount ?? data.payment?.amount;
    const fee = data.payment?.fee || 0;
    const status = source.status;

    // Extract orderId from billing products if available
    const productExternalId = data.billing?.products?.[0]?.externalId;
    const financialIdFromWebhook = productExternalId ? `order_${productExternalId}` : undefined;

    console.log(`[WEBHOOK] Received: ${event} for ${data.pixQrCode ? 'pixQrCode' : 'billing'} ${transactionId}, amount: ${amount}, fee: ${fee}, status: ${status}`);

    // Check for duplicate webhook (idempotency)
    if (isWebhookDuplicate(transactionId)) {
      console.log(`Duplicate webhook detected for transaction ${transactionId}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Find the transaction in our database
    const result = await findTransaction(transactionId, financialIdFromWebhook);

    if (!result) {
      console.error(`[WEBHOOK] Transaction not found in database: billingId=${transactionId}, financialId=${financialIdFromWebhook}`);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const { academyId, transaction, docRef } = result;
    console.log(`[WEBHOOK] Found transaction in academy ${academyId}, financialId: ${transaction.financialId}, status: ${transaction.status}`);

    // Validate amount matches
    if (transaction.amount !== amount) {
      console.error(`[WEBHOOK] Amount mismatch: expected ${transaction.amount}, got ${amount}`);
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Process event
    switch (event) {
      case 'billing.paid':
        if (status === 'PAID') {
          await handlePaymentConfirmed(academyId, transaction, docRef, amount, fee);
          console.log(`Payment confirmed for transaction ${transactionId}`);
        }
        break;

      case 'billing.expired':
      case 'billing.cancelled':
        await handlePaymentCancelled(academyId, transaction, docRef);
        console.log(`Payment cancelled/expired for transaction ${transactionId}`);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// GET Handler (Health Check)
// ============================================
export async function GET() {
  return NextResponse.json({
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
