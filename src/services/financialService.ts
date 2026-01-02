import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Financial, FinancialFilters, PaymentMethod } from '@/types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const COLLECTION = 'financials';

// ============================================
// Helper: Convert Firestore document to Financial
// ============================================
const docToFinancial = (doc: DocumentSnapshot): Financial => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    type: data.type,
    description: data.description,
    amount: data.amount,
    dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate),
    status: data.status,
    paymentDate: data.paymentDate instanceof Timestamp ? data.paymentDate.toDate() : data.paymentDate ? new Date(data.paymentDate) : undefined,
    method: data.method,
    referenceMonth: data.referenceMonth,
    receiptUrl: data.receiptUrl,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Financial Service
// ============================================
export const financialService = {
  // ============================================
  // Get All Financials with Filters
  // ============================================
  async list(filters: FinancialFilters = {}): Promise<Financial[]> {
    // Fetch all and filter/sort client-side to avoid index issues
    const snapshot = await getDocs(collection(db, COLLECTION));
    let results = snapshot.docs.map(docToFinancial);

    // Apply filters in memory
    if (filters.studentId) {
      results = results.filter((f) => f.studentId === filters.studentId);
    }
    if (filters.status) {
      results = results.filter((f) => f.status === filters.status);
    }
    if (filters.type) {
      results = results.filter((f) => f.type === filters.type);
    }
    if (filters.month) {
      results = results.filter((f) => f.referenceMonth === filters.month);
    }

    // Sort by dueDate desc client-side
    return results.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  },

  // ============================================
  // Get Financial by ID
  // ============================================
  async getById(id: string): Promise<Financial | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToFinancial(docSnap);
  },

  // ============================================
  // Get Financials by Student
  // ============================================
  async getByStudent(studentId: string): Promise<Financial[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const financials = snapshot.docs.map(docToFinancial);
    // Sort by dueDate desc client-side
    return financials.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  },

  // ============================================
  // Get Pending Payments
  // ============================================
  async getPending(): Promise<Financial[]> {
    // Fetch all and filter/sort client-side to avoid composite index
    const snapshot = await getDocs(collection(db, COLLECTION));
    const financials = snapshot.docs.map(docToFinancial);
    return financials
      .filter((f) => f.status === 'pending')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  },

  // ============================================
  // Get Overdue Payments
  // ============================================
  async getOverdue(): Promise<Financial[]> {
    // Fetch all and filter/sort client-side to avoid composite index
    const snapshot = await getDocs(collection(db, COLLECTION));
    const financials = snapshot.docs.map(docToFinancial);
    return financials
      .filter((f) => f.status === 'overdue')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  },

  // ============================================
  // Get Paid This Month
  // ============================================
  async getPaidThisMonth(): Promise<Financial[]> {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    // Fetch all and filter client-side to avoid composite index
    const snapshot = await getDocs(collection(db, COLLECTION));
    const financials = snapshot.docs.map(docToFinancial);

    return financials.filter((f) =>
      f.status === 'paid' &&
      f.paymentDate &&
      f.paymentDate.getTime() >= start.getTime() &&
      f.paymentDate.getTime() <= end.getTime()
    );
  },

  // ============================================
  // Get Monthly Summary
  // ============================================
  async getMonthlySummary(month: string): Promise<{
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }> {
    const financials = await this.list({ month });

    const summary = {
      total: financials.length,
      paid: 0,
      pending: 0,
      overdue: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
    };

    financials.forEach((f) => {
      switch (f.status) {
        case 'paid':
          summary.paid++;
          summary.paidAmount += f.amount;
          break;
        case 'pending':
          summary.pending++;
          summary.pendingAmount += f.amount;
          break;
        case 'overdue':
          summary.overdue++;
          summary.overdueAmount += f.amount;
          break;
      }
    });

    return summary;
  },

  // ============================================
  // Create Financial Record
  // ============================================
  async create(
    data: Omit<Financial, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<Financial> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      studentId: data.studentId,
      studentName: data.studentName,
      type: data.type,
      description: data.description,
      amount: data.amount,
      dueDate: Timestamp.fromDate(new Date(data.dueDate)),
      status: data.status,
      createdBy,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Only add optional fields if they have values
    if (data.paymentDate) docData.paymentDate = Timestamp.fromDate(new Date(data.paymentDate));
    if (data.method) docData.method = data.method;
    if (data.referenceMonth) docData.referenceMonth = data.referenceMonth;
    if (data.receiptUrl) docData.receiptUrl = data.receiptUrl;

    const docRef = await addDoc(collection(db, COLLECTION), docData);

    // Return financial directly without re-fetching
    const financial: Financial = {
      id: docRef.id,
      studentId: data.studentId,
      studentName: data.studentName,
      type: data.type,
      description: data.description,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      status: data.status,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      method: data.method,
      referenceMonth: data.referenceMonth,
      receiptUrl: data.receiptUrl,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    return financial;
  },

  // ============================================
  // Generate Monthly Tuitions for All Active Students
  // ============================================
  async generateMonthlyTuitions(
    students: Array<{ id: string; fullName: string; tuitionValue: number; tuitionDay: number }>,
    month: string, // YYYY-MM
    createdBy: string
  ): Promise<Financial[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const results: Financial[] = [];

    for (const student of students) {
      // Check if tuition already exists for this month
      const existing = await this.list({
        studentId: student.id,
        month,
        type: 'monthly_tuition',
      });

      if (existing.length > 0) continue;

      // Calculate due date based on student's tuition day
      const dueDate = new Date(year, monthNum - 1, student.tuitionDay);

      const financial = await this.create(
        {
          studentId: student.id,
          studentName: student.fullName,
          type: 'monthly_tuition',
          description: `Mensalidade ${format(dueDate, 'MM/yyyy')}`,
          amount: student.tuitionValue,
          dueDate,
          status: 'pending',
          referenceMonth: month,
          createdBy,
        },
        createdBy
      );

      results.push(financial);
    }

    return results;
  },

  // ============================================
  // Mark as Paid (Baixa Manual)
  // ============================================
  async markAsPaid(
    id: string,
    method: PaymentMethod,
    paymentDate: Date = new Date()
  ): Promise<Financial> {
    const docRef = doc(db, COLLECTION, id);

    await updateDoc(docRef, {
      status: 'paid',
      method,
      paymentDate: Timestamp.fromDate(paymentDate),
      updatedAt: Timestamp.fromDate(new Date()),
    });

    const updatedDoc = await getDoc(docRef);
    return docToFinancial(updatedDoc);
  },

  // ============================================
  // Mark as Overdue (Batch update for cron job)
  // ============================================
  async markOverduePayments(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all and filter client-side to avoid composite index
    const snapshot = await getDocs(collection(db, COLLECTION));
    const financials = snapshot.docs.map(docToFinancial);

    const overdueFinancials = financials.filter(
      (f) => f.status === 'pending' && f.dueDate.getTime() < today.getTime()
    );

    if (overdueFinancials.length === 0) return 0;

    const batch = writeBatch(db);
    const now = Timestamp.fromDate(new Date());

    overdueFinancials.forEach((f) => {
      const docRef = doc(db, COLLECTION, f.id);
      batch.update(docRef, {
        status: 'overdue',
        updatedAt: now,
      });
    });

    await batch.commit();
    return overdueFinancials.length;
  },

  // ============================================
  // Cancel Payment
  // ============================================
  async cancel(id: string): Promise<Financial> {
    const docRef = doc(db, COLLECTION, id);

    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: Timestamp.fromDate(new Date()),
    });

    const updatedDoc = await getDoc(docRef);
    return docToFinancial(updatedDoc);
  },

  // ============================================
  // Update Financial Record
  // ============================================
  async update(id: string, data: Partial<Financial>): Promise<Financial> {
    const docRef = doc(db, COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Only add fields that are being updated
    if (data.studentName !== undefined) updateData.studentName = data.studentName;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.method !== undefined) updateData.method = data.method;
    if (data.referenceMonth !== undefined) updateData.referenceMonth = data.referenceMonth;
    if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
    if (data.dueDate) {
      updateData.dueDate = Timestamp.fromDate(new Date(data.dueDate));
    }
    if (data.paymentDate) {
      updateData.paymentDate = Timestamp.fromDate(new Date(data.paymentDate));
    }

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToFinancial(updatedDoc);
  },

  // ============================================
  // Delete Financial Record
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Get Revenue Stats
  // ============================================
  async getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    expectedRevenue: number;
    collectionRate: number;
    byMonth: Array<{ month: string; paid: number; expected: number }>;
  }> {
    const q = query(
      collection(db, COLLECTION),
      where('dueDate', '>=', Timestamp.fromDate(startDate)),
      where('dueDate', '<=', Timestamp.fromDate(endDate))
    );

    const snapshot = await getDocs(q);
    const financials = snapshot.docs.map(docToFinancial);

    let totalRevenue = 0;
    let expectedRevenue = 0;
    const monthlyData: Record<string, { paid: number; expected: number }> = {};

    financials.forEach((f) => {
      const monthKey = format(f.dueDate, 'yyyy-MM');

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { paid: 0, expected: 0 };
      }

      monthlyData[monthKey].expected += f.amount;
      expectedRevenue += f.amount;

      if (f.status === 'paid') {
        monthlyData[monthKey].paid += f.amount;
        totalRevenue += f.amount;
      }
    });

    const byMonth = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalRevenue,
      expectedRevenue,
      collectionRate: expectedRevenue > 0 ? (totalRevenue / expectedRevenue) * 100 : 0,
      byMonth,
    };
  },

  // ============================================
  // Get WhatsApp Reminder Link
  // ============================================
  getWhatsAppReminderLink(
    phone: string,
    studentName: string,
    amount: number,
    dueDate: Date
  ): string {
    const formattedPhone = phone.replace(/\D/g, '');
    const formattedDate = format(dueDate, 'dd/MM/yyyy');
    const formattedAmount = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const message = encodeURIComponent(
      `Olá! Este é um lembrete da mensalidade da academia MarcusJJ.\n\n` +
      `Aluno: ${studentName}\n` +
      `Valor: ${formattedAmount}\n` +
      `Vencimento: ${formattedDate}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );

    return `https://wa.me/55${formattedPhone}?text=${message}`;
  },
};

export default financialService;
