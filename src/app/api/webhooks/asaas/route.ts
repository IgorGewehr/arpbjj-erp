import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fromAsaasAmount } from '@/lib/asaas';
import { pushNotificationService } from '@/services/server';

// ============================================
// Types - Asaas Webhook Payload
// ============================================
interface AsaasPaymentData {
  id: string;
  customer: string;
  value: number; // Reais
  netValue: number; // Reais (after fee)
  status: string;
  billingType: string;
  externalReference: string; // "academyId_financialId"
}

interface AsaasTransferData {
  id: string;
  value: number; // Reais
  netValue: number; // Reais
  status: string;
}

interface AsaasWebhookPayload {
  event: string;
  payment?: AsaasPaymentData;
  transfer?: AsaasTransferData;
}

// Our stored transaction record
interface WalletTransaction {
  academyId: string;
  financialId?: string;
  studentId?: string;
  studentName?: string;
  asaasPaymentId?: string;
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

function isWebhookDuplicate(eventKey: string): boolean {
  const now = Date.now();

  // Clean old entries
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_DEDUP_WINDOW) {
      processedWebhooks.delete(key);
    }
  }

  if (processedWebhooks.has(eventKey)) {
    return true;
  }

  processedWebhooks.set(eventKey, now);
  return false;
}

// ============================================
// Validate Asaas Webhook Auth Token
// ============================================
function validateWebhookToken(request: NextRequest): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_AUTH_TOKEN;
  if (!expectedToken) {
    console.error('[ASAAS-WEBHOOK] ASAAS_WEBHOOK_AUTH_TOKEN env var not set');
    return false;
  }

  const receivedToken = request.headers.get('asaas-access-token');
  if (!receivedToken) {
    return false;
  }

  // Timing-safe comparison
  try {
    const a = Buffer.from(expectedToken);
    const b = Buffer.from(receivedToken);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ============================================
// Find Transaction by asaasPaymentId or financialId
// Uses collectionGroup query to search across all academies
// ============================================
async function findTransaction(
  asaasPaymentId: string,
  financialId?: string,
  academyIdHint?: string
): Promise<{
  academyId: string;
  transaction: WalletTransaction;
  docRef: FirebaseFirestore.DocumentReference;
} | null> {
  try {
    // 1. Try by asaasPaymentId first
    let snapshot = await adminDb
      .collectionGroup('walletTransactions')
      .where('asaasPaymentId', '==', asaasPaymentId)
      .get();

    // 2. Fallback: search by financialId
    if (snapshot.empty && financialId) {
      console.log(
        `[ASAAS-WEBHOOK] Not found by asaasPaymentId ${asaasPaymentId}, trying financialId: ${financialId}`
      );

      if (academyIdHint) {
        // Scoped query when we know the academy
        snapshot = await adminDb
          .collection(`academies/${academyIdHint}/walletTransactions`)
          .where('financialId', '==', financialId)
          .get();
      } else {
        snapshot = await adminDb
          .collectionGroup('walletTransactions')
          .where('financialId', '==', financialId)
          .get();
      }
    }

    if (snapshot.empty) {
      console.error(
        `[ASAAS-WEBHOOK] Transaction not found for asaasPaymentId: ${asaasPaymentId}, financialId: ${financialId}`
      );
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
    console.error('[ASAAS-WEBHOOK] Error finding transaction:', error);
    return null;
  }
}

// ============================================
// Find Withdraw Transaction by asaasPaymentId
// ============================================
async function findWithdrawTransaction(
  asaasTransferId: string
): Promise<{
  academyId: string;
  transaction: WalletTransaction;
  docRef: FirebaseFirestore.DocumentReference;
} | null> {
  try {
    const snapshot = await adminDb
      .collectionGroup('walletTransactions')
      .where('asaasPaymentId', '==', asaasTransferId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    const transaction = docSnap.data() as WalletTransaction;
    const pathParts = docSnap.ref.path.split('/');
    const academyId = pathParts[1];

    return { academyId, transaction, docRef: docSnap.ref };
  } catch (error) {
    console.error('[ASAAS-WEBHOOK] Error finding withdraw transaction:', error);
    return null;
  }
}

// ============================================
// Update Wallet Balance (Server-side only)
// ============================================
async function updateWalletBalance(
  academyId: string,
  grossAmountCentavos: number,
  feeAmountCentavos: number
): Promise<void> {
  const walletRef = adminDb.doc(`academies/${academyId}/wallet/balance`);
  const walletSnap = await walletRef.get();

  const netAmount = grossAmountCentavos - feeAmountCentavos;

  if (!walletSnap.exists) {
    await walletRef.set({
      academyId,
      availableBalance: netAmount,
      pendingBalance: 0,
      totalReceived: grossAmountCentavos,
      totalFees: feeAmountCentavos,
      totalWithdrawn: 0,
      transactionCount: 1,
      lastTransactionAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await walletRef.update({
      availableBalance: FieldValue.increment(netAmount),
      totalReceived: FieldValue.increment(grossAmountCentavos),
      totalFees: FieldValue.increment(feeAmountCentavos),
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
  grossAmountCentavos: number,
  feeAmountCentavos: number
): Promise<void> {
  const netAmountCentavos = grossAmountCentavos - feeAmountCentavos;
  const { financialId, studentName, asaasPaymentId } = transaction;

  // Update transaction status
  await transactionDocRef.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    fee: feeAmountCentavos,
    netAmount: netAmountCentavos,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Determine if this is a store order or financial payment
  const isStoreOrder = financialId?.startsWith('order_');

  if (isStoreOrder && financialId) {
    const orderId = financialId.replace('order_', '');
    await handleStoreOrderPayment(
      academyId,
      orderId,
      grossAmountCentavos,
      feeAmountCentavos,
      studentName,
      asaasPaymentId
    );
  } else if (financialId) {
    await handleFinancialPayment(
      academyId,
      financialId,
      grossAmountCentavos,
      feeAmountCentavos,
      studentName
    );
  }

  // Update wallet balance
  await updateWalletBalance(academyId, grossAmountCentavos, feeAmountCentavos);
}

// ============================================
// Handle Financial Payment
// ============================================
async function handleFinancialPayment(
  academyId: string,
  financialId: string,
  grossAmountCentavos: number,
  feeAmountCentavos: number,
  studentName?: string
): Promise<void> {
  const financialRef = adminDb.doc(
    `academies/${academyId}/financials/${financialId}`
  );
  const financialSnap = await financialRef.get();

  if (!financialSnap.exists) {
    console.error(`[ASAAS-WEBHOOK] Financial record not found: ${financialId}`);
    return;
  }

  // Only update if not already paid (idempotency)
  if (financialSnap.data()?.status === 'paid') {
    console.log(`[ASAAS-WEBHOOK] Financial ${financialId} already paid, skipping`);
    return;
  }

  await financialRef.update({
    status: 'paid',
    paymentDate: FieldValue.serverTimestamp(),
    method: 'pix',
    paidViaAsaas: true,
    asaasFee: feeAmountCentavos,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify admin
  await notifyAdmin(academyId, 'payment_received', {
    title: 'Pagamento Recebido',
    message: `${studentName || 'Aluno'} pagou R$ ${(grossAmountCentavos / 100).toFixed(2)} via PIX (Asaas).`,
    financialId,
  });
}

// ============================================
// Handle Store Order Payment
// ============================================
async function handleStoreOrderPayment(
  academyId: string,
  orderId: string,
  grossAmountCentavos: number,
  feeAmountCentavos: number,
  studentName?: string,
  asaasPaymentId?: string
): Promise<void> {
  const orderRef = adminDb.doc(
    `academies/${academyId}/storeOrders/${orderId}`
  );
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    console.error('[ASAAS-WEBHOOK] Order not found:', orderId);
    return;
  }

  const orderData = orderSnap.data()!;

  // Only update if pending (idempotency)
  if (orderData.status !== 'pending_payment') {
    console.log(`[ASAAS-WEBHOOK] Order ${orderId} already processed, skipping`);
    return;
  }

  await orderRef.update({
    status: 'paid',
    paidAt: FieldValue.serverTimestamp(),
    asaasFee: feeAmountCentavos,
    ...(asaasPaymentId && { externalPaymentId: asaasPaymentId }),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Decrement stock for in_stock products
  const items = orderData.items as
    | Array<{ productId: string; quantity: number }>
    | undefined;
  if (items && items.length > 0) {
    for (const item of items) {
      const productRef = adminDb.doc(
        `academies/${academyId}/storeProducts/${item.productId}`
      );
      const productSnap = await productRef.get();
      if (productSnap.exists) {
        const productData = productSnap.data()!;
        if (productData.stockType === 'in_stock') {
          await productRef.update({
            stockQuantity: FieldValue.increment(-item.quantity),
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(
            `[ASAAS-WEBHOOK] Decremented stock for product ${item.productId} by ${item.quantity}`
          );
        }
      }
    }
  }

  // Notify admin
  await notifyAdmin(academyId, 'order_paid', {
    title: 'Pedido Pago',
    message: `${studentName || orderData.studentName || 'Aluno'} pagou o pedido #${orderId.slice(-6).toUpperCase()} - R$ ${(grossAmountCentavos / 100).toFixed(2)} (Asaas).`,
    actionUrl: `/loja/pedidos?id=${orderId}`,
    actionLabel: 'Ver pedido',
  });
}

// ============================================
// Handle Payment Expired
// ============================================
async function handlePaymentExpired(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  await transactionDocRef.update({
    status: 'cancelled',
    cancelReason: 'payment_overdue',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // If it's a store order, cancel the order
  if (transaction.financialId?.startsWith('order_')) {
    const orderId = transaction.financialId.replace('order_', '');
    const orderRef = adminDb.doc(
      `academies/${academyId}/storeOrders/${orderId}`
    );
    const orderSnap = await orderRef.get();

    if (orderSnap.exists && orderSnap.data()?.status === 'pending_payment') {
      await orderRef.update({
        status: 'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: 'payment_overdue',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
}

// ============================================
// Handle Payment Cancelled (deleted / refunded)
// ============================================
async function handlePaymentCancelled(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  await transactionDocRef.update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // If it's a store order, cancel the order
  if (transaction.financialId?.startsWith('order_')) {
    const orderId = transaction.financialId.replace('order_', '');
    const orderRef = adminDb.doc(
      `academies/${academyId}/storeOrders/${orderId}`
    );
    const orderSnap = await orderRef.get();

    if (orderSnap.exists && orderSnap.data()?.status === 'pending_payment') {
      await orderRef.update({
        status: 'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: 'payment_cancelled',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
}

// ============================================
// Handle Withdraw Done (TRANSFER_CONFIRMED)
// ============================================
async function handleWithdrawDone(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  // Idempotency: don't process if already completed
  if (transaction.status === 'completed') {
    console.log('[ASAAS-WEBHOOK] Withdrawal already completed, skipping');
    return;
  }

  await transactionDocRef.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmin(academyId, 'withdrawal_completed', {
    title: 'Saque Concluido',
    message: `Saque de R$ ${(transaction.amount / 100).toFixed(2)} via PIX foi concluido com sucesso (Asaas).`,
  });
}

// ============================================
// Handle Withdraw Failed (TRANSFER_FAILED)
// ============================================
async function handleWithdrawFailed(
  academyId: string,
  transaction: WalletTransaction,
  transactionDocRef: FirebaseFirestore.DocumentReference
): Promise<void> {
  // Idempotency: don't process if already failed or cancelled
  if (transaction.status === 'failed' || transaction.status === 'cancelled') {
    console.log('[ASAAS-WEBHOOK] Withdrawal already failed/cancelled, skipping');
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
    message: `O saque de R$ ${(amount / 100).toFixed(2)} via PIX falhou. O valor foi devolvido ao saldo (Asaas).`,
  });
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

    const ownerId =
      academySnap.data()?.ownerId || academySnap.data()?.adminUserId;
    if (!ownerId) {
      console.error(
        `[ASAAS-WEBHOOK] notifyAdmin: No ownerId or adminUserId found for academy ${academyId}`
      );
      return;
    }

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
    await pushNotificationService.sendToUser({
      userId: ownerId,
      title: data.title,
      body: data.message,
      data: { type, academyId },
    });
  } catch (error) {
    console.error('[ASAAS-WEBHOOK] Error notifying admin:', error);
  }
}

// ============================================
// Parse externalReference -> { academyId, financialId }
// Format: "academyId_financialId"
// ============================================
function parseExternalReference(
  externalReference: string
): { academyId: string; financialId: string } | null {
  if (!externalReference) return null;

  const separatorIndex = externalReference.indexOf('_');
  if (separatorIndex === -1) return null;

  const academyId = externalReference.substring(0, separatorIndex);
  const financialId = externalReference.substring(separatorIndex + 1);

  if (!academyId || !financialId) return null;

  return { academyId, financialId };
}

// ============================================
// Process Payment Events
// ============================================
async function processPaymentEvent(
  event: string,
  payment: AsaasPaymentData,
  academyIdFromQuery?: string
): Promise<NextResponse> {
  const asaasPaymentId = payment.id;

  // Parse externalReference for academyId and financialId
  const parsed = parseExternalReference(payment.externalReference);
  const academyId = parsed?.academyId || academyIdFromQuery;
  const financialId = parsed?.financialId;

  // Convert Reais to centavos for internal storage
  const grossAmountCentavos = fromAsaasAmount(payment.value);
  const netAmountCentavos = fromAsaasAmount(payment.netValue);
  const feeAmountCentavos = grossAmountCentavos - netAmountCentavos;

  console.log(
    `[ASAAS-WEBHOOK] Payment event: ${event}, asaasId: ${asaasPaymentId}, ` +
      `value: ${payment.value}R$ (${grossAmountCentavos}c), ` +
      `net: ${payment.netValue}R$ (${netAmountCentavos}c), ` +
      `fee: ${feeAmountCentavos}c, ` +
      `academyId: ${academyId}, financialId: ${financialId}`
  );

  // Check for duplicate webhook (idempotency)
  if (isWebhookDuplicate(`${event}_${asaasPaymentId}`)) {
    console.log(
      `[ASAAS-WEBHOOK] Duplicate webhook detected for ${event} ${asaasPaymentId}`
    );
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Find the transaction in our database
  const result = await findTransaction(
    asaasPaymentId,
    financialId,
    academyId
  );

  if (!result) {
    console.error(
      `[ASAAS-WEBHOOK] Transaction not found: asaasPaymentId=${asaasPaymentId}, financialId=${financialId}, academyId=${academyId}`
    );
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    );
  }

  const {
    academyId: resolvedAcademyId,
    transaction,
    docRef,
  } = result;

  console.log(
    `[ASAAS-WEBHOOK] Found transaction in academy ${resolvedAcademyId}, ` +
      `financialId: ${transaction.financialId}, status: ${transaction.status}`
  );

  // Process based on event type
  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      await handlePaymentConfirmed(
        resolvedAcademyId,
        transaction,
        docRef,
        grossAmountCentavos,
        feeAmountCentavos
      );
      console.log(
        `[ASAAS-WEBHOOK] Payment confirmed for ${asaasPaymentId}`
      );
      break;

    case 'PAYMENT_OVERDUE':
      await handlePaymentExpired(resolvedAcademyId, transaction, docRef);
      console.log(
        `[ASAAS-WEBHOOK] Payment expired for ${asaasPaymentId}`
      );
      break;

    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      await handlePaymentCancelled(resolvedAcademyId, transaction, docRef);
      console.log(
        `[ASAAS-WEBHOOK] Payment cancelled for ${asaasPaymentId}`
      );
      break;

    default:
      console.log(`[ASAAS-WEBHOOK] Unhandled payment event: ${event}`);
  }

  return NextResponse.json({ received: true });
}

// ============================================
// Process Transfer Events
// ============================================
async function processTransferEvent(
  event: string,
  transfer: AsaasTransferData
): Promise<NextResponse> {
  const asaasTransferId = transfer.id;

  console.log(
    `[ASAAS-WEBHOOK] Transfer event: ${event}, transferId: ${asaasTransferId}, ` +
      `value: ${transfer.value}R$, status: ${transfer.status}`
  );

  // Check for duplicate webhook (idempotency)
  if (isWebhookDuplicate(`${event}_${asaasTransferId}`)) {
    console.log(
      `[ASAAS-WEBHOOK] Duplicate webhook detected for ${event} ${asaasTransferId}`
    );
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Find the withdrawal transaction
  const result = await findWithdrawTransaction(asaasTransferId);

  if (!result) {
    console.error(
      `[ASAAS-WEBHOOK] Withdraw transaction not found: transferId=${asaasTransferId}`
    );
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    );
  }

  const { academyId, transaction, docRef } = result;

  // Validate it's actually a withdrawal
  if (transaction.type !== 'withdrawal') {
    console.error(
      `[ASAAS-WEBHOOK] Transaction ${asaasTransferId} is not a withdrawal, type: ${transaction.type}`
    );
    return NextResponse.json(
      { error: 'Transaction type mismatch' },
      { status: 400 }
    );
  }

  // Process event
  if (event === 'TRANSFER_CONFIRMED' || event === 'TRANSFER_DONE') {
    await handleWithdrawDone(academyId, transaction, docRef);
    console.log(
      `[ASAAS-WEBHOOK] Withdraw completed for transfer ${asaasTransferId}`
    );
  } else if (event === 'TRANSFER_FAILED') {
    await handleWithdrawFailed(academyId, transaction, docRef);
    console.log(
      `[ASAAS-WEBHOOK] Withdraw failed for transfer ${asaasTransferId}`
    );
  }

  return NextResponse.json({ received: true });
}

// ============================================
// POST Handler
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Authenticate webhook request
    if (!validateWebhookToken(request)) {
      console.error(
        '[ASAAS-WEBHOOK] Invalid or missing asaas-access-token header'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get academyId from query param (optional, externalReference is primary)
    const academyIdFromQuery =
      request.nextUrl.searchParams.get('academyId') || undefined;

    // Parse payload
    const rawBody = await request.text();
    let payload: AsaasWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('[ASAAS-WEBHOOK] Invalid JSON in webhook payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { event, payment, transfer } = payload;

    console.log(
      `[ASAAS-WEBHOOK] Received event: ${event}, academyId (query): ${academyIdFromQuery}`
    );

    // Route to the correct handler based on event type
    // Payment events
    if (
      [
        'PAYMENT_RECEIVED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'PAYMENT_REFUNDED',
      ].includes(event)
    ) {
      if (!payment) {
        console.error(
          '[ASAAS-WEBHOOK] Missing payment data for payment event:',
          event
        );
        return NextResponse.json(
          { error: 'Invalid payload: missing payment data' },
          { status: 400 }
        );
      }
      return await processPaymentEvent(event, payment, academyIdFromQuery);
    }

    // Transfer events
    if (['TRANSFER_CONFIRMED', 'TRANSFER_DONE', 'TRANSFER_FAILED'].includes(event)) {
      if (!transfer) {
        console.error(
          '[ASAAS-WEBHOOK] Missing transfer data for transfer event:',
          event
        );
        return NextResponse.json(
          { error: 'Invalid payload: missing transfer data' },
          { status: 400 }
        );
      }
      return await processTransferEvent(event, transfer);
    }

    // Unhandled event type - acknowledge it
    console.log(`[ASAAS-WEBHOOK] Unhandled event type: ${event}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[ASAAS-WEBHOOK] Webhook processing error:', error);
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
    provider: 'asaas',
    timestamp: new Date().toISOString(),
  });
}
