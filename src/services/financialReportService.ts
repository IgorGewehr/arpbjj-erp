import { api } from '@/lib/api/client';
import { Financial, Plan, MonthlyReport, RevenueProjection, RevenueByPlan, FinancialRecommendation } from '@/types';
import { subMonths, addMonths, format } from 'date-fns';

// ============================================
// API response shapes from the Go backend
// ============================================

interface ApiFinancial {
  id: string;
  student_id: string;
  type: string;
  description?: string;
  amount: string;        // decimal string e.g. "150.00"
  due_date: string;      // "YYYY-MM-DD"
  status: string;
  payment_date?: string; // ISO 8601 or null
  method?: string;
  reference_month?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
  created_by_uid?: string;
}

interface ApiPlan {
  id: string;
  name: string;
  description?: string;
  monthly_value: string; // decimal string
  default_due_day: number;
  classes_per_week: number;
  student_ids?: string[];
  custom_values?: Record<string, string>;
  custom_due_days?: Record<string, number>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Mappers: Go API → local types
// ============================================

const apiFinancialToLocal = (f: ApiFinancial): Financial => ({
  id: f.id,
  studentId: f.student_id,
  studentName: undefined,
  type: f.type as Financial['type'],
  description: f.description,
  amount: parseFloat(f.amount),
  dueDate: new Date(f.due_date),
  status: f.status as Financial['status'],
  paymentDate: f.payment_date ? new Date(f.payment_date) : undefined,
  method: f.method as Financial['method'],
  referenceMonth: f.reference_month,
  // plan_id is not included in the Go financial DTO — tracked via plan.student_ids
  planId: undefined,
  receiptUrl: f.receipt_url,
  createdAt: new Date(f.created_at),
  updatedAt: new Date(f.updated_at),
  createdBy: f.created_by_uid ?? '',
});

const apiPlanToLocal = (p: ApiPlan): Plan => ({
  id: p.id,
  name: p.name,
  description: p.description,
  monthlyValue: parseFloat(p.monthly_value),
  defaultDueDay: p.default_due_day,
  classesPerWeek: p.classes_per_week,
  studentIds: p.student_ids ?? [],
  customValues: p.custom_values
    ? Object.fromEntries(Object.entries(p.custom_values).map(([k, v]) => [k, parseFloat(v)]))
    : {},
  customDueDays: p.custom_due_days ?? {},
  isActive: p.is_active,
  createdAt: new Date(p.created_at),
  updatedAt: new Date(p.updated_at),
});

// ============================================
// Helper: Fetch all pages from a paginated Go endpoint
// ============================================

interface PagedResponse<T> {
  items: T[];
  has_more: boolean;
  next_cursor?: string;
}

async function fetchAllPages<T>(
  firstPagePath: string,
  buildNextPath: (cursor: string) => string,
): Promise<T[]> {
  const all: T[] = [];
  let path: string | null = firstPagePath;
  while (path !== null) {
    // eslint-disable-next-line no-await-in-loop
    const page = (await api.get(path)) as PagedResponse<T>;
    all.push(...page.items);
    path = page.has_more && page.next_cursor ? buildNextPath(page.next_cursor) : null;
  }
  return all;
}

// ============================================
// Helper: Derive effective month from a Financial
// Uses referenceMonth if present, otherwise derives from dueDate
// ============================================
const getEffectiveMonth = (f: Financial): string => {
  if (f.referenceMonth) return f.referenceMonth;
  return format(f.dueDate, 'yyyy-MM');
};

// ============================================
// Financial Report Service (Multi-Tenant)
// ============================================
export class FinancialReportService {
  private academyId: string;

  // Cached data (populated by loadAll, cleared after use)
  private cachedFinancials: Financial[] | null = null;
  private cachedFinancialsByMonth: Map<string, Financial[]> | null = null;
  private cachedPlans: Plan[] | null = null;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  // ============================================
  // Load all data once (call before batch operations)
  // Replaces Firestore getDocs with Go API calls.
  // ============================================
  async loadAll(): Promise<void> {
    const basePath = `/v1/academies/${this.academyId}`;

    const [financialsRaw, plansRaw] = await Promise.all([
      // Fetch all financial pages (max 100 per page from Go backend)
      fetchAllPages<ApiFinancial>(
        `${basePath}/financials?limit=100`,
        (cursor) => `${basePath}/financials?limit=100&cursor=${encodeURIComponent(cursor)}`,
      ),
      // Plans list is typically small, no pagination expected
      api.get<{ items: ApiPlan[] }>(`${basePath}/plans`).then((r) => r.items),
    ]);

    this.cachedFinancials = financialsRaw.map(apiFinancialToLocal);
    this.cachedPlans = plansRaw.map(apiPlanToLocal);

    // Group financials by effective month (excluding cancelled)
    this.cachedFinancialsByMonth = new Map();
    for (const f of this.cachedFinancials) {
      if (f.status === 'cancelled') continue;
      const month = getEffectiveMonth(f);
      const list = this.cachedFinancialsByMonth.get(month) || [];
      list.push(f);
      this.cachedFinancialsByMonth.set(month, list);
    }
  }

  // ============================================
  // Helper: Get financials for a given month (from cache)
  // ============================================
  private getFinancialsForMonth(month: string): Financial[] {
    if (!this.cachedFinancialsByMonth) return [];
    return this.cachedFinancialsByMonth.get(month) || [];
  }

  // ============================================
  // Helper: Get all plans (from cache)
  // ============================================
  private getAllPlans(): Plan[] {
    return this.cachedPlans || [];
  }

  // ============================================
  // 1. Generate Monthly Report
  // ============================================
  generateMonthlyReport(month: string, prevMonth?: string): MonthlyReport {
    const financials = this.getFinancialsForMonth(month);

    let confirmedRevenue = 0;
    let pendingRevenue = 0;
    let overdueRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    financials.forEach((f) => {
      switch (f.status) {
        case 'paid':
          confirmedRevenue += f.amount;
          paidCount++;
          break;
        case 'pending':
          pendingRevenue += f.amount;
          pendingCount++;
          break;
        case 'overdue':
          overdueRevenue += f.amount;
          overdueCount++;
          break;
      }
    });

    const totalExpected = confirmedRevenue + pendingRevenue + overdueRevenue;
    const collectionRate = totalExpected > 0 ? (confirmedRevenue / totalExpected) * 100 : 0;

    // Calculate growth MoM by comparing with previous month
    const prevMonthStr = prevMonth || (() => {
      const [year, monthNum] = month.split('-').map(Number);
      const prevDate = subMonths(new Date(year, monthNum - 1, 1), 1);
      return format(prevDate, 'yyyy-MM');
    })();
    const prevFinancials = this.getFinancialsForMonth(prevMonthStr);

    let prevConfirmedRevenue = 0;
    prevFinancials.forEach((f) => {
      if (f.status === 'paid') {
        prevConfirmedRevenue += f.amount;
      }
    });

    const growthMoM = prevConfirmedRevenue > 0
      ? ((confirmedRevenue - prevConfirmedRevenue) / prevConfirmedRevenue) * 100
      : 0;

    return {
      month,
      confirmedRevenue,
      pendingRevenue,
      overdueRevenue,
      totalExpected,
      collectionRate,
      growthMoM,
      totalPayments: financials.length,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }

  // ============================================
  // 2. Get Historical Data
  // ============================================
  getHistoricalData(months: number = 6): MonthlyReport[] {
    const now = new Date();
    const reports: MonthlyReport[] = [];

    let prevMonth: string | undefined;
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const month = format(date, 'yyyy-MM');
      const report = this.generateMonthlyReport(month, prevMonth);
      reports.push(report);
      prevMonth = month;
    }

    return reports;
  }

  // ============================================
  // 3. Project Revenue
  // ============================================
  projectRevenue(monthsAhead: number = 3): RevenueProjection[] {
    const historicalData = this.getHistoricalData(6);
    const revenues = historicalData.map((r) => r.confirmedRevenue);

    // Calculate simple moving average
    const sum = revenues.reduce((acc, v) => acc + v, 0);
    const movingAverage = revenues.length > 0 ? sum / revenues.length : 0;

    // Calculate trend using linear regression (least squares)
    const n = revenues.length;
    let trend = 0;

    if (n > 1) {
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += revenues[i];
        sumXY += i * revenues[i];
        sumX2 += i * i;
      }

      const denominator = n * sumX2 - sumX * sumX;
      if (denominator !== 0) {
        trend = (n * sumXY - sumX * sumY) / denominator;
      }
    }

    // Calculate standard deviation for confidence
    const mean = movingAverage;
    const variance = revenues.length > 0
      ? revenues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / revenues.length
      : 0;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

    let confidence: 'high' | 'medium' | 'low';
    if (coefficientOfVariation < 0.1) {
      confidence = 'high';
    } else if (coefficientOfVariation < 0.25) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const projections: RevenueProjection[] = [];
    const now = new Date();

    for (let i = 1; i <= monthsAhead; i++) {
      const futureDate = addMonths(now, i);
      const monthStr = format(futureDate, 'yyyy-MM');
      const projected = Math.max(0, movingAverage + trend * (n + i - 1));

      projections.push({
        month: monthStr,
        projected: Math.round(projected * 100) / 100,
        confidence,
        basis: `Media movel de ${n} meses com tendencia linear`,
      });
    }

    return projections;
  }

  // ============================================
  // 4. Get Revenue By Plan
  // Note: the Go backend does not include plan_id on financial records.
  // Revenue is attributed to plans by matching plan.student_ids against
  // financial.student_id for the given month.
  // ============================================
  getRevenueByPlan(month: string): RevenueByPlan[] {
    const financials = this.getFinancialsForMonth(month);
    const plans = this.getAllPlans();

    // Build a studentId → planId lookup from plan.student_ids
    const studentToPlan = new Map<string, string>();
    for (const plan of plans) {
      for (const sid of plan.studentIds) {
        studentToPlan.set(sid, plan.id);
      }
    }

    const planMap = new Map<string, Plan>();
    plans.forEach((p) => planMap.set(p.id, p));

    // Group by resolved planId
    const groupedByPlan = new Map<string, { totalRevenue: number; studentIds: Set<string> }>();

    financials.forEach((f) => {
      const key = studentToPlan.get(f.studentId) ?? '__no_plan__';
      const existing = groupedByPlan.get(key) || { totalRevenue: 0, studentIds: new Set<string>() };
      existing.totalRevenue += f.amount;
      existing.studentIds.add(f.studentId);
      groupedByPlan.set(key, existing);
    });

    const totalRevenue = Array.from(groupedByPlan.values()).reduce((acc, v) => acc + v.totalRevenue, 0);

    const result: RevenueByPlan[] = [];

    groupedByPlan.forEach((value, key) => {
      const plan = key !== '__no_plan__' ? planMap.get(key) : null;
      result.push({
        planId: key,
        planName: plan ? plan.name : 'Sem plano',
        studentCount: value.studentIds.size,
        totalRevenue: value.totalRevenue,
        percentage: totalRevenue > 0 ? (value.totalRevenue / totalRevenue) * 100 : 0,
      });
    });

    // Sort by revenue descending
    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  // ============================================
  // 5. Get Collection Rate
  // ============================================
  getCollectionRate(month: string): number {
    const financials = this.getFinancialsForMonth(month);

    let paidAmount = 0;
    let totalAmount = 0;

    financials.forEach((f) => {
      if (f.status === 'paid' || f.status === 'pending' || f.status === 'overdue') {
        totalAmount += f.amount;
        if (f.status === 'paid') {
          paidAmount += f.amount;
        }
      }
    });

    return totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  }

  // ============================================
  // 6. Generate Recommendations
  // ============================================
  generateRecommendations(
    report: MonthlyReport,
    historicalData: MonthlyReport[]
  ): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    // Low collection rate
    if (report.collectionRate < 70) {
      recommendations.push({
        type: 'warning',
        title: 'Taxa de cobranca baixa',
        description: `A taxa de cobranca este mes esta em ${report.collectionRate.toFixed(1)}%. Considere revisar os processos de cobranca e comunicacao com os alunos inadimplentes.`,
        metric: `${report.collectionRate.toFixed(1)}%`,
      });
    }

    // Revenue decline
    if (report.growthMoM < -10) {
      recommendations.push({
        type: 'warning',
        title: 'Queda na receita',
        description: `A receita caiu ${Math.abs(report.growthMoM).toFixed(1)}% em relacao ao mes anterior. Verifique se houve cancelamentos ou aumento de inadimplencia.`,
        metric: `${report.growthMoM.toFixed(1)}%`,
      });
    }

    // Revenue growth
    if (report.growthMoM > 10) {
      recommendations.push({
        type: 'success',
        title: 'Crescimento na receita',
        description: `A receita cresceu ${report.growthMoM.toFixed(1)}% em relacao ao mes anterior. Continue com as estrategias atuais!`,
        metric: `+${report.growthMoM.toFixed(1)}%`,
      });
    }

    // High overdue
    if (report.overdueRevenue > report.confirmedRevenue * 0.3) {
      recommendations.push({
        type: 'error',
        title: 'Alto volume de inadimplencia',
        description: `O valor vencido (${report.overdueRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) representa mais de 30% da receita confirmada. Priorize a recuperacao desses valores.`,
        metric: report.overdueRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      });
    }

    // Collection rate improving month-over-month
    if (historicalData.length >= 2) {
      const lastTwo = historicalData.slice(-2);
      if (lastTwo[1].collectionRate > lastTwo[0].collectionRate && lastTwo[1].collectionRate >= 70) {
        recommendations.push({
          type: 'success',
          title: 'Taxa de cobranca melhorando',
          description: `A taxa de cobranca melhorou de ${lastTwo[0].collectionRate.toFixed(1)}% para ${lastTwo[1].collectionRate.toFixed(1)}%. O trabalho de cobranca esta dando resultado!`,
          metric: `${lastTwo[1].collectionRate.toFixed(1)}%`,
        });
      }
    }

    // Average ticket info
    const averageTicket = report.paidCount > 0
      ? report.confirmedRevenue / report.paidCount
      : 0;

    recommendations.push({
      type: 'info',
      title: 'Ticket medio',
      description: `O ticket medio dos pagamentos confirmados este mes e de ${averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Acompanhe essa metrica para avaliar o valor percebido dos planos.`,
      metric: averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    });

    return recommendations;
  }

  // ============================================
  // 7. Export CSV
  // ============================================
  exportCSV(reports: MonthlyReport[]): string {
    const headers = [
      'Mes',
      'Receita Confirmada',
      'Receita Pendente',
      'Receita Vencida',
      'Total Esperado',
      'Taxa Cobranca',
      'Crescimento MoM',
    ];

    const rows = reports.map((r) => [
      r.month,
      r.confirmedRevenue.toFixed(2),
      r.pendingRevenue.toFixed(2),
      r.overdueRevenue.toFixed(2),
      r.totalExpected.toFixed(2),
      r.collectionRate.toFixed(1),
      r.growthMoM.toFixed(1),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }
}

// ============================================
// Factory Function
// ============================================
export function createFinancialReportService(academyId: string): FinancialReportService {
  return new FinancialReportService(academyId);
}
