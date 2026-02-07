import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import { Plan } from '@/types';

// ============================================
// Helper: Get the value a student pays in a plan
// ============================================
export function getStudentValue(plan: Plan, studentId: string): number {
  return plan.customValues?.[studentId] ?? plan.monthlyValue;
}

export function getStudentDueDay(plan: Plan, studentId: string): number {
  return plan.customDueDays?.[studentId] ?? plan.defaultDueDay;
}

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

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
// Plan Service (Multi-Tenant)
// ============================================
export class PlanService {
  private academyId: string;
  private plansRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.plansRef = collections.plans(academyId);
  }

  // ============================================
  // Get All Plans
  // ============================================
  async list(): Promise<Plan[]> {
    // Fetch all and sort client-side to avoid index issues
    const snapshot = await getDocs(this.plansRef);
    const plans = snapshot.docs.map(docToPlan);
    // Sort by monthlyValue asc
    return plans.sort((a, b) => a.monthlyValue - b.monthlyValue);
  }

  // ============================================
  // Get Active Plans
  // ============================================
  async getActive(): Promise<Plan[]> {
    const plans = await this.list();
    return plans.filter((p) => p.isActive);
  }

  // ============================================
  // Get Plan by ID
  // ============================================
  async getById(id: string): Promise<Plan | null> {
    const docRef = collections.plan(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToPlan(docSnap);
  }

  // ============================================
  // Create Plan
  // ============================================
  async create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>): Promise<Plan> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      name: data.name,
      monthlyValue: data.monthlyValue,
      defaultDueDay: data.defaultDueDay || 10,
      classesPerWeek: data.classesPerWeek,
      isActive: data.isActive,
      studentIds: [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Only add description if it has a value
    if (data.description) docData.description = data.description;

    const docRef = await addDoc(this.plansRef, docData);

    // Return plan directly without re-fetching
    const plan: Plan = {
      id: docRef.id,
      name: data.name,
      description: data.description,
      monthlyValue: data.monthlyValue,
      defaultDueDay: data.defaultDueDay || 10,
      classesPerWeek: data.classesPerWeek,
      studentIds: [],
      customValues: {},
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    };

    return plan;
  }

  // ============================================
  // Update Plan
  // ============================================
  async update(id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Plan> {
    const docRef = collections.plan(this.academyId, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Only add fields that are being updated
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.monthlyValue !== undefined) updateData.monthlyValue = data.monthlyValue;
    if (data.defaultDueDay !== undefined) updateData.defaultDueDay = data.defaultDueDay;
    if (data.classesPerWeek !== undefined) updateData.classesPerWeek = data.classesPerWeek;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.studentIds !== undefined) updateData.studentIds = data.studentIds;

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  }

  // ============================================
  // Delete Plan
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = collections.plan(this.academyId, id);
    await deleteDoc(docRef);
  }

  // ============================================
  // Add Student to Plan
  // ============================================
  async addStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    if (plan.studentIds.includes(studentId)) {
      return plan; // Already enrolled
    }

    return this.update(planId, {
      studentIds: [...plan.studentIds, studentId],
    });
  }

  // ============================================
  // Remove Student from Plan
  // ============================================
  async removeStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const docRef = collections.plan(this.academyId, planId);
    await updateDoc(docRef, {
      studentIds: plan.studentIds.filter((id) => id !== studentId),
      [`customValues.${studentId}`]: deleteField(),
      [`customDueDays.${studentId}`]: deleteField(),
      updatedAt: Timestamp.fromDate(new Date()),
    });

    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  }

  // ============================================
  // Toggle Student in Plan
  // ============================================
  async toggleStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const isEnrolled = plan.studentIds.includes(studentId);

    // Update the plan
    const updatedPlan = await this.update(planId, {
      studentIds: isEnrolled
        ? plan.studentIds.filter((id) => id !== studentId)
        : [...plan.studentIds, studentId],
    });

    return updatedPlan;
  }

  // ============================================
  // Set Custom Value for Student
  // ============================================
  async setCustomValue(planId: string, studentId: string, value: number): Promise<Plan> {
    const docRef = collections.plan(this.academyId, planId);
    await updateDoc(docRef, {
      [`customValues.${studentId}`]: value,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  }

  // ============================================
  // Remove Custom Value (restore plan default)
  // ============================================
  async removeCustomValue(planId: string, studentId: string): Promise<Plan> {
    const docRef = collections.plan(this.academyId, planId);
    await updateDoc(docRef, {
      [`customValues.${studentId}`]: deleteField(),
      updatedAt: Timestamp.fromDate(new Date()),
    });
    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  }

  // ============================================
  // Set Custom Due Day for Student
  // ============================================
  async setCustomDueDay(planId: string, studentId: string, day: number): Promise<Plan> {
    const docRef = collections.plan(this.academyId, planId);
    await updateDoc(docRef, {
      [`customDueDays.${studentId}`]: day,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  }

  // ============================================
  // Remove Custom Due Day (restore plan default)
  // ============================================
  async removeCustomDueDay(planId: string, studentId: string): Promise<Plan> {
    const docRef = collections.plan(this.academyId, planId);
    await updateDoc(docRef, {
      [`customDueDays.${studentId}`]: deleteField(),
      updatedAt: Timestamp.fromDate(new Date()),
    });
    const updatedDoc = await getDoc(docRef);
    return docToPlan(updatedDoc);
  }

  // ============================================
  // Get Students by Plan
  // ============================================
  async getStudentsByPlan(planId: string): Promise<string[]> {
    const plan = await this.getById(planId);
    return plan?.studentIds || [];
  }

  // ============================================
  // Get Plans for Student (multiple plans)
  // ============================================
  async getPlansForStudent(studentId: string): Promise<Plan[]> {
    const plans = await this.list();
    return plans.filter((p) => p.studentIds.includes(studentId));
  }

  /// Legacy wrapper — returns the first plan for a student (or null).
  async getPlanForStudent(studentId: string): Promise<Plan | null> {
    const plans = await this.getPlansForStudent(studentId);
    return plans[0] || null;
  }
}

// ============================================
// Factory Function
// ============================================
export function createPlanService(academyId: string): PlanService {
  return new PlanService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const planService = {
  list: () => new PlanService(DEFAULT_ACADEMY_ID).list(),
  getActive: () => new PlanService(DEFAULT_ACADEMY_ID).getActive(),
  getById: (id: string) => new PlanService(DEFAULT_ACADEMY_ID).getById(id),
  create: (data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>) => new PlanService(DEFAULT_ACADEMY_ID).create(data),
  update: (id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>) => new PlanService(DEFAULT_ACADEMY_ID).update(id, data),
  delete: (id: string) => new PlanService(DEFAULT_ACADEMY_ID).delete(id),
  addStudent: (planId: string, studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).addStudent(planId, studentId),
  removeStudent: (planId: string, studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).removeStudent(planId, studentId),
  toggleStudent: (planId: string, studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).toggleStudent(planId, studentId),
  setCustomValue: (planId: string, studentId: string, value: number) => new PlanService(DEFAULT_ACADEMY_ID).setCustomValue(planId, studentId, value),
  removeCustomValue: (planId: string, studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).removeCustomValue(planId, studentId),
  setCustomDueDay: (planId: string, studentId: string, day: number) => new PlanService(DEFAULT_ACADEMY_ID).setCustomDueDay(planId, studentId, day),
  removeCustomDueDay: (planId: string, studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).removeCustomDueDay(planId, studentId),
  getStudentsByPlan: (planId: string) => new PlanService(DEFAULT_ACADEMY_ID).getStudentsByPlan(planId),
  getPlansForStudent: (studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).getPlansForStudent(studentId),
  getPlanForStudent: (studentId: string) => new PlanService(DEFAULT_ACADEMY_ID).getPlanForStudent(studentId),
};

export default planService;
