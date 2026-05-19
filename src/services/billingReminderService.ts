import { api, BillingStageEntry, BillingStagesResult } from '@/lib/api/client';
import {
  Financial,
  BillingStage,
  BillingContactLog,
  ContactType,
  CollectionStats,
  BillingReminderSettings,
  StudentContact,
} from '@/types';

// ============================================
// Helper: calculate days overdue
// ============================================
const calculateDaysOverdue = (dueDate: Date): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================
// Helper: classify stage from days overdue
// ============================================
const classifyStage = (daysOverdue: number): BillingStage | null => {
  if (daysOverdue >= 30) return 'D+30';
  if (daysOverdue >= 15) return 'D+15';
  if (daysOverdue >= 7) return 'D+7';
  if (daysOverdue >= 3) return 'D+3';
  if (daysOverdue >= 1) return 'D+1';
  if (daysOverdue === 0) return 'D+0';
  return null;
};

// ============================================
// Helper: map Go stage key (D0, D1, …) to BillingStage (D+0, D+1, …)
// ============================================
const mapGoStageKey = (key: string): BillingStage => {
  const map: Record<string, BillingStage> = {
    D0: 'D+0',
    D1: 'D+1',
    D3: 'D+3',
    D7: 'D+7',
    D15: 'D+15',
    'D30+': 'D+30',
    D30: 'D+30',
  };
  return map[key] ?? ('D+0' as BillingStage);
};

// ============================================
// Helper: map BillingStageEntry to Financial
// ============================================
const mapStageEntryToFinancial = (entry: BillingStageEntry): Financial => ({
  id: entry.id,
  studentId: entry.student_id,
  studentName: entry.student_name,
  type: 'monthly_tuition',
  description: entry.description,
  amount: typeof entry.amount === 'string' ? parseFloat(entry.amount) : entry.amount,
  dueDate: new Date(entry.due_date),
  status: (entry.status as Financial['status']) || 'overdue',
  referenceMonth: entry.reference_month,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '',
});

// ============================================
// Default Billing Reminder Settings
// ============================================
const DEFAULT_SETTINGS: BillingReminderSettings = {
  enabled: true,
  stages: [
    { stage: 'D+0', days: 0, enabled: true, notifyAdmin: false, notifyStudent: true },
    { stage: 'D+1', days: 1, enabled: true, notifyAdmin: true, notifyStudent: true },
    { stage: 'D+3', days: 3, enabled: true, notifyAdmin: true, notifyStudent: true },
    { stage: 'D+7', days: 7, enabled: true, notifyAdmin: true, notifyStudent: false },
    { stage: 'D+15', days: 15, enabled: true, notifyAdmin: true, notifyStudent: false },
    { stage: 'D+30', days: 30, enabled: true, notifyAdmin: true, notifyStudent: false },
  ],
};

// ============================================
// Billing Reminder Service (Multi-Tenant)
// ============================================
export class BillingReminderService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get stagesBase() {
    return `/v1/academies/${this.academyId}/billing/stages`;
  }

  private get contactsBase() {
    return `/v1/academies/${this.academyId}/billing-contacts`;
  }

  // ============================================
  // Get Overdue Financials Grouped by Stage
  // ============================================
  async getOverdueWithStages(): Promise<Record<BillingStage, Financial[]>> {
    const result: Record<BillingStage, Financial[]> = {
      'D+0': [],
      'D+1': [],
      'D+3': [],
      'D+7': [],
      'D+15': [],
      'D+30': [],
    };

    const raw = await api.get<BillingStagesResult>(this.stagesBase);

    for (const [goKey, entries] of Object.entries(raw.stages)) {
      const stage = mapGoStageKey(goKey);
      const financials = (entries as BillingStageEntry[]).map(mapStageEntryToFinancial);
      result[stage].push(...financials);
    }

    // Sort each stage by daysOverdue desc (most overdue first)
    for (const stage of Object.keys(result) as BillingStage[]) {
      result[stage].sort((a, b) => {
        const daysA = calculateDaysOverdue(a.dueDate);
        const daysB = calculateDaysOverdue(b.dueDate);
        return daysB - daysA;
      });
    }

    return result;
  }

  // ============================================
  // Log Contact Attempt
  // ============================================
  async logContactAttempt(
    financialId: string,
    studentId: string,
    studentName: string,
    type: ContactType,
    notes: string,
    stage: BillingStage,
    daysOverdue: number,
    contactedBy: string,
    contactedByName: string
  ): Promise<BillingContactLog> {
    const now = new Date();

    const raw = await api.post<{ id: string }>(this.contactsBase, {
      financial_id: financialId,
      student_id: studentId,
      student_name: studentName,
      type,
      notes,
      stage,
      days_overdue: daysOverdue,
      contacted_by: contactedBy,
      contacted_by_name: contactedByName,
    });

    return {
      id: raw.id,
      financialId,
      studentId,
      studentName,
      type,
      notes,
      stage,
      daysOverdue,
      contactedBy,
      contactedByName,
      academyId: this.academyId,
      createdAt: now,
    };
  }

  // ============================================
  // Get Contact Log for a Financial Record
  // ============================================
  async getContactLog(financialId: string): Promise<BillingContactLog[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(
      `${this.contactsBase}?financial_id=${financialId}`
    );
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return raw.map((item: any) => ({
      id: item.id,
      financialId: item.financial_id,
      studentId: item.student_id,
      studentName: item.student_name,
      type: item.type,
      notes: item.notes,
      stage: item.stage,
      daysOverdue: item.days_overdue,
      contactedBy: item.contacted_by,
      contactedByName: item.contacted_by_name,
      academyId: item.academy_id || this.academyId,
      createdAt: new Date(item.created_at),
    }));
  }

  // ============================================
  // Get Collection Stats
  // Derived client-side from the stages response.
  // ============================================
  async getCollectionStats(): Promise<CollectionStats> {
    const stagesGrouped = await this.getOverdueWithStages();

    const stats: CollectionStats = {
      totalOverdue: 0,
      totalOverdueAmount: 0,
      totalStudentsOverdue: 0,
      recoveryRate: 0,
      averageDaysOverdue: 0,
      byStage: {
        'D+0': { count: 0, amount: 0 },
        'D+1': { count: 0, amount: 0 },
        'D+3': { count: 0, amount: 0 },
        'D+7': { count: 0, amount: 0 },
        'D+15': { count: 0, amount: 0 },
        'D+30': { count: 0, amount: 0 },
      },
    };

    const uniqueStudents = new Set<string>();
    let totalDaysOverdue = 0;

    for (const stage of Object.keys(stagesGrouped) as BillingStage[]) {
      for (const financial of stagesGrouped[stage]) {
        const daysOverdue = calculateDaysOverdue(financial.dueDate);
        stats.totalOverdue++;
        stats.totalOverdueAmount += financial.amount;
        totalDaysOverdue += daysOverdue;
        uniqueStudents.add(financial.studentId);
        stats.byStage[stage].count++;
        stats.byStage[stage].amount += financial.amount;
      }
    }

    stats.totalStudentsOverdue = uniqueStudents.size;
    stats.averageDaysOverdue =
      stats.totalOverdue > 0 ? Math.round(totalDaysOverdue / stats.totalOverdue) : 0;
    stats.recoveryRate = 0;

    return stats;
  }

  // ============================================
  // Get Billing Reminder Settings
  // Stored as a single settings key in the Go backend.
  // ============================================
  async getBillingReminderSettings(): Promise<BillingReminderSettings> {
    try {
      const raw = await api.get<{ value: BillingReminderSettings }>(
        `/v1/academies/${this.academyId}/settings/billingReminders`
      );
      const data = raw.value ?? (raw as unknown as BillingReminderSettings);
      return {
        enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
        stages: data.stages ?? DEFAULT_SETTINGS.stages,
        whatsappEnabled: data.whatsappEnabled ?? false,
        emailEnabled: data.emailEnabled ?? false,
        messageTemplates: data.messageTemplates,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  // ============================================
  // Get Student Contacts Map
  // Fetches via billing contacts endpoint.
  // ============================================
  async getStudentContacts(): Promise<Map<string, StudentContact>> {
    try {
      const res = await api.get<{ items: unknown[] } | unknown[]>(this.contactsBase);
      const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
      const map = new Map<string, StudentContact>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      raw.forEach((item: any) => {
        if (!map.has(item.student_id)) {
          map.set(item.student_id, {
            studentId: item.student_id,
            studentName: item.student_name || '',
            phone: item.student_phone || undefined,
            email: item.student_email || undefined,
            guardianPhone: item.guardian_phone || undefined,
            guardianEmail: item.guardian_email || undefined,
            category: item.category || 'adult',
          });
        }
      });
      return map;
    } catch {
      return new Map();
    }
  }

  // ============================================
  // Save Billing Reminder Settings
  // ============================================
  async saveBillingReminderSettings(settings: BillingReminderSettings): Promise<void> {
    await api.put(`/v1/academies/${this.academyId}/settings/billingReminders`, {
      value: settings,
    });
  }
}

// ============================================
// Factory Function
// ============================================
export function createBillingReminderService(academyId: string): BillingReminderService {
  return new BillingReminderService(academyId);
}
