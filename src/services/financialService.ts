import { api } from '@/lib/api/client';
import { Financial, FinancialFilters, PaymentMethod } from '@/types';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Go API response shapes (snake_case)
// ============================================
interface GoFinancial {
  id: string;
  academy_id: string;
  student_id: string;
  type: string;
  amount: string;
  due_date: string;
  status: string;
  method?: string;
  reference_month?: string;
  receipt_url?: string;
  payment_date?: string;
  description?: string;
  created_by_uid?: string;
  created_at: string;
  updated_at: string;
}

interface GoFinancialListResponse {
  items: GoFinancial[];
  has_more: boolean;
  next_cursor: string | null;
}

// ============================================
// Helper: Convert Go response to Financial
// ============================================
const goToFinancial = (f: GoFinancial): Financial => {
  return {
    id: f.id,
    studentId: f.student_id,
    // student_name is not in Go response — keep as undefined
    studentName: undefined,
    type: f.type as Financial['type'],
    description: f.description,
    amount: parseFloat(f.amount),
    dueDate: new Date(f.due_date),
    status: f.status as Financial['status'],
    paymentDate: f.payment_date ? new Date(f.payment_date) : undefined,
    method: f.method as Financial['method'],
    referenceMonth: f.reference_month,
    planId: undefined,
    receiptUrl: f.receipt_url,
    createdAt: new Date(f.created_at),
    updatedAt: new Date(f.updated_at),
    createdBy: f.created_by_uid ?? '',
  };
};

// ============================================
// Financial Service (Multi-Tenant)
// ============================================
export class FinancialService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get baseUrl() {
    return `/v1/academies/${this.academyId}/financials`;
  }

  // ============================================
  // Get All Financials with Filters
  // ============================================
  async list(filters: FinancialFilters = {}): Promise<Financial[]> {
    const params = new URLSearchParams({ limit: '500' });
    if (filters.studentId) params.set('student_id', filters.studentId);
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);
    if (filters.month) {
      params.set('due_from', `${filters.month}-01`);
      // Compute last day of that month for due_to
      const [year, month] = filters.month.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      params.set('due_to', `${filters.month}-${String(lastDay).padStart(2, '0')}`);
    }

    const res = await api.get<GoFinancialListResponse>(`${this.baseUrl}?${params}`);
    const results = res.items.map(goToFinancial);

    // Sort by dueDate desc
    return results.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }

  // ============================================
  // Get Financial by ID
  // ============================================
  async getById(id: string): Promise<Financial | null> {
    try {
      const f = await api.get<GoFinancial>(`${this.baseUrl}/${id}`);
      return goToFinancial(f);
    } catch {
      return null;
    }
  }

  // ============================================
  // Get Financials by Student
  // ============================================
  async getByStudent(studentId: string): Promise<Financial[]> {
    const res = await api.get<GoFinancialListResponse>(
      `${this.baseUrl}?student_id=${studentId}&limit=500`
    );
    const financials = res.items.map(goToFinancial);
    return financials.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }

  // ============================================
  // Get Pending Payments
  // ============================================
  async getPending(): Promise<Financial[]> {
    const res = await api.get<GoFinancialListResponse>(`${this.baseUrl}?status=pending&limit=500`);
    const financials = res.items.map(goToFinancial);
    return financials.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  // ============================================
  // Get Overdue Payments
  // ============================================
  async getOverdue(): Promise<Financial[]> {
    const res = await api.get<GoFinancialListResponse>(`${this.baseUrl}?status=overdue&limit=500`);
    const financials = res.items.map(goToFinancial);
    return financials.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  // ============================================
  // Get Paid This Month
  // ============================================
  async getPaidThisMonth(): Promise<Financial[]> {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const params = new URLSearchParams({
      status: 'paid',
      due_from: format(start, 'yyyy-MM-dd'),
      due_to: format(end, 'yyyy-MM-dd'),
      limit: '500',
    });

    const res = await api.get<GoFinancialListResponse>(`${this.baseUrl}?${params}`);
    const financials = res.items.map(goToFinancial);

    return financials.filter(f =>
      f.status === 'paid' &&
      f.paymentDate &&
      f.paymentDate.getTime() >= start.getTime() &&
      f.paymentDate.getTime() <= end.getTime()
    );
  }

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

    financials.forEach(f => {
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
  }

  // ============================================
  // Create Financial Record
  // ============================================
  async create(
    data: Omit<Financial, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<Financial> {
    const body: Record<string, unknown> = {
      student_id: data.studentId,
      type: data.type,
      amount: String(data.amount),
      due_date: format(new Date(data.dueDate), 'yyyy-MM-dd'),
      status: data.status,
    };

    if (data.description) body.description = data.description;
    if (data.referenceMonth) body.reference_month = data.referenceMonth;
    if (data.method) body.method = data.method;
    if (data.receiptUrl) body.receipt_url = data.receiptUrl;
    if (data.paymentDate) body.payment_date = format(new Date(data.paymentDate), 'yyyy-MM-dd');

    const f = await api.post<GoFinancial>(this.baseUrl, body, {
      'Idempotency-Key': crypto.randomUUID(),
    });

    return goToFinancial(f);
  }

  // ============================================
  // Generate Monthly Tuitions for All Active Students
  // ============================================
  async generateMonthlyTuitions(
    students: Array<{ id: string; fullName: string; tuitionValue: number; tuitionDay: number; planId?: string }>,
    month: string, // YYYY-MM
    createdBy: string
  ): Promise<Financial[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const results: Financial[] = [];

    for (const student of students) {
      const existing = await this.list({
        studentId: student.id,
        month,
        type: 'monthly_tuition',
      });

      const activeExisting = existing.filter(p => p.status !== 'cancelled');

      if (student.planId) {
        if (activeExisting.some(p => p.planId === student.planId)) continue;
      } else {
        if (activeExisting.some(p => !p.planId)) continue;
      }

      const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
      const clampedDay = Math.min(student.tuitionDay, lastDayOfMonth);
      const dueDate = new Date(year, monthNum - 1, clampedDay);

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
          planId: student.planId,
          createdBy,
        },
        createdBy
      );

      results.push(financial);
    }

    return results;
  }

  // ============================================
  // Mark as Paid (Baixa Manual)
  // ============================================
  async markAsPaid(
    id: string,
    method: PaymentMethod,
    paymentDate: Date = new Date()
  ): Promise<Financial> {
    const f = await api.patch<GoFinancial>(`${this.baseUrl}/${id}/status`, {
      status: 'paid',
      method,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
    });
    return goToFinancial(f);
  }

  // ============================================
  // Mark as Overdue (client-side batch — Go backend handles this server-side)
  // ============================================
  async markOverduePayments(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const res = await api.get<GoFinancialListResponse>(`${this.baseUrl}?status=pending&limit=500`);
    const financials = res.items.map(goToFinancial);

    const overdueFinancials = financials.filter(
      f => f.status === 'pending' && f.dueDate.getTime() < today.getTime()
    );

    let updated = 0;
    for (const f of overdueFinancials) {
      try {
        await api.patch(`${this.baseUrl}/${f.id}/status`, { status: 'overdue' });
        updated++;
      } catch {
        // continue
      }
    }

    return updated;
  }

  // ============================================
  // Cancel Payment
  // ============================================
  async cancel(id: string): Promise<Financial> {
    const f = await api.patch<GoFinancial>(`${this.baseUrl}/${id}/status`, {
      status: 'cancelled',
    });
    return goToFinancial(f);
  }

  // ============================================
  // Reactivate Cancelled Payment
  // ============================================
  async reactivate(id: string): Promise<Financial> {
    const financial = await this.getById(id);
    if (!financial) throw new Error('Payment not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(financial.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const newStatus = dueDate.getTime() < today.getTime() ? 'overdue' : 'pending';

    const f = await api.patch<GoFinancial>(`${this.baseUrl}/${id}/status`, {
      status: newStatus,
    });
    return goToFinancial(f);
  }

  // ============================================
  // Update Financial Record
  // ============================================
  async update(id: string, data: Partial<Financial>): Promise<Financial> {
    const body: Record<string, unknown> = {};

    if (data.type !== undefined) body.type = data.type;
    if (data.description !== undefined) body.description = data.description;
    if (data.amount !== undefined) body.amount = String(data.amount);
    if (data.status !== undefined) body.status = data.status;
    if (data.method !== undefined) body.method = data.method;
    if (data.referenceMonth !== undefined) body.reference_month = data.referenceMonth;
    if (data.receiptUrl !== undefined) body.receipt_url = data.receiptUrl;
    if (data.dueDate) body.due_date = format(new Date(data.dueDate), 'yyyy-MM-dd');
    if (data.paymentDate) body.payment_date = format(new Date(data.paymentDate), 'yyyy-MM-dd');

    // If only status is being updated, use the status endpoint
    const keys = Object.keys(body);
    if (keys.length === 1 && keys[0] === 'status') {
      const f = await api.patch<GoFinancial>(`${this.baseUrl}/${id}/status`, {
        status: data.status,
        ...(data.method ? { method: data.method } : {}),
        ...(data.paymentDate ? { payment_date: format(new Date(data.paymentDate), 'yyyy-MM-dd') } : {}),
      });
      return goToFinancial(f);
    }

    const f = await api.patch<GoFinancial>(`${this.baseUrl}/${id}`, body);
    return goToFinancial(f);
  }

  // ============================================
  // Delete Financial Record
  // ============================================
  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================
  // Get Revenue Stats
  // ============================================
  async getRevenueStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    expectedRevenue: number;
    collectionRate: number;
    byMonth: Array<{ month: string; paid: number; expected: number }>;
  }> {
    const params = new URLSearchParams({
      due_from: format(startDate, 'yyyy-MM-dd'),
      due_to: format(endDate, 'yyyy-MM-dd'),
      limit: '500',
    });

    const res = await api.get<GoFinancialListResponse>(`${this.baseUrl}?${params}`);
    const financials = res.items.map(goToFinancial);

    let totalRevenue = 0;
    let expectedRevenue = 0;
    const monthlyData: Record<string, { paid: number; expected: number }> = {};

    financials.forEach(f => {
      if (f.status === 'cancelled') return;

      const monthKey = format(f.dueDate, 'yyyy-MM');
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { paid: 0, expected: 0 };

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
  }

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
      `Olá! Este é um lembrete da mensalidade da academia.\n\n` +
      `Aluno: ${studentName}\n` +
      `Valor: ${formattedAmount}\n` +
      `Vencimento: ${formattedDate}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );

    return `https://wa.me/55${formattedPhone}?text=${message}`;
  }
}

// ============================================
// Factory Function
// ============================================
export function createFinancialService(academyId: string): FinancialService {
  return new FinancialService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const financialService = {
  list: (filters: FinancialFilters = {}) => new FinancialService(DEFAULT_ACADEMY_ID).list(filters),
  getById: (id: string) => new FinancialService(DEFAULT_ACADEMY_ID).getById(id),
  getByStudent: (studentId: string) => new FinancialService(DEFAULT_ACADEMY_ID).getByStudent(studentId),
  getPending: () => new FinancialService(DEFAULT_ACADEMY_ID).getPending(),
  getOverdue: () => new FinancialService(DEFAULT_ACADEMY_ID).getOverdue(),
  getPaidThisMonth: () => new FinancialService(DEFAULT_ACADEMY_ID).getPaidThisMonth(),
  getMonthlySummary: (month: string) => new FinancialService(DEFAULT_ACADEMY_ID).getMonthlySummary(month),
  create: (data: Omit<Financial, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string) => new FinancialService(DEFAULT_ACADEMY_ID).create(data, createdBy),
  generateMonthlyTuitions: (students: Array<{ id: string; fullName: string; tuitionValue: number; tuitionDay: number; planId?: string }>, month: string, createdBy: string) => new FinancialService(DEFAULT_ACADEMY_ID).generateMonthlyTuitions(students, month, createdBy),
  markAsPaid: (id: string, method: PaymentMethod, paymentDate: Date = new Date()) => new FinancialService(DEFAULT_ACADEMY_ID).markAsPaid(id, method, paymentDate),
  markOverduePayments: () => new FinancialService(DEFAULT_ACADEMY_ID).markOverduePayments(),
  cancel: (id: string) => new FinancialService(DEFAULT_ACADEMY_ID).cancel(id),
  reactivate: (id: string) => new FinancialService(DEFAULT_ACADEMY_ID).reactivate(id),
  update: (id: string, data: Partial<Financial>) => new FinancialService(DEFAULT_ACADEMY_ID).update(id, data),
  delete: (id: string) => new FinancialService(DEFAULT_ACADEMY_ID).delete(id),
  getRevenueStats: (startDate: Date, endDate: Date) => new FinancialService(DEFAULT_ACADEMY_ID).getRevenueStats(startDate, endDate),
  getWhatsAppReminderLink: (phone: string, studentName: string, amount: number, dueDate: Date) => new FinancialService(DEFAULT_ACADEMY_ID).getWhatsAppReminderLink(phone, studentName, amount, dueDate),
};

export default financialService;
