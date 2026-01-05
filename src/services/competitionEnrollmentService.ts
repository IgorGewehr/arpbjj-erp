import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CompetitionEnrollment,
  AgeCategory,
  StudentTransportPreference,
} from '@/types';

const ENROLLMENTS_COLLECTION = 'competitionEnrollments';

// ============================================
// Helper: Convert Firestore document to CompetitionEnrollment
// ============================================
const docToEnrollment = (doc: DocumentSnapshot): CompetitionEnrollment => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    competitionId: data.competitionId,
    competitionName: data.competitionName,
    studentId: data.studentId,
    studentName: data.studentName,
    ageCategory: data.ageCategory,
    weightCategory: data.weightCategory,
    transportPreference: data.transportPreference,
    enrolledAt: data.enrolledAt instanceof Timestamp ? data.enrolledAt.toDate() : new Date(data.enrolledAt),
    enrolledBy: data.enrolledBy,
  };
};

// ============================================
// Competition Enrollment Service
// ============================================
export const competitionEnrollmentService = {
  // ============================================
  // Enroll Student in Competition
  // ============================================
  async enroll(
    data: Omit<CompetitionEnrollment, 'id' | 'enrolledAt'>,
    enrolledBy?: string
  ): Promise<CompetitionEnrollment> {
    // Check if already enrolled
    const existing = await this.getByCompetitionAndStudent(data.competitionId, data.studentId);
    if (existing) {
      throw new Error('Aluno já está inscrito nesta competição');
    }

    const now = new Date();

    const docData: Record<string, unknown> = {
      competitionId: data.competitionId,
      competitionName: data.competitionName || '',
      studentId: data.studentId,
      studentName: data.studentName,
      ageCategory: data.ageCategory,
      weightCategory: data.weightCategory,
      transportPreference: data.transportPreference,
      enrolledAt: Timestamp.fromDate(now),
    };

    if (enrolledBy) {
      docData.enrolledBy = enrolledBy;
    }

    const docRef = await addDoc(collection(db, ENROLLMENTS_COLLECTION), docData);

    return {
      id: docRef.id,
      competitionId: data.competitionId,
      competitionName: data.competitionName,
      studentId: data.studentId,
      studentName: data.studentName,
      ageCategory: data.ageCategory,
      weightCategory: data.weightCategory,
      transportPreference: data.transportPreference,
      enrolledAt: now,
      enrolledBy,
    };
  },

  // ============================================
  // Get Enrollment by Competition and Student
  // ============================================
  async getByCompetitionAndStudent(
    competitionId: string,
    studentId: string
  ): Promise<CompetitionEnrollment | null> {
    const q = query(
      collection(db, ENROLLMENTS_COLLECTION),
      where('competitionId', '==', competitionId),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return docToEnrollment(snapshot.docs[0]);
  },

  // ============================================
  // Get All Enrollments for a Competition
  // ============================================
  async getByCompetition(competitionId: string): Promise<CompetitionEnrollment[]> {
    const q = query(
      collection(db, ENROLLMENTS_COLLECTION),
      where('competitionId', '==', competitionId)
    );

    const snapshot = await getDocs(q);
    const enrollments = snapshot.docs.map(docToEnrollment);

    // Sort by enrollment date
    return enrollments.sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());
  },

  // ============================================
  // Get All Enrollments for a Student (History)
  // ============================================
  async getByStudent(studentId: string): Promise<CompetitionEnrollment[]> {
    const q = query(
      collection(db, ENROLLMENTS_COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const enrollments = snapshot.docs.map(docToEnrollment);

    // Sort by enrollment date descending (most recent first)
    return enrollments.sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime());
  },

  // ============================================
  // Update Enrollment
  // ============================================
  async update(
    id: string,
    data: Partial<Pick<CompetitionEnrollment, 'ageCategory' | 'weightCategory' | 'transportPreference'>>
  ): Promise<CompetitionEnrollment> {
    const docRef = doc(db, ENROLLMENTS_COLLECTION, id);

    const updateData: Record<string, unknown> = {};

    if (data.ageCategory !== undefined) updateData.ageCategory = data.ageCategory;
    if (data.weightCategory !== undefined) updateData.weightCategory = data.weightCategory;
    if (data.transportPreference !== undefined) updateData.transportPreference = data.transportPreference;

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToEnrollment(updatedDoc);
  },

  // ============================================
  // Delete Enrollment (Unenroll)
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, ENROLLMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Delete All Enrollments for a Competition
  // ============================================
  async deleteByCompetition(competitionId: string): Promise<void> {
    const enrollments = await this.getByCompetition(competitionId);
    for (const enrollment of enrollments) {
      await this.delete(enrollment.id);
    }
  },

  // ============================================
  // Get Transport List (students who need transport)
  // ============================================
  async getTransportList(competitionId: string): Promise<CompetitionEnrollment[]> {
    const enrollments = await this.getByCompetition(competitionId);
    return enrollments.filter((e) => e.transportPreference === 'need_transport');
  },

  // ============================================
  // Get Transport Stats
  // ============================================
  async getTransportStats(competitionId: string): Promise<{
    needTransport: number;
    ownTransport: number;
    undecided: number;
    total: number;
  }> {
    const enrollments = await this.getByCompetition(competitionId);

    const stats = {
      needTransport: 0,
      ownTransport: 0,
      undecided: 0,
      total: enrollments.length,
    };

    enrollments.forEach((e) => {
      switch (e.transportPreference) {
        case 'need_transport':
          stats.needTransport++;
          break;
        case 'own_transport':
          stats.ownTransport++;
          break;
        case 'undecided':
          stats.undecided++;
          break;
      }
    });

    return stats;
  },

  // ============================================
  // Get Enrollments by Category
  // ============================================
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
  },

  // ============================================
  // Check if Student is Enrolled
  // ============================================
  async isEnrolled(competitionId: string, studentId: string): Promise<boolean> {
    const enrollment = await this.getByCompetitionAndStudent(competitionId, studentId);
    return enrollment !== null;
  },

  // ============================================
  // Get Enrollment Count for Competition
  // ============================================
  async getCount(competitionId: string): Promise<number> {
    const enrollments = await this.getByCompetition(competitionId);
    return enrollments.length;
  },
};

export default competitionEnrollmentService;
