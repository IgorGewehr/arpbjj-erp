import {
  getDocs,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import { Financial, Plan, MonthlyReport, RevenueProjection, RevenueByPlan, FinancialRecommendation } from '@/types';
import { subMonths, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    planId: data.planId,
    receiptUrl: data.receiptUrl,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Helper: Convert Firestore document to Plan
// ============================================
const docToPlan = (doc: DocumentSnapshot): Plan => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    monthlyValue: data.monthlyValue,
    defaultDueDay: data.defaultDueDay || 10,
    classesPerWeek: data.classesPerWeek,
    studentIds: data.studentIds || [],
    customValues: data.customValues ?? {},
    customDueDays: data.customDueDays ?? {},
    isActive: data.isActive,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
  };
};

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
  private financialsRef: CollectionReference;
  private plansRef: CollectionReference;

  // Cached data (populated by loadAll, cleared after use)
  private cachedFinancials: Financial[] | null = null;
  private cachedFinancialsByMonth: Map<string, Financial[]> | null = null;
  private cachedPlans: Plan[] | null = null;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.financialsRef = collections.financials(academyId);
    this.plansRef = collections.plans(academyId);
  }

  // ============================================
  // Load all data once (call before batch operations)
  // ============================================
  async loadAll(): Promise<void> {
    const [financialsSnap, plansSnap] = await Promise.all([
      getDocs(this.financialsRef),
      getDocs(this.plansRef),
    ]);

    this.cachedFinancials = financialsSnap.docs.map(docToFinancial);
    this.cachedPlans = plansSnap.docs.map(docToPlan);

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
  // ============================================
  getRevenueByPlan(month: string): RevenueByPlan[] {
    const financials = this.getFinancialsForMonth(month);
    const plans = this.getAllPlans();

    const planMap = new Map<string, Plan>();
    plans.forEach((p) => planMap.set(p.id, p));

    // Group by planId
    const groupedByPlan = new Map<string, { totalRevenue: number; studentIds: Set<string> }>();

    financials.forEach((f) => {
      const key = f.planId || '__no_plan__';
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
