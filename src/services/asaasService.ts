import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, collections } from '@/lib/firebase';
import {
  WalletTransaction,
  AcademyWallet,
  TransactionType,
  TransactionStatus,
  FinancialPaymentLink,
} from '@/types';

// ============================================
// Asaas Service Class (Per-Academy Sub-Account)
// ============================================
// Unlike AbacatePay (global API key from env), Asaas uses
// per-academy sub-accounts with encrypted API keys stored
// in Firestore. This client-side service is read-only:
// wallet data and payment status checks only.
// Payment creation goes through API routes.
// ============================================
class AsaasService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get walletTransactionsRef() {
    return collections.walletTransactions(this.academyId);
  }

  private get walletRef() {
    return collections.wallet(this.academyId);
  }

  // ============================================
  // Check if Asaas is Enabled
  // ============================================
  async isEnabled(): Promise<boolean> {
    const academyRef = doc(db, 'academies', this.academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return false;
    }

    return academySnap.data().asaasEnabled === true;
  }

  // ============================================
  // Get Wallet
  // ============================================
  async getWallet(): Promise<AcademyWallet | null> {
    const walletSnap = await getDoc(this.walletRef);

    if (!walletSnap.exists()) {
      // Return empty wallet
      return {
        academyId: this.academyId,
        availableBalance: 0,
        pendingBalance: 0,
        totalReceived: 0,
        totalWithdrawn: 0,
        transactionCount: 0,
        updatedAt: new Date(),
      };
    }

    const data = walletSnap.data();
    return {
      academyId: this.academyId,
      availableBalance: data.availableBalance || 0,
      pendingBalance: data.pendingBalance || 0,
      totalReceived: data.totalReceived || 0,
      totalWithdrawn: data.totalWithdrawn || 0,
      transactionCount: data.transactionCount || 0,
      lastTransactionAt: data.lastTransactionAt?.toDate(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  // ============================================
  // Get Transactions
  // ============================================
  async getTransactions(limitCount = 50): Promise<WalletTransaction[]> {
    const q = query(
      this.walletTransactionsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          academyId: data.academyId,
          type: data.type as TransactionType,
          amount: data.amount,
          status: data.status as TransactionStatus,
          financialId: data.financialId,
          studentId: data.studentId,
          studentName: data.studentName,
          abacatePayTransactionId: data.abacatePayTransactionId,
          asaasPaymentId: data.asaasPaymentId,
          pixCode: data.pixCode,
          qrCodeUrl: data.qrCodeUrl,
          withdrawalPixKey: data.withdrawalPixKey,
          withdrawalPixKeyType: data.withdrawalPixKeyType,
          description: data.description,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        };
      })
      .filter((t) => t.status !== 'pending' || t.type === 'withdrawal');
  }

  // ============================================
  // Get Payment Status
  // ============================================
  async getPaymentStatus(financialId: string): Promise<{
    status: TransactionStatus;
    paymentLink?: FinancialPaymentLink;
  } | null> {
    const q = query(
      this.walletTransactionsRef,
      where('financialId', '==', financialId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();

    return {
      status: data.status as TransactionStatus,
      paymentLink: data.pixCode ? {
        pixCode: data.pixCode,
        qrCodeUrl: data.qrCodeUrl,
        expiresAt: data.expiresAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } : undefined,
    };
  }
}

// ============================================
// Factory Function
// ============================================
export function createAsaasService(academyId: string): AsaasService {
  return new AsaasService(academyId);
}

export default AsaasService;
