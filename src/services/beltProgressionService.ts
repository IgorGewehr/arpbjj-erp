import {
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import { BeltProgression, BeltColor, Stripes, Student } from '@/types';
import { createStudentService } from './studentService';
import { createAchievementService } from './achievementService';
import { createAttendanceService } from './attendanceService';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Belt Progression Requirements
// ============================================
const STRIPE_REQUIREMENTS: Record<BeltColor, number[]> = {
  white: [30, 60, 90, 120], // Classes needed for 1st, 2nd, 3rd, 4th stripe
  blue: [50, 100, 150, 200],
  purple: [75, 150, 225, 300],
  brown: [100, 200, 300, 400],
  black: [150, 300, 450, 600],
};

const BELT_ORDER: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];

// ============================================
// Helper: Convert Firestore document to BeltProgression
// ============================================
const docToBeltProgression = (doc: DocumentSnapshot): BeltProgression => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    previousBelt: data.previousBelt,
    previousStripes: data.previousStripes,
    newBelt: data.newBelt,
    newStripes: data.newStripes,
    promotionDate: data.promotionDate instanceof Timestamp ? data.promotionDate.toDate() : new Date(data.promotionDate),
    totalClasses: data.totalClasses,
    promotedBy: data.promotedBy,
    promotedByName: data.promotedByName,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
};

// ============================================
// Belt Progression Service (Multi-Tenant)
// ============================================
export class BeltProgressionService {
  private academyId: string;
  private progressionsRef: CollectionReference;
  private studentService: ReturnType<typeof createStudentService>;
  private achievementService: ReturnType<typeof createAchievementService>;
  private attendanceService: ReturnType<typeof createAttendanceService>;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.progressionsRef = collections.beltProgressions(academyId);
    this.studentService = createStudentService(academyId);
    this.achievementService = createAchievementService(academyId);
    this.attendanceService = createAttendanceService(academyId);
  }

  // ============================================
  // Get Progression History by Student
  // ============================================
  async getByStudent(studentId: string): Promise<BeltProgression[]> {
    const q = query(
      this.progressionsRef,
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const progressions = snapshot.docs.map(docToBeltProgression);
    // Sort by promotionDate desc client-side
    return progressions.sort((a, b) => b.promotionDate.getTime() - a.promotionDate.getTime());
  }

  // ============================================
  // Get Progression by ID
  // ============================================
  async getById(id: string): Promise<BeltProgression | null> {
    const docRef = collections.beltProgression(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToBeltProgression(docSnap);
  }

  // ============================================
  // Check Eligibility for Promotion
  // ============================================
  async checkEligibility(studentId: string): Promise<{
    eligible: boolean;
    nextPromotion: {
      belt: BeltColor;
      stripes: Stripes;
    } | null;
    currentClasses: number;
    requiredClasses: number;
    missingClasses: number;
    message: string;
  }> {
    const student = await this.studentService.getById(studentId);
    if (!student) {
      return {
        eligible: false,
        nextPromotion: null,
        currentClasses: 0,
        requiredClasses: 0,
        missingClasses: 0,
        message: 'Aluno não encontrado',
      };
    }

    const totalClasses = await this.attendanceService.getStudentAttendanceCount(studentId);
    const currentBelt = student.currentBelt as BeltColor;
    const currentStripes = student.currentStripes;

    // Determine next promotion
    let nextBelt: BeltColor;
    let nextStripes: Stripes;

    if (currentStripes < 4) {
      // Next is a stripe
      nextBelt = currentBelt;
      nextStripes = (currentStripes + 1) as Stripes;
    } else {
      // Next is a belt change
      const currentIndex = BELT_ORDER.indexOf(currentBelt);
      if (currentIndex >= BELT_ORDER.length - 1) {
        // Already black belt with 4 stripes
        return {
          eligible: false,
          nextPromotion: null,
          currentClasses: totalClasses,
          requiredClasses: 0,
          missingClasses: 0,
          message: 'Grau máximo atingido',
        };
      }
      nextBelt = BELT_ORDER[currentIndex + 1];
      nextStripes = 0;
    }

    // Calculate required classes
    const requirements = STRIPE_REQUIREMENTS[currentBelt];
    const requiredClasses = requirements[currentStripes] || 0;
    const missingClasses = Math.max(0, requiredClasses - totalClasses);

    const eligible = totalClasses >= requiredClasses;

    let message: string;
    if (eligible) {
      if (nextStripes === 0) {
        message = `Elegível para faixa ${nextBelt}!`;
      } else {
        message = `Elegível para ${nextStripes}º grau!`;
      }
    } else {
      message = `Faltam ${missingClasses} aulas para ${nextStripes === 0 ? `faixa ${nextBelt}` : `${nextStripes}º grau`}`;
    }

    return {
      eligible,
      nextPromotion: { belt: nextBelt, stripes: nextStripes },
      currentClasses: totalClasses,
      requiredClasses,
      missingClasses,
      message,
    };
  }

  // ============================================
  // Get All Eligible Students
  // ============================================
  async getEligibleStudents(): Promise<Array<{
    student: Student;
    nextPromotion: { belt: BeltColor; stripes: Stripes };
    totalClasses: number;
  }>> {
    const activeStudents = await this.studentService.getActive();
    const eligible: Array<{
      student: Student;
      nextPromotion: { belt: BeltColor; stripes: Stripes };
      totalClasses: number;
    }> = [];

    for (const student of activeStudents) {
      const eligibility = await this.checkEligibility(student.id);
      if (eligibility.eligible && eligibility.nextPromotion) {
        eligible.push({
          student,
          nextPromotion: eligibility.nextPromotion,
          totalClasses: eligibility.currentClasses,
        });
      }
    }

    return eligible;
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
    const student = await this.studentService.getById(studentId);
    if (!student) {
      throw new Error('Aluno não encontrado');
    }

    const totalClasses = await this.attendanceService.getStudentAttendanceCount(studentId);
    const now = new Date();
    const effectivePromotionDate = promotionDate ?? now;

    // Build progression data carefully to avoid undefined values
    const progressionData: Record<string, unknown> = {
      studentId,
      previousBelt: student.currentBelt,
      previousStripes: student.currentStripes,
      newBelt,
      newStripes,
      promotionDate: Timestamp.fromDate(effectivePromotionDate),
      totalClasses,
      promotedBy,
      promotedByName,
      createdAt: Timestamp.fromDate(now),
    };

    // Only add notes if it has a value
    if (notes) progressionData.notes = notes;

    const docRef = await addDoc(this.progressionsRef, progressionData);

    // Update student's belt
    await this.studentService.updateBelt(studentId, newBelt, newStripes);

    // Create achievement record
    await this.achievementService.createGraduation(
      studentId,
      student.fullName,
      student.currentBelt,
      newBelt,
      student.currentStripes,
      newStripes,
      promotedBy,
      effectivePromotionDate
    );

    const newDoc = await getDoc(docRef);
    return docToBeltProgression(newDoc);
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
  // ============================================
  async getRecentPromotions(limitCount = 10): Promise<BeltProgression[]> {
    // Fetch all and sort/limit client-side to avoid index issues
    const snapshot = await getDocs(this.progressionsRef);
    const progressions = snapshot.docs.map(docToBeltProgression);
    // Sort by promotionDate desc and limit
    return progressions
      .sort((a, b) => b.promotionDate.getTime() - a.promotionDate.getTime())
      .slice(0, limitCount);
  }

  // ============================================
  // Get Student Journey (timeline of all progressions)
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

    const progressions = await this.getByStudent(studentId);
    const totalClasses = await this.attendanceService.getStudentAttendanceCount(studentId);
    const eligibility = await this.checkEligibility(studentId);

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
