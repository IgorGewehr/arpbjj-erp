import { api } from '@/lib/api/client';
import { Assessment } from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Go API response shapes
// ============================================
interface AssessmentScoresDTO {
  respeito: number;
  disciplina: number;
  pontualidade: number;
  tecnica: number;
  esforco: number;
}

interface AssessmentDTO {
  id: string;
  student_id: string;
  date: string;
  evaluated_by_uid: string;
  scores: AssessmentScoresDTO;
  notes?: string;
  created_at: string;
}

interface AssessmentListDTO {
  items: AssessmentDTO[];
}

// ============================================
// Mapper: Go DTO → Assessment
// ============================================
const dtoToAssessment = (dto: AssessmentDTO): Assessment => ({
  id: dto.id,
  studentId: dto.student_id,
  date: new Date(dto.date),
  evaluatedBy: dto.evaluated_by_uid,
  scores: {
    respeito: dto.scores.respeito,
    disciplina: dto.scores.disciplina,
    pontualidade: dto.scores.pontualidade,
    tecnica: dto.scores.tecnica,
    esforco: dto.scores.esforco,
  },
  notes: dto.notes,
  createdAt: new Date(dto.created_at),
});

// ============================================
// Assessment Service (Multi-Tenant)
// ============================================
export class AssessmentService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private studentBase(studentId: string): string {
    return `/v1/academies/${this.academyId}/students/${studentId}`;
  }

  // ============================================
  // Get Assessments by Student
  // ============================================
  async getByStudent(studentId: string, limitCount = 10): Promise<Assessment[]> {
    const res = await api.get<AssessmentListDTO>(
      `${this.studentBase(studentId)}/assessments?limit=${limitCount}`
    );
    return res.items
      .map(dtoToAssessment)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limitCount);
  }

  // ============================================
  // Get Latest Assessment for Student
  // ============================================
  async getLatest(studentId: string): Promise<Assessment | null> {
    const assessments = await this.getByStudent(studentId, 1);
    return assessments[0] || null;
  }

  // ============================================
  // Get Assessment by ID
  // (No dedicated single-assessment GET endpoint — return null)
  // ============================================
  async getById(_id: string): Promise<Assessment | null> {
    return null;
  }

  // ============================================
  // Create Assessment
  // ============================================
  async create(
    data: Omit<Assessment, 'id' | 'createdAt'>,
  ): Promise<Assessment> {
    const dateStr = data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : new Date(data.date).toISOString().slice(0, 10);

    const body: Record<string, unknown> = {
      date: dateStr,
      scores: {
        respeito: data.scores.respeito,
        disciplina: data.scores.disciplina,
        pontualidade: data.scores.pontualidade,
        tecnica: data.scores.tecnica,
        esforco: data.scores.esforco,
      },
    };
    if (data.notes) body.notes = data.notes;

    const dto = await api.post<AssessmentDTO>(
      `${this.studentBase(data.studentId)}/assessments`,
      body,
    );

    return dtoToAssessment(dto);
  }

  // ============================================
  // Update Assessment
  // (No PATCH endpoint in Go API — re-create as a new assessment)
  // ============================================
  async update(id: string, data: Partial<Assessment>): Promise<Assessment> {
    if (!data.studentId) {
      throw new Error('studentId is required to update an assessment');
    }

    const existing = await this.getLatest(data.studentId);
    const merged: Omit<Assessment, 'id' | 'createdAt'> = {
      studentId: data.studentId,
      studentName: data.studentName,
      date: data.date ?? existing?.date ?? new Date(),
      scores: data.scores ?? existing?.scores ?? {
        respeito: 0, disciplina: 0, pontualidade: 0, tecnica: 0, esforco: 0,
      },
      notes: data.notes ?? existing?.notes,
      evaluatedBy: data.evaluatedBy ?? existing?.evaluatedBy ?? '',
      evaluatedByName: data.evaluatedByName ?? existing?.evaluatedByName,
    };

    return this.create(merged);
  }

  // ============================================
  // Delete Assessment
  // (No DELETE endpoint for assessments in Go API — no-op)
  // ============================================
  async delete(_id: string): Promise<void> {
    // The Go API doesn't expose a DELETE /assessments/{id} endpoint.
    // This is a no-op kept for API compatibility.
  }

  // ============================================
  // Get Evolution Data (for radar chart)
  // ============================================
  async getEvolution(studentId: string, count = 5): Promise<{
    labels: string[];
    datasets: Array<{
      date: string;
      scores: Assessment['scores'];
    }>;
    averages: Assessment['scores'];
  }> {
    const assessments = await this.getByStudent(studentId, count);

    if (assessments.length === 0) {
      return {
        labels: ['Respeito', 'Disciplina', 'Pontualidade', 'Técnica', 'Esforço'],
        datasets: [],
        averages: {
          respeito: 0,
          disciplina: 0,
          pontualidade: 0,
          tecnica: 0,
          esforco: 0,
        },
      };
    }

    const totals = {
      respeito: 0,
      disciplina: 0,
      pontualidade: 0,
      tecnica: 0,
      esforco: 0,
    };

    const datasets = assessments.reverse().map((a) => {
      totals.respeito += a.scores.respeito;
      totals.disciplina += a.scores.disciplina;
      totals.pontualidade += a.scores.pontualidade;
      totals.tecnica += a.scores.tecnica;
      totals.esforco += a.scores.esforco;

      return {
        date: a.date.toISOString(),
        scores: a.scores,
      };
    });

    const n = assessments.length;
    const averages: Assessment['scores'] = {
      respeito: Math.round((totals.respeito / n) * 10) / 10,
      disciplina: Math.round((totals.disciplina / n) * 10) / 10,
      pontualidade: Math.round((totals.pontualidade / n) * 10) / 10,
      tecnica: Math.round((totals.tecnica / n) * 10) / 10,
      esforco: Math.round((totals.esforco / n) * 10) / 10,
    };

    return {
      labels: ['Respeito', 'Disciplina', 'Pontualidade', 'Técnica', 'Esforço'],
      datasets,
      averages,
    };
  }

  // ============================================
  // Get Recent Assessments (all students)
  // (No global list endpoint — return empty; only per-student listing exists)
  // ============================================
  async getRecent(_limitCount = 20): Promise<Assessment[]> {
    return [];
  }

  // ============================================
  // Calculate Overall Score
  // ============================================
  calculateOverallScore(scores: Assessment['scores']): number {
    const { respeito, disciplina, pontualidade, tecnica, esforco } = scores;
    const total = respeito + disciplina + pontualidade + tecnica + esforco;
    return Math.round((total / 5) * 10) / 10;
  }

  // ============================================
  // Get Performance Level
  // ============================================
  getPerformanceLevel(overallScore: number): {
    level: 'excelente' | 'muito_bom' | 'bom' | 'regular' | 'precisa_melhorar';
    label: string;
    color: string;
  } {
    if (overallScore >= 4.5) {
      return { level: 'excelente', label: 'Excelente', color: '#16A34A' };
    }
    if (overallScore >= 4) {
      return { level: 'muito_bom', label: 'Muito Bom', color: '#22C55E' };
    }
    if (overallScore >= 3) {
      return { level: 'bom', label: 'Bom', color: '#EAB308' };
    }
    if (overallScore >= 2) {
      return { level: 'regular', label: 'Regular', color: '#F97316' };
    }
    return { level: 'precisa_melhorar', label: 'Precisa Melhorar', color: '#EF4444' };
  }
}

// ============================================
// Factory Function
// ============================================
export function createAssessmentService(academyId: string): AssessmentService {
  return new AssessmentService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const assessmentService = {
  getByStudent: (studentId: string, limitCount = 10) => new AssessmentService(DEFAULT_ACADEMY_ID).getByStudent(studentId, limitCount),
  getLatest: (studentId: string) => new AssessmentService(DEFAULT_ACADEMY_ID).getLatest(studentId),
  getById: (id: string) => new AssessmentService(DEFAULT_ACADEMY_ID).getById(id),
  create: (data: Omit<Assessment, 'id' | 'createdAt'>) => new AssessmentService(DEFAULT_ACADEMY_ID).create(data),
  update: (id: string, data: Partial<Assessment>) => new AssessmentService(DEFAULT_ACADEMY_ID).update(id, data),
  delete: (id: string) => new AssessmentService(DEFAULT_ACADEMY_ID).delete(id),
  getEvolution: (studentId: string, count = 5) => new AssessmentService(DEFAULT_ACADEMY_ID).getEvolution(studentId, count),
  getRecent: (limitCount = 20) => new AssessmentService(DEFAULT_ACADEMY_ID).getRecent(limitCount),
  calculateOverallScore: (scores: Assessment['scores']) => new AssessmentService(DEFAULT_ACADEMY_ID).calculateOverallScore(scores),
  getPerformanceLevel: (overallScore: number) => new AssessmentService(DEFAULT_ACADEMY_ID).getPerformanceLevel(overallScore),
};

export default assessmentService;
