import { api } from '@/lib/api/client';
import {
  Competition,
  CompetitionResult,
  CompetitionStatus,
  CompetitionTransportStatus,
} from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Mappers
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCompetition = (raw: any): Competition => ({
  id: raw.id,
  name: raw.name,
  date: new Date(raw.date),
  location: raw.location,
  description: raw.description,
  status: raw.status,
  registrationDeadline: raw.registration_deadline ? new Date(raw.registration_deadline) : undefined,
  enrolledStudentIds: raw.enrolled_student_ids || [],
  transportStatus: raw.transport_status,
  transportNotes: raw.transport_notes,
  transportCapacity: raw.transport_capacity ?? undefined,
  customWeightCategories: raw.weight_categories || [],
  teamPosition: raw.team_position,
  teamNotes: raw.team_notes,
  createdAt: new Date(raw.created_at),
  updatedAt: new Date(raw.updated_at),
  createdBy: raw.created_by || '',
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapResult = (raw: any): CompetitionResult => ({
  id: raw.id,
  competitionId: raw.competition_id,
  competitionName: raw.competition_name,
  studentId: raw.student_id,
  studentName: raw.student_name,
  position: raw.position,
  beltCategory: raw.belt_category,
  ageCategory: raw.age_category,
  weightCategory: raw.weight_category,
  modality: raw.modality,
  divisionType: raw.division_type,
  notes: raw.notes,
  date: new Date(raw.date),
  createdAt: new Date(raw.created_at),
  updatedAt: new Date(raw.updated_at),
  createdBy: raw.created_by || '',
});

// ============================================
// Competition Service (Multi-Tenant)
// ============================================
export class CompetitionService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get base() {
    return `/v1/academies/${this.academyId}/competitions`;
  }

  async list(): Promise<Competition[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(this.base);
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    const competitions = raw.map(mapCompetition);
    return competitions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getUpcoming(): Promise<Competition[]> {
    const all = await this.list();
    return all
      .filter((c) => c.status === 'upcoming')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getCompleted(): Promise<Competition[]> {
    const all = await this.list();
    return all
      .filter((c) => c.status === 'completed')
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getById(id: string): Promise<Competition | null> {
    try {
      const raw = await api.get<unknown>(`${this.base}/${id}`);
      return mapCompetition(raw);
    } catch {
      return null;
    }
  }

  async create(
    data: Omit<Competition, 'id' | 'createdAt' | 'updatedAt' | 'enrolledStudentIds'>,
    _createdBy: string
  ): Promise<Competition> {
    const raw = await api.post<unknown>(this.base, {
      name: data.name,
      date: data.date instanceof Date ? data.date.toISOString() : data.date,
      location: data.location,
      description: data.description,
      status: data.status,
      registration_deadline: data.registrationDeadline instanceof Date
        ? data.registrationDeadline.toISOString()
        : data.registrationDeadline ?? null,
      transport_status: data.transportStatus ?? null,
      transport_notes: data.transportNotes ?? null,
      transport_capacity: data.transportCapacity ?? null,
      weight_categories: data.customWeightCategories || [],
      team_position: data.teamPosition ?? null,
      team_notes: data.teamNotes ?? null,
    });
    return mapCompetition(raw);
  }

  async update(id: string, data: Partial<Competition>): Promise<Competition> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.location !== undefined) body.location = data.location;
    if (data.description !== undefined) body.description = data.description;
    if (data.status !== undefined) body.status = data.status;
    if (data.date) body.date = new Date(data.date).toISOString();
    if (data.registrationDeadline !== undefined)
      body.registration_deadline = data.registrationDeadline
        ? new Date(data.registrationDeadline).toISOString()
        : null;
    if (data.transportStatus !== undefined) body.transport_status = data.transportStatus;
    if (data.transportNotes !== undefined) body.transport_notes = data.transportNotes;
    if (data.transportCapacity !== undefined) body.transport_capacity = data.transportCapacity;
    if (data.teamPosition !== undefined) body.team_position = data.teamPosition;
    if (data.teamNotes !== undefined) body.team_notes = data.teamNotes;
    if (data.customWeightCategories !== undefined) body.weight_categories = data.customWeightCategories;
    if (data.enrolledStudentIds !== undefined) body.enrolled_student_ids = data.enrolledStudentIds;

    const raw = await api.patch<unknown>(`${this.base}/${id}`, body);
    return mapCompetition(raw);
  }

  async updateTransportStatus(
    id: string,
    status: CompetitionTransportStatus,
    notes?: string,
    capacity?: number
  ): Promise<Competition> {
    return this.update(id, {
      transportStatus: status,
      transportNotes: notes,
      transportCapacity: capacity,
    });
  }

  async addCustomWeightCategory(id: string, category: string): Promise<Competition> {
    const competition = await this.getById(id);
    if (!competition) throw new Error('Competition not found');
    const currentCategories = competition.customWeightCategories || [];
    if (currentCategories.includes(category)) return competition;
    return this.update(id, { customWeightCategories: [...currentCategories, category] });
  }

  async removeCustomWeightCategory(id: string, category: string): Promise<Competition> {
    const competition = await this.getById(id);
    if (!competition) throw new Error('Competition not found');
    return this.update(id, {
      customWeightCategories: (competition.customWeightCategories || []).filter((c) => c !== category),
    });
  }

  async delete(id: string): Promise<void> {
    await api.delete(`${this.base}/${id}`);
  }

  async enrollStudent(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');
    if (competition.enrolledStudentIds.includes(studentId)) return competition;
    return this.update(competitionId, {
      enrolledStudentIds: [...competition.enrolledStudentIds, studentId],
    });
  }

  async unenrollStudent(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');
    return this.update(competitionId, {
      enrolledStudentIds: competition.enrolledStudentIds.filter((id) => id !== studentId),
    });
  }

  async toggleEnrollment(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');
    const isEnrolled = competition.enrolledStudentIds.includes(studentId);
    return this.update(competitionId, {
      enrolledStudentIds: isEnrolled
        ? competition.enrolledStudentIds.filter((id) => id !== studentId)
        : [...competition.enrolledStudentIds, studentId],
    });
  }

  async updateStatus(id: string, status: CompetitionStatus): Promise<Competition> {
    return this.update(id, { status });
  }

  async getForStudent(studentId: string): Promise<Competition[]> {
    const allCompetitions = await this.list();
    return allCompetitions.filter((c) => c.enrolledStudentIds.includes(studentId));
  }

  // ============================================
  // RESULTS METHODS
  // ============================================

  async addResult(
    data: Omit<CompetitionResult, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    _createdBy: string
  ): Promise<CompetitionResult> {
    const raw = await api.post<unknown>(`${this.base}/${data.competitionId}/results`, {
      competition_name: data.competitionName,
      student_id: data.studentId,
      student_name: data.studentName,
      position: data.position,
      belt_category: data.beltCategory,
      age_category: data.ageCategory,
      weight_category: data.weightCategory,
      modality: data.modality ?? null,
      division_type: data.divisionType ?? null,
      notes: data.notes ?? null,
      date: new Date(data.date).toISOString(),
    });
    return mapResult(raw);
  }

  async getResultsForCompetition(competitionId: string): Promise<CompetitionResult[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(`${this.base}/${competitionId}/results`);
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    const results = raw.map(mapResult);
    const positionOrder: Record<string, number> = { gold: 1, silver: 2, bronze: 3, participant: 4 };
    return results.sort(
      (a, b) => (positionOrder[a.position] || 5) - (positionOrder[b.position] || 5)
    );
  }

  async getResultsForStudent(studentId: string): Promise<CompetitionResult[]> {
    // Fetch all competitions then aggregate results for student
    const competitions = await this.list();
    const allResults: CompetitionResult[] = [];
    for (const comp of competitions) {
      const results = await this.getResultsForCompetition(comp.id);
      allResults.push(...results.filter((r) => r.studentId === studentId));
    }
    return allResults.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getMedalCount(studentId: string): Promise<{ gold: number; silver: number; bronze: number; total: number }> {
    const results = await this.getResultsForStudent(studentId);
    const count = { gold: 0, silver: 0, bronze: 0, total: 0 };
    results.forEach((r) => {
      if (r.position === 'gold') count.gold++;
      else if (r.position === 'silver') count.silver++;
      else if (r.position === 'bronze') count.bronze++;
    });
    count.total = count.gold + count.silver + count.bronze;
    return count;
  }

  async updateResult(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    // Need competitionId to build path — fetch by scanning if not provided
    const competitionId = data.competitionId;
    if (!competitionId) throw new Error('competitionId required to update result');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (data.competitionName !== undefined) body.competition_name = data.competitionName;
    if (data.studentName !== undefined) body.student_name = data.studentName;
    if (data.position !== undefined) body.position = data.position;
    if (data.beltCategory !== undefined) body.belt_category = data.beltCategory;
    if (data.ageCategory !== undefined) body.age_category = data.ageCategory;
    if (data.weightCategory !== undefined) body.weight_category = data.weightCategory;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.date) body.date = new Date(data.date).toISOString();

    const raw = await api.patch<unknown>(`${this.base}/${competitionId}/results/${id}`, body);
    return mapResult(raw);
  }

  async deleteResult(id: string, competitionId?: string): Promise<void> {
    if (!competitionId) throw new Error('competitionId required to delete result');
    await api.delete(`${this.base}/${competitionId}/results/${id}`);
  }

  async getResultById(id: string, competitionId?: string): Promise<CompetitionResult | null> {
    if (!competitionId) return null;
    try {
      const raw = await api.get<unknown>(`${this.base}/${competitionId}/results/${id}`);
      return mapResult(raw);
    } catch {
      return null;
    }
  }
}

// ============================================
// Factory Function
// ============================================
export function createCompetitionService(academyId: string): CompetitionService {
  return new CompetitionService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const competitionService = {
  list: () => new CompetitionService(DEFAULT_ACADEMY_ID).list(),
  getUpcoming: () => new CompetitionService(DEFAULT_ACADEMY_ID).getUpcoming(),
  getCompleted: () => new CompetitionService(DEFAULT_ACADEMY_ID).getCompleted(),
  getById: (id: string) => new CompetitionService(DEFAULT_ACADEMY_ID).getById(id),
  create: (data: Omit<Competition, 'id' | 'createdAt' | 'updatedAt' | 'enrolledStudentIds'>, createdBy: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).create(data, createdBy),
  update: (id: string, data: Partial<Competition>) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).update(id, data),
  updateTransportStatus: (id: string, status: CompetitionTransportStatus, notes?: string, capacity?: number) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).updateTransportStatus(id, status, notes, capacity),
  addCustomWeightCategory: (id: string, category: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).addCustomWeightCategory(id, category),
  removeCustomWeightCategory: (id: string, category: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).removeCustomWeightCategory(id, category),
  delete: (id: string) => new CompetitionService(DEFAULT_ACADEMY_ID).delete(id),
  enrollStudent: (competitionId: string, studentId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).enrollStudent(competitionId, studentId),
  unenrollStudent: (competitionId: string, studentId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).unenrollStudent(competitionId, studentId),
  toggleEnrollment: (competitionId: string, studentId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).toggleEnrollment(competitionId, studentId),
  updateStatus: (id: string, status: CompetitionStatus) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).updateStatus(id, status),
  getForStudent: (studentId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).getForStudent(studentId),
  addResult: (
    data: Omit<CompetitionResult, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    createdBy: string
  ) => new CompetitionService(DEFAULT_ACADEMY_ID).addResult(data, createdBy),
  getResultsForCompetition: (competitionId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).getResultsForCompetition(competitionId),
  getResultsForStudent: (studentId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).getResultsForStudent(studentId),
  getMedalCount: (studentId: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).getMedalCount(studentId),
  updateResult: (id: string, data: Partial<CompetitionResult>) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).updateResult(id, data),
  deleteResult: (id: string, competitionId?: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).deleteResult(id, competitionId),
  getResultById: (id: string, competitionId?: string) =>
    new CompetitionService(DEFAULT_ACADEMY_ID).getResultById(id, competitionId),
};

export default competitionService;
