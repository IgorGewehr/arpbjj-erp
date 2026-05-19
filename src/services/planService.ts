import { api } from '@/lib/api/client';
import { Plan } from '@/types';
import { ClassService } from './classService';

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
// Go API response shapes (snake_case)
// ============================================
interface GoPlanListResponse {
  items: GoPlan[];
}

interface GoPlan {
  id: string;
  academy_id: string;
  name: string;
  description?: string;
  monthly_value: string;
  default_due_day: number;
  classes_per_week: number;
  is_active: boolean;
  student_ids?: string[];
  custom_values?: Record<string, string>;
  custom_due_days?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// ============================================
// Helper: Convert Go response to Plan
// ============================================
const goToPlan = (p: GoPlan): Plan => {
  // Convert custom_values from string→string to string→number
  const customValues: Record<string, number> = {};
  if (p.custom_values) {
    for (const [k, v] of Object.entries(p.custom_values)) {
      customValues[k] = parseFloat(v);
    }
  }

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    monthlyValue: parseFloat(p.monthly_value),
    defaultDueDay: p.default_due_day || 10,
    classesPerWeek: p.classes_per_week,
    studentIds: (p.student_ids ?? []).map(String),
    customValues,
    customDueDays: p.custom_due_days ?? {},
    isActive: p.is_active,
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
  };
};

// ============================================
// Plan Service (Multi-Tenant)
// ============================================
export class PlanService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get baseUrl() {
    return `/v1/academies/${this.academyId}/plans`;
  }

  // ============================================
  // Get All Plans
  // ============================================
  async list(): Promise<Plan[]> {
    const res = await api.get<GoPlanListResponse>(this.baseUrl);
    const plans = res.items.map(goToPlan);
    return plans.sort((a, b) => a.monthlyValue - b.monthlyValue);
  }

  // ============================================
  // Get Active Plans
  // ============================================
  async getActive(): Promise<Plan[]> {
    const plans = await this.list();
    return plans.filter(p => p.isActive);
  }

  // ============================================
  // Get Plan by ID
  // ============================================
  async getById(id: string): Promise<Plan | null> {
    try {
      const p = await api.get<GoPlan>(`${this.baseUrl}/${id}`);
      return goToPlan(p);
    } catch {
      return null;
    }
  }

  // ============================================
  // Create Plan
  // ============================================
  async create(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>): Promise<Plan> {
    const body: Record<string, unknown> = {
      name: data.name,
      monthly_value: String(data.monthlyValue),
      default_due_day: data.defaultDueDay || 10,
      classes_per_week: data.classesPerWeek,
      is_active: data.isActive,
    };

    if (data.description) body.description = data.description;

    const p = await api.post<GoPlan>(this.baseUrl, body, {
      'Idempotency-Key': crypto.randomUUID(),
    });

    return goToPlan(p);
  }

  // ============================================
  // Update Plan
  // ============================================
  async update(id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Plan> {
    const body: Record<string, unknown> = {};

    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.monthlyValue !== undefined) body.monthly_value = String(data.monthlyValue);
    if (data.defaultDueDay !== undefined) body.default_due_day = data.defaultDueDay;
    if (data.classesPerWeek !== undefined) body.classes_per_week = data.classesPerWeek;
    if (data.isActive !== undefined) body.is_active = data.isActive;

    // custom_values: convert number values to string for Go
    if (data.customValues !== undefined) {
      const cv: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.customValues)) {
        cv[k] = String(v);
      }
      body.custom_values = cv;
    }

    if (data.customDueDays !== undefined) body.custom_due_days = data.customDueDays;

    const p = await api.patch<GoPlan>(`${this.baseUrl}/${id}`, body);
    return goToPlan(p);
  }

  // ============================================
  // Delete Plan
  // ============================================
  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================
  // Add Student to Plan (enroll)
  // ============================================
  async addStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    if (plan.studentIds.includes(studentId)) {
      return plan;
    }

    await api.post(`/v1/academies/${this.academyId}/plans/${planId}/students/${studentId}`);

    // Re-fetch to get updated plan
    return (await this.getById(planId))!;
  }

  // ============================================
  // Remove Student from Plan (unenroll)
  // ============================================
  async removeStudent(planId: string, studentId: string): Promise<Plan> {
    await api.delete(`/v1/academies/${this.academyId}/plans/${planId}/students/${studentId}`);
    return (await this.getById(planId))!;
  }

  // ============================================
  // Toggle Student in Plan
  // ============================================
  async toggleStudent(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const isEnrolled = plan.studentIds.includes(studentId);

    if (isEnrolled) {
      return this.removeStudent(planId, studentId);
    } else {
      return this.addStudent(planId, studentId);
    }
  }

  // ============================================
  // Set Custom Value for Student
  // ============================================
  async setCustomValue(planId: string, studentId: string, value: number): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const newCustomValues = { ...(plan.customValues ?? {}), [studentId]: value };
    return this.update(planId, { customValues: newCustomValues });
  }

  // ============================================
  // Remove Custom Value (restore plan default)
  // ============================================
  async removeCustomValue(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const newCustomValues = { ...(plan.customValues ?? {}) };
    delete newCustomValues[studentId];
    return this.update(planId, { customValues: newCustomValues });
  }

  // ============================================
  // Set Custom Due Day for Student
  // ============================================
  async setCustomDueDay(planId: string, studentId: string, day: number): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const newCustomDueDays = { ...(plan.customDueDays ?? {}), [studentId]: day };
    return this.update(planId, { customDueDays: newCustomDueDays });
  }

  // ============================================
  // Remove Custom Due Day (restore plan default)
  // ============================================
  async removeCustomDueDay(planId: string, studentId: string): Promise<Plan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const newCustomDueDays = { ...(plan.customDueDays ?? {}) };
    delete newCustomDueDays[studentId];
    return this.update(planId, { customDueDays: newCustomDueDays });
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
    return plans.filter(p => p.studentIds.includes(studentId));
  }

  /// Legacy wrapper — returns the first plan for a student (or null).
  async getPlanForStudent(studentId: string): Promise<Plan | null> {
    const plans = await this.getPlansForStudent(studentId);
    return plans[0] || null;
  }

  // ============================================
  // Bulk: Add Students from Classes to Plan
  // ============================================
  async addStudentsFromClasses(
    planId: string,
    classIds: string[]
  ): Promise<{ added: string[]; skipped: string[] }> {
    if (classIds.length === 0) return { added: [], skipped: [] };

    const plan = await this.getById(planId);
    if (!plan) throw new Error('Plan not found');

    const classService = new ClassService(this.academyId);

    const allStudentIds = new Set<string>();
    for (const classId of classIds) {
      const cls = await classService.getById(classId);
      if (cls) {
        cls.studentIds.forEach(id => allStudentIds.add(id));
      }
    }

    const existingIds = new Set(plan.studentIds);
    const added: string[] = [];
    const skipped: string[] = [];

    for (const studentId of allStudentIds) {
      if (existingIds.has(studentId)) {
        skipped.push(studentId);
      } else {
        added.push(studentId);
      }
    }

    // Batch-add each new student
    for (const studentId of added) {
      try {
        await api.post(`/v1/academies/${this.academyId}/plans/${planId}/students/${studentId}`);
      } catch {
        // skip errors
      }
    }

    return { added, skipped };
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
  addStudentsFromClasses: (planId: string, classIds: string[]) =>
    new PlanService(DEFAULT_ACADEMY_ID).addStudentsFromClasses(planId, classIds),
};

export default planService;
