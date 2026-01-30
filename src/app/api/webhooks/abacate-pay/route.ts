import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { pushNotificationService } from '@/services/server';

// ============================================
// Types - AbacatePay Webhook Payload
// ============================================
interface AbacatePayWebhookPayload {
  event: 'billing.paid' | 'billing.expired' | 'billing.cancelled';
  data: {
    billing: {
      id: string;        // Billing ID (e.g., "bill_EWKETqphHd4RPEyuPrWWetwE")
      amount: number;    // Amount in centavos
      customer: {
        id: string;
        metadata: {
          name: string;
          cellphone: string;
          taxId: string;
          email: string;
          country: string;
          zipCode: string;
        };
      };
      frequency: string;
      kind: string[];
      status: 'PAID' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
      products: Array<{
        id: string;
        externalId: string;
        quantity: number;
      }>;
      paidAmount: number;
      couponsUsed: string[];
    };
    payment: {
      amount: number;    // Amount received
      fee: number;       // AbacatePay fee
      method: 'PIX' | 'CARD';
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
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
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

// ============================================
// Validate Webhook Signature (Timing-Safe)
// ============================================
function validateSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ============================================
// Get Global Webhook Secret (from environment)
// ============================================
function getWebhookSecret(): string | null {
  return process.env.ABACATEPAY_WEBHOOK_SECRET || null;
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
  const { financialId, studentId, studentName } = transaction;

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
    await handleStoreOrderPayment(academyId, orderId, amount, fee, studentName);
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
  studentName?: string
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
    updatedAt: FieldValue.serverTimestamp(),
  });

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
    const transactionId = data.billing.id;
    const amount = data.billing.amount;
    const fee = data.payment?.fee || 0;

    // Extract orderId from products externalId (billing/create) or metadata
    const productExternalId = data.billing.products?.[0]?.externalId;
    const financialIdFromWebhook = productExternalId ? `order_${productExternalId}` : undefined;

    console.log(`[WEBHOOK] Received: ${event} for billing ${transactionId}, amount: ${amount}, externalId: ${productExternalId}`);

    // Skip signature validation in dev mode (AbacatePay sandbox)
    if (!devMode) {
      const webhookSecret = getWebhookSecret();
      const signature = request.headers.get('x-abacatepay-signature');

      if (webhookSecret) {
        if (!signature) {
          console.error('Missing webhook signature');
          return NextResponse.json(
            { error: 'Missing signature' },
            { status: 401 }
          );
        }

        if (!validateSignature(rawBody, signature, webhookSecret)) {
          console.error('Invalid webhook signature');
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }
      } else {
        console.warn('ABACATEPAY_WEBHOOK_SECRET not configured - skipping signature validation');
      }
    } else {
      console.log('Dev mode webhook - signature validation skipped');
    }

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
        if (data.billing.status === 'PAID') {
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
