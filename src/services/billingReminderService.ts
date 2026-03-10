import {
  getDocs,
  addDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/firebase/collections';
import { removeUndefinedDeep } from '@/lib/firestoreUtils';
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
// Helper: Convert Firestore document to Financial
// ============================================
const docToFinancial = (docSnap: DocumentSnapshot): Financial => {
  const data = docSnap.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: docSnap.id,
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
// Helper: Convert Firestore document to BillingContactLog
// ============================================
const docToContactLog = (docSnap: DocumentSnapshot): BillingContactLog => {
  const data = docSnap.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: docSnap.id,
    financialId: data.financialId,
    studentId: data.studentId,
    studentName: data.studentName,
    type: data.type,
    notes: data.notes,
    stage: data.stage,
    daysOverdue: data.daysOverdue,
    contactedBy: data.contactedBy,
    contactedByName: data.contactedByName,
    academyId: data.academyId,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
};

// ============================================
// Helper: Calculate days overdue
// ============================================
const calculateDaysOverdue = (dueDate: Date): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================
// Helper: Classify stage from days overdue
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
  private financialsRef: CollectionReference;
  private billingContactLogRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.financialsRef = collections.financials(academyId);
    this.billingContactLogRef = collections.billingContactLog(academyId);
  }

  // ============================================
  // Get Overdue Financials Grouped by Stage
  // ============================================
  async getOverdueWithStages(): Promise<Record<BillingStage, Financial[]>> {
    const snapshot = await getDocs(this.financialsRef);
    const financials = snapshot.docs.map(docToFinancial);

    const result: Record<BillingStage, Financial[]> = {
      'D+0': [],
      'D+1': [],
      'D+3': [],
      'D+7': [],
      'D+15': [],
      'D+30': [],
    };

    financials.forEach((financial) => {
      if (financial.status !== 'overdue' && financial.status !== 'pending') return;

      const daysOverdue = calculateDaysOverdue(financial.dueDate);
      if (daysOverdue < 0) return;

      const stage = classifyStage(daysOverdue);
      if (stage) {
        result[stage].push(financial);
      }
    });

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

    const docData = {
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
      createdAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(this.billingContactLogRef, docData);

    return {
      id: docRef.id,
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
    const q = query(
      this.billingContactLogRef,
      where('financialId', '==', financialId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToContactLog);
  }

  // ============================================
  // Get Collection Stats
  // ============================================
  async getCollectionStats(): Promise<CollectionStats> {
    const snapshot = await getDocs(this.financialsRef);
    const financials = snapshot.docs.map(docToFinancial);

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

    financials.forEach((financial) => {
      if (financial.status !== 'overdue' && financial.status !== 'pending') return;

      const daysOverdue = calculateDaysOverdue(financial.dueDate);
      if (daysOverdue < 0) return;

      const stage = classifyStage(daysOverdue);
      if (!stage) return;

      stats.totalOverdue++;
      stats.totalOverdueAmount += financial.amount;
      totalDaysOverdue += daysOverdue;
      uniqueStudents.add(financial.studentId);

      stats.byStage[stage].count++;
      stats.byStage[stage].amount += financial.amount;
    });

    stats.totalStudentsOverdue = uniqueStudents.size;
    stats.averageDaysOverdue = stats.totalOverdue > 0
      ? Math.round(totalDaysOverdue / stats.totalOverdue)
      : 0;
    // Recovery rate is a placeholder; needs historical data to compute accurately
    stats.recoveryRate = 0;

    return stats;
  }

  // ============================================
  // Get Billing Reminder Settings
  // ============================================
  async getBillingReminderSettings(): Promise<BillingReminderSettings> {
    const settingsRef = doc(db, `academies/${this.academyId}/settings`, 'billingReminders');
    const docSnap = await getDoc(settingsRef);

    if (!docSnap.exists()) {
      return DEFAULT_SETTINGS;
    }

    const data = docSnap.data();
    return {
      enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
      stages: data.stages ?? DEFAULT_SETTINGS.stages,
      whatsappEnabled: data.whatsappEnabled ?? false,
      emailEnabled: data.emailEnabled ?? false,
      messageTemplates: data.messageTemplates,
    };
  }

  // ============================================
  // Get Student Contacts Map (for notifications)
  // ============================================
  async getStudentContacts(): Promise<Map<string, StudentContact>> {
    const studentsRef = collections.students(this.academyId);
    const snapshot = await getDocs(studentsRef);
    const contactsMap = new Map<string, StudentContact>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      contactsMap.set(docSnap.id, {
        studentId: docSnap.id,
        studentName: data.fullName || '',
        phone: data.phone || undefined,
        email: data.email || undefined,
        guardianPhone: data.guardian?.phone || undefined,
        guardianEmail: data.guardian?.email || undefined,
        category: data.category || 'adult',
      });
    });

    return contactsMap;
  }

  // ============================================
  // Save Billing Reminder Settings
  // ============================================
  async saveBillingReminderSettings(settings: BillingReminderSettings): Promise<void> {
    const settingsRef = doc(db, `academies/${this.academyId}/settings`, 'billingReminders');
    await setDoc(settingsRef, removeUndefinedDeep({
      ...settings,
      updatedAt: Timestamp.fromDate(new Date()),
    }));
  }
}

// ============================================
// Factory Function
// ============================================
export function createBillingReminderService(academyId: string): BillingReminderService {
  return new BillingReminderService(academyId);
}
