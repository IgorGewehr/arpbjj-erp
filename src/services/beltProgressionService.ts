import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BeltProgression, BeltColor, Stripes, Student } from '@/types';
import { studentService } from './studentService';
import { achievementService } from './achievementService';
import { attendanceService } from './attendanceService';

const COLLECTION = 'beltProgressions';

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

const MINIMUM_TIME_FOR_BELT: Record<BeltColor, number> = {
  white: 0,      // months
  blue: 24,      // 2 years minimum on blue
  purple: 18,    // 1.5 years minimum on purple
  brown: 12,     // 1 year minimum on brown
  black: 36,     // 3 years minimum on black (for degrees)
};

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
// Belt Progression Service
// ============================================
export const beltProgressionService = {
  // ============================================
  // Get Progression History by Student
  // ============================================
  async getByStudent(studentId: string): Promise<BeltProgression[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('promotionDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToBeltProgression);
  },

  // ============================================
  // Get Progression by ID
  // ============================================
  async getById(id: string): Promise<BeltProgression | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToBeltProgression(docSnap);
  },

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
    const student = await studentService.getById(studentId);
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

    const totalClasses = await attendanceService.getStudentAttendanceCount(studentId);
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
  },

  // ============================================
  // Get All Eligible Students
  // ============================================
  async getEligibleStudents(): Promise<Array<{
    student: Student;
    nextPromotion: { belt: BeltColor; stripes: Stripes };
    totalClasses: number;
  }>> {
    const activeStudents = await studentService.getActive();
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
  },

  // ============================================
  // Promote Student
  // ============================================
  async promote(
    studentId: string,
    newBelt: BeltColor,
    newStripes: Stripes,
    promotedBy: string,
    promotedByName: string,
    notes?: string
  ): Promise<BeltProgression> {
    const student = await studentService.getById(studentId);
    if (!student) {
      throw new Error('Aluno não encontrado');
    }

    const totalClasses = await attendanceService.getStudentAttendanceCount(studentId);

    // Create progression record
    const progressionData = {
      studentId,
      previousBelt: student.currentBelt,
      previousStripes: student.currentStripes,
      newBelt,
      newStripes,
      promotionDate: Timestamp.now(),
      totalClasses,
      promotedBy,
      promotedByName,
      notes,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION), progressionData);

    // Update student's belt
    await studentService.updateBelt(studentId, newBelt, newStripes);

    // Create achievement record
    await achievementService.createGraduation(
      studentId,
      student.fullName,
      student.currentBelt,
      newBelt,
      student.currentStripes,
      newStripes,
      promotedBy
    );

    const newDoc = await getDoc(docRef);
    return docToBeltProgression(newDoc);
  },

  // ============================================
  // Add Stripe
  // ============================================
  async addStripe(
    studentId: string,
    promotedBy: string,
    promotedByName: string,
    notes?: string
  ): Promise<BeltProgression> {
    const student = await studentService.getById(studentId);
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
      notes
    );
  },

  // ============================================
  // Change Belt
  // ============================================
  async changeBelt(
    studentId: string,
    newBelt: BeltColor,
    promotedBy: string,
    promotedByName: string,
    notes?: string
  ): Promise<BeltProgression> {
    return this.promote(
      studentId,
      newBelt,
      0,
      promotedBy,
      promotedByName,
      notes
    );
  },

  // ============================================
  // Get Belt Distribution
  // ============================================
  async getBeltDistribution(): Promise<Record<BeltColor, number>> {
    const students = await studentService.getActive();

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
  },

  // ============================================
  // Get Recent Promotions
  // ============================================
  async getRecentPromotions(limitCount = 10): Promise<BeltProgression[]> {
    const q = query(
      collection(db, COLLECTION),
      orderBy('promotionDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limitCount).map(docToBeltProgression);
  },

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
    const student = await studentService.getById(studentId);
    if (!student) {
      throw new Error('Aluno não encontrado');
    }

    const progressions = await this.getByStudent(studentId);
    const totalClasses = await attendanceService.getStudentAttendanceCount(studentId);
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
  },

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
  },

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
  },
};

export default beltProgressionService;
