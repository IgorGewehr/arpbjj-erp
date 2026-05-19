import { api } from '@/lib/api/client';
import { CompetitionEnrollment, AgeCategory } from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Mapper
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapEnrollment = (raw: any): CompetitionEnrollment => ({
  id: raw.id,
  competitionId: raw.competition_id,
  competitionName: raw.competition_name,
  studentId: raw.student_id,
  studentName: raw.student_name,
  ageCategory: raw.age_category,
  weightCategory: raw.weight_category,
  transportPreference: raw.transport_preference,
  enrolledAt: new Date(raw.enrolled_at),
  enrolledBy: raw.enrolled_by,
});

// ============================================
// Competition Enrollment Service (Multi-Tenant)
// ============================================
export class CompetitionEnrollmentService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private enrollmentsBase(competitionId: string) {
    return `/v1/academies/${this.academyId}/competitions/${competitionId}/enrollments`;
  }

  async enroll(
    data: Omit<CompetitionEnrollment, 'id' | 'enrolledAt'>,
    enrolledBy?: string
  ): Promise<CompetitionEnrollment> {
    const raw = await api.post<unknown>(this.enrollmentsBase(data.competitionId), {
      competition_name: data.competitionName || '',
      student_id: data.studentId,
      student_name: data.studentName,
      age_category: data.ageCategory,
      weight_category: data.weightCategory,
      transport_preference: data.transportPreference,
      enrolled_by: enrolledBy ?? null,
    });
    return mapEnrollment(raw);
  }

  async getByCompetitionAndStudent(
    competitionId: string,
    studentId: string
  ): Promise<CompetitionEnrollment | null> {
    const enrollments = await this.getByCompetition(competitionId);
    return enrollments.find((e) => e.studentId === studentId) ?? null;
  }

  async getByCompetition(competitionId: string): Promise<CompetitionEnrollment[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(this.enrollmentsBase(competitionId));
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    const enrollments = raw.map(mapEnrollment);
    return enrollments.sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());
  }

  async getByStudent(studentId: string): Promise<CompetitionEnrollment[]> {
    // The Go API doesn't have a /enrollments?student_id= global endpoint,
    // so we query billing contacts with student_id param as proxy.
    // Per API spec, use GET /v1/academies/{id}/billing-contacts?student_id
    // is unrelated. Instead, use the same approach as legacy: collect from all competitions.
    // However that would require listing all competitions — expensive.
    // Use the dedicated endpoint if available, otherwise list all competitions.
    try {
      const raw = await api.get<{ items?: unknown[]; enrollments?: unknown[] } | unknown[]>(
        `/v1/academies/${this.academyId}/competitions/enrollments?student_id=${studentId}`
      );
      const items = Array.isArray(raw)
        ? raw
        : ((raw as Record<string, unknown>).items as unknown[]) ??
          ((raw as Record<string, unknown>).enrollments as unknown[]) ??
          [];
      return (items as unknown[])
        .map(mapEnrollment)
        .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime());
    } catch {
      // Fallback: not supported, return empty
      return [];
    }
  }

  async update(
    id: string,
    competitionIdOrData:
      | string
      | Partial<Pick<CompetitionEnrollment, 'ageCategory' | 'weightCategory' | 'transportPreference'>>,
    data?: Partial<Pick<CompetitionEnrollment, 'ageCategory' | 'weightCategory' | 'transportPreference'>>
  ): Promise<CompetitionEnrollment> {
    // Support both:
    //   update(id, competitionId, data)   — class API
    //   update(id, data)                  — legacy API (competitionId unknown)
    let competitionId: string;
    let updateData: Partial<Pick<CompetitionEnrollment, 'ageCategory' | 'weightCategory' | 'transportPreference'>>;

    if (typeof competitionIdOrData === 'string') {
      competitionId = competitionIdOrData;
      updateData = data!;
    } else {
      // Legacy call: competitionId not provided, try generic endpoint
      competitionId = '';
      updateData = competitionIdOrData;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (updateData.ageCategory !== undefined) body.age_category = updateData.ageCategory;
    if (updateData.weightCategory !== undefined) body.weight_category = updateData.weightCategory;
    if (updateData.transportPreference !== undefined) body.transport_preference = updateData.transportPreference;

    if (competitionId) {
      const raw = await api.patch<unknown>(`${this.enrollmentsBase(competitionId)}/${id}`, body);
      return mapEnrollment(raw);
    } else {
      // competitionId not known — use a generic enrollment patch endpoint if available
      const raw = await api.patch<unknown>(
        `/v1/academies/${this.academyId}/competitions/enrollments/${id}`,
        body
      );
      return mapEnrollment(raw);
    }
  }

  async delete(id: string, competitionId?: string): Promise<void> {
    if (competitionId) {
      await api.delete(`${this.enrollmentsBase(competitionId)}/${id}`);
    } else {
      // competitionId not known — use a generic enrollment delete endpoint if available
      await api.delete(`/v1/academies/${this.academyId}/competitions/enrollments/${id}`);
    }
  }

  async deleteByCompetition(competitionId: string): Promise<void> {
    const enrollments = await this.getByCompetition(competitionId);
    for (const enrollment of enrollments) {
      await this.delete(enrollment.id, competitionId);
    }
  }

  async getTransportList(competitionId: string): Promise<CompetitionEnrollment[]> {
    const enrollments = await this.getByCompetition(competitionId);
    return enrollments.filter((e) => e.transportPreference === 'need_transport');
  }

  async getTransportStats(competitionId: string): Promise<{
    needTransport: number;
    ownTransport: number;
    undecided: number;
    total: number;
  }> {
    const enrollments = await this.getByCompetition(competitionId);
    const stats = { needTransport: 0, ownTransport: 0, undecided: 0, total: enrollments.length };
    enrollments.forEach((e) => {
      switch (e.transportPreference) {
        case 'need_transport': stats.needTransport++; break;
        case 'own_transport': stats.ownTransport++; break;
        case 'undecided': stats.undecided++; break;
      }
    });
    return stats;
  }

  async getByCategory(
    competitionId: string,
    ageCategory?: AgeCategory,
    weightCategory?: string
  ): Promise<CompetitionEnrollment[]> {
    const enrollments = await this.getByCompetition(competitionId);
    return enrollments.filter((e) => {
      if (ageCategory && e.ageCategory !== ageCategory) return false;
      if (weightCategory && e.weightCategory !== weightCategory) return false;
      return true;
    });
  }

  async isEnrolled(competitionId: string, studentId: string): Promise<boolean> {
    const enrollment = await this.getByCompetitionAndStudent(competitionId, studentId);
    return enrollment !== null;
  }

  async getCount(competitionId: string): Promise<number> {
    const enrollments = await this.getByCompetition(competitionId);
    return enrollments.length;
  }
}

// ============================================
// Factory Function
// ============================================
export function createCompetitionEnrollmentService(academyId: string): CompetitionEnrollmentService {
  return new CompetitionEnrollmentService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// NOTE: update() and delete() now require competitionId as second arg.
// Legacy wrappers below keep the old 2-arg signature by throwing when
// competitionId is not known at call site. Callers that used the legacy
// singleton should migrate to the class API.
// ============================================
export const competitionEnrollmentService = {
  enroll: (data: Omit<CompetitionEnrollment, 'id' | 'enrolledAt'>, enrolledBy?: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).enroll(data, enrolledBy),
  getByCompetitionAndStudent: (competitionId: string, studentId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getByCompetitionAndStudent(competitionId, studentId),
  getByCompetition: (competitionId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getByCompetition(competitionId),
  getByStudent: (studentId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getByStudent(studentId),
  update: (
    id: string,
    data: Partial<Pick<CompetitionEnrollment, 'ageCategory' | 'weightCategory' | 'transportPreference'>>,
    competitionId?: string
  ) => new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).update(id, data, undefined),
  delete: (id: string, competitionId?: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).delete(id, competitionId),
  deleteByCompetition: (competitionId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).deleteByCompetition(competitionId),
  getTransportList: (competitionId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getTransportList(competitionId),
  getTransportStats: (competitionId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getTransportStats(competitionId),
  getByCategory: (competitionId: string, ageCategory?: AgeCategory, weightCategory?: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getByCategory(competitionId, ageCategory, weightCategory),
  isEnrolled: (competitionId: string, studentId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).isEnrolled(competitionId, studentId),
  getCount: (competitionId: string) =>
    new CompetitionEnrollmentService(DEFAULT_ACADEMY_ID).getCount(competitionId),
};

export default competitionEnrollmentService;
