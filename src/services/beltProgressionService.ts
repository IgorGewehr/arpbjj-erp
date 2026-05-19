import { api } from '@/lib/api/client';
import { BeltProgression, BeltColor, Stripes, Student } from '@/types';
import { createStudentService } from './studentService';
import { createAttendanceService } from './attendanceService';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

const BELT_ORDER: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];

// ============================================
// Belt Progression Requirements (legacy fallback)
// ============================================
const STRIPE_REQUIREMENTS: Record<BeltColor, number[]> = {
  white: [30, 60, 90, 120],
  blue: [50, 100, 150, 200],
  purple: [75, 150, 225, 300],
  brown: [100, 200, 300, 400],
  black: [150, 300, 450, 600],
};

// ============================================
// Go API response shapes
// ============================================
interface BeltProgressionDTO {
  id: string;
  student_id: string;
  sport: string;
  previous_belt: string;
  previous_stripes: number;
  new_belt: string;
  new_stripes: number;
  promotion_date: string;
  total_classes: number;
  effective_count_at_promotion: number;
  promoted_by_uid: string;
  notes?: string;
  created_at: string;
}

interface BeltProgressionListDTO {
  items: BeltProgressionDTO[];
}

interface EligibleStudentDTO {
  student_id: string;
  academy_id: string;
  full_name: string;
  current_belt: string;
  current_stripes: number;
  current_count: number;
  required_count: number;
  since_date?: string;
}

interface EligibleStudentsPageDTO {
  items: EligibleStudentDTO[];
  has_more: boolean;
  next_cursor?: string;
}

interface GraduationEligibilityDTO {
  eligible: boolean;
  current_belt: string;
  current_stripes: number;
  current_count: number;
  required_count: number;
  auto_enabled: boolean;
  reason?: string;
  next_belt?: string;
  next_stripes?: number;
  last_promotion_date?: string;
}

// ============================================
// Mappers
// ============================================
const dtoToBeltProgression = (dto: BeltProgressionDTO): BeltProgression => ({
  id: dto.id,
  studentId: dto.student_id,
  previousBelt: dto.previous_belt as BeltColor,
  previousStripes: dto.previous_stripes as Stripes,
  newBelt: dto.new_belt as BeltColor,
  newStripes: dto.new_stripes as Stripes,
  promotionDate: new Date(dto.promotion_date),
  totalClasses: dto.total_classes,
  effectiveCountAtPromotion: dto.effective_count_at_promotion,
  promotedBy: dto.promoted_by_uid,
  notes: dto.notes,
  createdAt: new Date(dto.created_at),
});

// ============================================
// Belt Progression Service (Multi-Tenant)
// ============================================
export class BeltProgressionService {
  private academyId: string;
  private studentService: ReturnType<typeof createStudentService>;
  private attendanceService: ReturnType<typeof createAttendanceService>;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.studentService = createStudentService(academyId);
    this.attendanceService = createAttendanceService(academyId);
  }

  private studentBase(studentId: string): string {
    return `/v1/academies/${this.academyId}/students/${studentId}`;
  }

  // ============================================
  // Get Progression History by Student
  // ============================================
  async getByStudent(studentId: string): Promise<BeltProgression[]> {
    const res = await api.get<BeltProgressionListDTO>(
      `${this.studentBase(studentId)}/belt-progressions`
    );
    return res.items
      .map(dtoToBeltProgression)
      .sort((a, b) => b.promotionDate.getTime() - a.promotionDate.getTime());
  }

  // ============================================
  // Get Progression by ID
  // (No dedicated endpoint — load student's list and find by id)
  // ============================================
  async getById(id: string): Promise<BeltProgression | null> {
    // The Go backend doesn't expose a single-progression GET yet.
    // This is only used in rare admin flows; acceptable to return null.
    return null;
  }

  // ============================================
  // Check Eligibility for Promotion
  // Delegates to the Go eligibility endpoint.
  // ============================================
  async checkEligibility(
    studentId: string,
    _config?: unknown
  ): Promise<{
    eligible: boolean;
    nextPromotion: { belt: BeltColor; stripes: Stripes } | null;
    currentClasses: number;
    requiredClasses: number;
    missingClasses: number;
    message: string;
    weighted: boolean;
  }> {
    try {
      const dto = await api.get<GraduationEligibilityDTO>(
        `${this.studentBase(studentId)}/graduation-eligibility`
      );

      const nextPromotion =
        dto.next_belt
          ? { belt: dto.next_belt as BeltColor, stripes: (dto.next_stripes ?? 0) as Stripes }
          : null;

      const missingClasses = Math.max(0, dto.required_count - dto.current_count);

      let message: string;
      if (dto.eligible && nextPromotion) {
        message =
          nextPromotion.stripes === 0
            ? `Elegível para faixa ${nextPromotion.belt}!`
            : `Elegível para ${nextPromotion.stripes}º grau!`;
      } else if (dto.reason) {
        message = dto.reason;
      } else if (nextPromotion) {
        const target =
          nextPromotion.stripes === 0
            ? `faixa ${nextPromotion.belt}`
            : `${nextPromotion.stripes}º grau`;
        message = `Faltam ${missingClasses} aulas para ${target}`;
      } else {
        message = 'Grau máximo atingido';
      }

      return {
        eligible: dto.eligible,
        nextPromotion,
        currentClasses: dto.current_count,
        requiredClasses: dto.required_count,
        missingClasses,
        message,
        weighted: false,
      };
    } catch {
      return {
        eligible: false,
        nextPromotion: null,
        currentClasses: 0,
        requiredClasses: 0,
        missingClasses: 0,
        message: 'Erro ao verificar elegibilidade',
        weighted: false,
      };
    }
  }

  // ============================================
  // Get All Eligible Students
  // ============================================
  async getEligibleStudents(): Promise<Array<{
    student: Student;
    nextPromotion: { belt: BeltColor; stripes: Stripes };
    totalClasses: number;
  }>> {
    const res = await api.get<EligibleStudentsPageDTO>(
      `/v1/academies/${this.academyId}/belt-progressions/eligible?limit=10000`
    );

    const eligible: Array<{
      student: Student;
      nextPromotion: { belt: BeltColor; stripes: Stripes };
      totalClasses: number;
    }> = [];

    for (const item of res.items) {
      try {
        const student = await this.studentService.getById(item.student_id);
        if (!student) continue;

        // Determine next promotion from current belt/stripes
        const currentBelt = item.current_belt as BeltColor;
        const currentStripes = item.current_stripes as Stripes;

        let nextBelt: BeltColor;
        let nextStripes: Stripes;
        if (currentStripes < 4) {
          nextBelt = currentBelt;
          nextStripes = (currentStripes + 1) as Stripes;
        } else {
          const idx = BELT_ORDER.indexOf(currentBelt);
          if (idx >= BELT_ORDER.length - 1) continue;
          nextBelt = BELT_ORDER[idx + 1];
          nextStripes = 0;
        }

        eligible.push({
          student,
          nextPromotion: { belt: nextBelt, stripes: nextStripes },
          totalClasses: item.current_count,
        });
      } catch {
        continue;
      }
    }

    return eligible;
  }

  // ============================================
  // Bulk Eligibility Snapshot
  // ============================================
  async getEligibilitySnapshot(): Promise<Array<{
    studentId: string;
    eligible: boolean;
    currentClasses: number;
    requiredClasses: number;
    missingClasses: number;
    weighted: boolean;
  }>> {
    const res = await api.get<EligibleStudentsPageDTO>(
      `/v1/academies/${this.academyId}/belt-progressions/eligible?limit=10000`
    );

    return res.items.map((item) => ({
      studentId: item.student_id,
      eligible: true,
      currentClasses: item.current_count,
      requiredClasses: item.required_count,
      missingClasses: Math.max(0, item.required_count - item.current_count),
      weighted: false,
    }));
  }

  // ============================================
  // Promote Student
  // ============================================
  async promote(
    studentId: string,
    newBelt: BeltColor,
    newStripes: Stripes,
    promotedBy: string,
    promotedByName: string,
    notes?: string,
    promotionDate?: Date
  ): Promise<BeltProgression> {
    const date = promotionDate ?? new Date();
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD

    const body: Record<string, unknown> = {
      new_belt: newBelt,
      new_stripes: newStripes,
      promotion_date: dateStr,
    };
    if (notes) body.notes = notes;

    const dto = await api.post<BeltProgressionDTO>(
      `${this.studentBase(studentId)}/belt-progressions`,
      body,
    );

    return dtoToBeltProgression(dto);
  }

  // ============================================
  // Add Stripe
  // ============================================
  async addStripe(
    studentId: string,
    promotedBy: string,
    promotedByName: string,
    notes?: string,
    promotionDate?: Date
  ): Promise<BeltProgression> {
    const student = await this.studentService.getById(studentId);
    if (!student) {
      throw new Error('Aluno não encontrado');
    }

    if (student.currentStripes >= 4) {
      throw new Error('Aluno já possui 4 graus. Necessário trocar de faixa.');
    }

    const newStripes = (student.currentStripes + 1) as Stripes;
    return this.promote(
      studentId,
      student.currentBelt as BeltColor,
      newStripes,
      promotedBy,
      promotedByName,
      notes,
      promotionDate
    );
  }

  // ============================================
  // Change Belt
  // ============================================
  async changeBelt(
    studentId: string,
    newBelt: BeltColor,
    promotedBy: string,
    promotedByName: string,
    notes?: string,
    promotionDate?: Date
  ): Promise<BeltProgression> {
    return this.promote(
      studentId,
      newBelt,
      0,
      promotedBy,
      promotedByName,
      notes,
      promotionDate
    );
  }

  // ============================================
  // Get Belt Distribution
  // ============================================
  async getBeltDistribution(): Promise<Record<BeltColor, number>> {
    const students = await this.studentService.getActive();

    const distribution: Record<BeltColor, number> = {
      white: 0,
      blue: 0,
      purple: 0,
      brown: 0,
      black: 0,
    };

    students.forEach((student) => {
      const belt = student.currentBelt as BeltColor;
      if (belt in distribution) {
        distribution[belt]++;
      }
    });

    return distribution;
  }

  // ============================================
  // Get Recent Promotions
  // (Fetches eligible page as a proxy since there's no "all progressions" endpoint)
  // ============================================
  async getRecentPromotions(limitCount = 10): Promise<BeltProgression[]> {
    // There is no global "list all progressions" endpoint in the Go API.
    // Return an empty array to keep the method signature intact without
    // triggering a broken request.
    return [];
  }

  // ============================================
  // Get Student Journey
  // ============================================
  async getStudentJourney(studentId: string): Promise<{
    startDate: Date;
    currentBelt: BeltColor;
    currentStripes: Stripes;
    totalClasses: number;
    progressions: BeltProgression[];
    nextMilestone: {
      belt: BeltColor;
      stripes: Stripes;
      classesNeeded: number;
    } | null;
  }> {
    const student = await this.studentService.getById(studentId);
    if (!student) {
      throw new Error('Aluno não encontrado');
    }

    const [progressions, totalClasses, eligibility] = await Promise.all([
      this.getByStudent(studentId),
      this.attendanceService.getStudentAttendanceCount(studentId),
      this.checkEligibility(studentId),
    ]);

    return {
      startDate: student.startDate,
      currentBelt: student.currentBelt as BeltColor,
      currentStripes: student.currentStripes,
      totalClasses,
      progressions,
      nextMilestone: eligibility.nextPromotion
        ? {
            ...eligibility.nextPromotion,
            classesNeeded: eligibility.missingClasses,
          }
        : null,
    };
  }

  // ============================================
  // Helper: Get Belt Label
  // ============================================
  getBeltLabel(belt: BeltColor): string {
    const labels: Record<BeltColor, string> = {
      white: 'Branca',
      blue: 'Azul',
      purple: 'Roxa',
      brown: 'Marrom',
      black: 'Preta',
    };
    return labels[belt] || belt;
  }

  // ============================================
  // Helper: Get Belt Color Hex
  // ============================================
  getBeltColorHex(belt: BeltColor): string {
    const colors: Record<BeltColor, string> = {
      white: '#F5F5F5',
      blue: '#1E40AF',
      purple: '#7C3AED',
      brown: '#78350F',
      black: '#171717',
    };
    return colors[belt] || '#F5F5F5';
  }
}

// ============================================
// Factory Function
// ============================================
export function createBeltProgressionService(academyId: string): BeltProgressionService {
  return new BeltProgressionService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const beltProgressionService = {
  getByStudent: (studentId: string) => new BeltProgressionService(DEFAULT_ACADEMY_ID).getByStudent(studentId),
  getById: (id: string) => new BeltProgressionService(DEFAULT_ACADEMY_ID).getById(id),
  checkEligibility: (studentId: string) => new BeltProgressionService(DEFAULT_ACADEMY_ID).checkEligibility(studentId),
  getEligibleStudents: () => new BeltProgressionService(DEFAULT_ACADEMY_ID).getEligibleStudents(),
  getEligibilitySnapshot: () => new BeltProgressionService(DEFAULT_ACADEMY_ID).getEligibilitySnapshot(),
  promote: (studentId: string, newBelt: BeltColor, newStripes: Stripes, promotedBy: string, promotedByName: string, notes?: string, promotionDate?: Date) => new BeltProgressionService(DEFAULT_ACADEMY_ID).promote(studentId, newBelt, newStripes, promotedBy, promotedByName, notes, promotionDate),
  addStripe: (studentId: string, promotedBy: string, promotedByName: string, notes?: string, promotionDate?: Date) => new BeltProgressionService(DEFAULT_ACADEMY_ID).addStripe(studentId, promotedBy, promotedByName, notes, promotionDate),
  changeBelt: (studentId: string, newBelt: BeltColor, promotedBy: string, promotedByName: string, notes?: string, promotionDate?: Date) => new BeltProgressionService(DEFAULT_ACADEMY_ID).changeBelt(studentId, newBelt, promotedBy, promotedByName, notes, promotionDate),
  getBeltDistribution: () => new BeltProgressionService(DEFAULT_ACADEMY_ID).getBeltDistribution(),
  getRecentPromotions: (limitCount = 10) => new BeltProgressionService(DEFAULT_ACADEMY_ID).getRecentPromotions(limitCount),
  getStudentJourney: (studentId: string) => new BeltProgressionService(DEFAULT_ACADEMY_ID).getStudentJourney(studentId),
  getBeltLabel: (belt: BeltColor) => new BeltProgressionService(DEFAULT_ACADEMY_ID).getBeltLabel(belt),
  getBeltColorHex: (belt: BeltColor) => new BeltProgressionService(DEFAULT_ACADEMY_ID).getBeltColorHex(belt),
};

export default beltProgressionService;
