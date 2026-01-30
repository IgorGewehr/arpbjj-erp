import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
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
// AbacatePay API Types
// ============================================
interface AbacatePayPixResponse {
  id: string;
  brcode: string;
  qrcode: string;
  expiresAt: string;
  status: 'pending' | 'paid' | 'expired';
}

interface AbacatePayWebhookPayload {
  event: 'payment.paid' | 'payment.expired' | 'payment.cancelled';
  data: {
    id: string;
    amount: number;
    paidAt?: string;
  };
}

interface AbacatePayCardResponse {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'error';
  message?: string;
}

interface CardPaymentData {
  cardNumber: string;
  cardHolder: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  cpf: string;
}

interface CardPaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
}

// ============================================
// AbacatePay Service Class (Multi-Tenant)
// ============================================
class AbacatePayService {
  private academyId: string;
  private apiBaseUrl = 'https://api.abacatepay.com/v1';

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
  // Get Global API Key (from environment)
  // ============================================
  private getApiKey(): string | null {
    // API Key is global (single AbacatePay account for all academies)
    // Each academy has its own virtual wallet balance in Firestore
    return process.env.ABACATEPAY_API_KEY || null;
  }

  // ============================================
  // Check if AbacatePay is Enabled
  // ============================================
  async isEnabled(): Promise<boolean> {
    const academyRef = doc(db, 'academies', this.academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return false;
    }

    return academySnap.data().abacatePayEnabled === true;
  }

  // ============================================
  // Create PIX Payment
  // ============================================
  async createPixPayment(
    amount: number,
    description: string,
    financialId: string,
    studentId: string,
    studentName: string
  ): Promise<FinancialPaymentLink | null> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.error('AbacatePay API key not configured');
      return null;
    }

    try {
      // Create payment via AbacatePay API
      const response = await fetch(`${this.apiBaseUrl}/pix/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount, // Amount in cents
          description,
          expiresInMinutes: 60 * 24, // 24 hours
          metadata: {
            academyId: this.academyId,
            financialId,
            studentId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AbacatePay API error:', errorData);
        return null;
      }

      const data: AbacatePayPixResponse = await response.json();

      // Create transaction record
      await addDoc(this.walletTransactionsRef, {
        academyId: this.academyId,
        type: 'payment' as TransactionType,
        amount,
        status: 'pending' as TransactionStatus,
        financialId,
        studentId,
        studentName,
        abacatePayTransactionId: data.id,
        pixCode: data.brcode,
        qrCodeUrl: data.qrcode,
        description,
        createdAt: serverTimestamp(),
      });

      return {
        pixCode: data.brcode,
        qrCodeUrl: data.qrcode,
        expiresAt: new Date(data.expiresAt),
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      return null;
    }
  }

  // ============================================
  // Create Card Payment
  // ============================================
  async createCardPayment(
    amount: number,
    description: string,
    financialId: string,
    studentId: string,
    studentName: string,
    cardData: CardPaymentData
  ): Promise<CardPaymentResult> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.error('AbacatePay API key not configured');
      return { success: false, message: 'API key not configured' };
    }

    try {
      // Create card payment via AbacatePay API
      const response = await fetch(`${this.apiBaseUrl}/card/charge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount, // Amount in cents
          description,
          card: {
            number: cardData.cardNumber.replace(/\s/g, ''),
            holderName: cardData.cardHolder,
            expirationMonth: cardData.expirationMonth,
            expirationYear: cardData.expirationYear,
            cvv: cardData.cvv,
          },
          customer: {
            document: cardData.cpf.replace(/\D/g, ''),
          },
          metadata: {
            academyId: this.academyId,
            financialId,
            studentId,
          },
        }),
      });

      const data: AbacatePayCardResponse = await response.json();

      if (!response.ok || data.status === 'declined' || data.status === 'error') {
        console.error('AbacatePay card payment error:', data);
        return {
          success: false,
          message: data.message || 'Pagamento recusado',
        };
      }

      // Create transaction record
      await addDoc(this.walletTransactionsRef, {
        academyId: this.academyId,
        type: 'payment' as TransactionType,
        amount,
        status: data.status === 'approved' ? 'completed' : 'pending',
        financialId,
        studentId,
        studentName,
        abacatePayTransactionId: data.id,
        paymentMethod: 'card',
        description,
        createdAt: serverTimestamp(),
        completedAt: data.status === 'approved' ? serverTimestamp() : null,
      });

      // If approved, update financial record and wallet
      if (data.status === 'approved') {
        // Update wallet balance
        await this.updateWalletBalance(amount, 'add');

        // Update financial record if it's a mensalidade
        if (financialId && !financialId.startsWith('order_')) {
          const financialRef = collections.financial(this.academyId, financialId);
          await updateDoc(financialRef, {
            status: 'paid',
            paymentDate: serverTimestamp(),
            method: 'card',
            paidViaAbacatePay: true,
            abacatePayTransactionId: data.id,
            updatedAt: serverTimestamp(),
          });
        }
      }

      return {
        success: data.status === 'approved',
        transactionId: data.id,
        message: data.status === 'approved' ? 'Pagamento aprovado!' : 'Aguardando confirmação',
      };
    } catch (error) {
      console.error('Error creating card payment:', error);
      return { success: false, message: 'Erro ao processar pagamento' };
    }
  }

  // ============================================
  // Handle Payment Webhook
  // ============================================
  async handleWebhook(payload: AbacatePayWebhookPayload): Promise<void> {
    const { event, data } = payload;

    // Find transaction by AbacatePay ID
    const transactionsQuery = query(
      this.walletTransactionsRef,
      where('abacatePayTransactionId', '==', data.id)
    );
    const snapshot = await getDocs(transactionsQuery);

    if (snapshot.empty) {
      console.error('Transaction not found for AbacatePay ID:', data.id);
      return;
    }

    const transactionDoc = snapshot.docs[0];
    const transaction = transactionDoc.data();

    switch (event) {
      case 'payment.paid':
        // Update transaction status
        await updateDoc(transactionDoc.ref, {
          status: 'completed',
          completedAt: serverTimestamp(),
        });

        // Update wallet balance
        await this.updateWalletBalance(data.amount, 'add');

        // Update financial record
        if (transaction.financialId) {
          const financialRef = collections.financial(this.academyId, transaction.financialId);
          await updateDoc(financialRef, {
            status: 'paid',
            paymentDate: serverTimestamp(),
            method: 'pix',
            paidViaAbacatePay: true,
            abacatePayTransactionId: data.id,
            updatedAt: serverTimestamp(),
          });
        }
        break;

      case 'payment.expired':
      case 'payment.cancelled':
        await updateDoc(transactionDoc.ref, {
          status: 'cancelled',
        });
        break;
    }
  }

  // ============================================
  // Update Wallet Balance
  // ============================================
  private async updateWalletBalance(
    amount: number,
    operation: 'add' | 'subtract'
  ): Promise<void> {
    const walletSnap = await getDoc(this.walletRef);

    if (!walletSnap.exists()) {
      // Create wallet document if it doesn't exist
      await setDoc(this.walletRef, {
        academyId: this.academyId,
        availableBalance: operation === 'add' ? amount : 0,
        pendingBalance: 0,
        totalReceived: operation === 'add' ? amount : 0,
        totalWithdrawn: 0,
        transactionCount: 1,
        lastTransactionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const incrementAmount = operation === 'add' ? amount : -amount;
      await updateDoc(this.walletRef, {
        availableBalance: increment(incrementAmount),
        totalReceived: operation === 'add' ? increment(amount) : undefined,
        totalWithdrawn: operation === 'subtract' ? increment(amount) : undefined,
        transactionCount: increment(1),
        lastTransactionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
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
          pixCode: data.pixCode,
          qrCodeUrl: data.qrCodeUrl,
          withdrawalPixKey: data.withdrawalPixKey,
          withdrawalPixKeyType: data.withdrawalPixKeyType,
          description: data.description,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        };
      })
      .filter((t) => t.status !== 'pending');
  }

  // ============================================
  // Request Withdrawal
  // ============================================
  async requestWithdrawal(
    amount: number,
    pixKey: string,
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
  ): Promise<WalletTransaction | null> {
    const wallet = await this.getWallet();

    if (!wallet || wallet.availableBalance < amount) {
      console.error('Insufficient balance for withdrawal');
      return null;
    }

    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.error('AbacatePay API key not configured');
      return null;
    }

    try {
      // Create withdrawal via AbacatePay API
      const response = await fetch(`${this.apiBaseUrl}/pix/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          pixKey,
          pixKeyType,
          metadata: {
            academyId: this.academyId,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AbacatePay withdrawal error:', errorData);
        return null;
      }

      const data = await response.json();

      // Update wallet balance
      await this.updateWalletBalance(amount, 'subtract');

      // Create transaction record
      const transactionRef = await addDoc(this.walletTransactionsRef, {
        academyId: this.academyId,
        type: 'withdrawal' as TransactionType,
        amount,
        status: 'pending' as TransactionStatus,
        abacatePayTransactionId: data.id,
        withdrawalPixKey: pixKey,
        withdrawalPixKeyType: pixKeyType,
        description: `Saque via PIX`,
        createdAt: serverTimestamp(),
      });

      const transactionSnap = await getDoc(transactionRef);
      const transactionData = transactionSnap.data()!;

      return {
        id: transactionRef.id,
        academyId: this.academyId,
        type: 'withdrawal',
        amount,
        status: 'pending',
        abacatePayTransactionId: data.id,
        withdrawalPixKey: pixKey,
        withdrawalPixKeyType: pixKeyType,
        description: `Saque via PIX`,
        createdAt: transactionData.createdAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      return null;
    }
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
export function createAbacatePayService(academyId: string): AbacatePayService {
  return new AbacatePayService(academyId);
}

export default AbacatePayService;
