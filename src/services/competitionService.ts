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
  Competition,
  CompetitionResult,
  CompetitionStatus,
  CompetitionPosition,
  AgeCategory,
  BeltColor,
  KidsBeltColor,
} from '@/types';

const COMPETITIONS_COLLECTION = 'competitions';
const RESULTS_COLLECTION = 'competitionResults';

// ============================================
// Helper: Convert Firestore document to Competition
// ============================================
const docToCompetition = (doc: DocumentSnapshot): Competition => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    name: data.name,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    location: data.location,
    description: data.description,
    status: data.status,
    registrationDeadline: data.registrationDeadline instanceof Timestamp
      ? data.registrationDeadline.toDate()
      : data.registrationDeadline
        ? new Date(data.registrationDeadline)
        : undefined,
    enrolledStudentIds: data.enrolledStudentIds || [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Helper: Convert Firestore document to CompetitionResult
// ============================================
const docToResult = (doc: DocumentSnapshot): CompetitionResult => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    competitionId: data.competitionId,
    competitionName: data.competitionName,
    studentId: data.studentId,
    studentName: data.studentName,
    position: data.position,
    beltCategory: data.beltCategory,
    ageCategory: data.ageCategory,
    weightCategory: data.weightCategory,
    notes: data.notes,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Competition Service
// ============================================
export const competitionService = {
  // ============================================
  // List All Competitions
  // ============================================
  async list(): Promise<Competition[]> {
    const snapshot = await getDocs(collection(db, COMPETITIONS_COLLECTION));
    const competitions = snapshot.docs.map(docToCompetition);
    // Sort client-side to avoid index issues
    return competitions.sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Get Upcoming Competitions
  // ============================================
  async getUpcoming(): Promise<Competition[]> {
    // Fetch all and filter/sort client-side to avoid composite index
    const snapshot = await getDocs(collection(db, COMPETITIONS_COLLECTION));
    const competitions = snapshot.docs.map(docToCompetition);
    return competitions
      .filter((c) => c.status === 'upcoming')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  // ============================================
  // Get Completed Competitions
  // ============================================
  async getCompleted(): Promise<Competition[]> {
    // Fetch all and filter/sort client-side to avoid composite index
    const snapshot = await getDocs(collection(db, COMPETITIONS_COLLECTION));
    const competitions = snapshot.docs.map(docToCompetition);
    return competitions
      .filter((c) => c.status === 'completed')
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Get Competition by ID
  // ============================================
  async getById(id: string): Promise<Competition | null> {
    const docRef = doc(db, COMPETITIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToCompetition(docSnap);
  },

  // ============================================
  // Create Competition
  // ============================================
  async create(
    data: Omit<Competition, 'id' | 'createdAt' | 'updatedAt' | 'enrolledStudentIds'>,
    createdBy: string
  ): Promise<Competition> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      name: data.name,
      date: Timestamp.fromDate(new Date(data.date)),
      location: data.location,
      status: data.status,
      enrolledStudentIds: [],
      createdBy,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Only add optional fields if they have values
    if (data.description) docData.description = data.description;
    if (data.registrationDeadline) {
      docData.registrationDeadline = Timestamp.fromDate(new Date(data.registrationDeadline));
    }

    const docRef = await addDoc(collection(db, COMPETITIONS_COLLECTION), docData);

    // Return competition directly without re-fetching
    const competition: Competition = {
      id: docRef.id,
      name: data.name,
      date: new Date(data.date),
      location: data.location,
      description: data.description,
      status: data.status,
      registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
      enrolledStudentIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    return competition;
  },

  // ============================================
  // Update Competition
  // ============================================
  async update(id: string, data: Partial<Competition>): Promise<Competition> {
    const docRef = doc(db, COMPETITIONS_COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Only add fields that are being updated
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.enrolledStudentIds !== undefined) updateData.enrolledStudentIds = data.enrolledStudentIds;
    if (data.date) {
      updateData.date = Timestamp.fromDate(new Date(data.date));
    }
    if (data.registrationDeadline) {
      updateData.registrationDeadline = Timestamp.fromDate(new Date(data.registrationDeadline));
    }

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToCompetition(updatedDoc);
  },

  // ============================================
  // Delete Competition
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COMPETITIONS_COLLECTION, id);
    await deleteDoc(docRef);

    // Also delete all results for this competition
    const resultsQuery = query(
      collection(db, RESULTS_COLLECTION),
      where('competitionId', '==', id)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    for (const resultDoc of resultsSnapshot.docs) {
      await deleteDoc(resultDoc.ref);
    }
  },

  // ============================================
  // Enroll Student in Competition
  // ============================================
  async enrollStudent(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');

    if (competition.enrolledStudentIds.includes(studentId)) {
      return competition; // Already enrolled
    }

    return this.update(competitionId, {
      enrolledStudentIds: [...competition.enrolledStudentIds, studentId],
    });
  },

  // ============================================
  // Unenroll Student from Competition
  // ============================================
  async unenrollStudent(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');

    return this.update(competitionId, {
      enrolledStudentIds: competition.enrolledStudentIds.filter((id) => id !== studentId),
    });
  },

  // ============================================
  // Toggle Student Enrollment
  // ============================================
  async toggleEnrollment(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');

    const isEnrolled = competition.enrolledStudentIds.includes(studentId);

    return this.update(competitionId, {
      enrolledStudentIds: isEnrolled
        ? competition.enrolledStudentIds.filter((id) => id !== studentId)
        : [...competition.enrolledStudentIds, studentId],
    });
  },

  // ============================================
  // Update Competition Status
  // ============================================
  async updateStatus(id: string, status: CompetitionStatus): Promise<Competition> {
    return this.update(id, { status });
  },

  // ============================================
  // Get Competitions for Student
  // ============================================
  async getForStudent(studentId: string): Promise<Competition[]> {
    const allCompetitions = await this.list();
    return allCompetitions.filter((c) => c.enrolledStudentIds.includes(studentId));
  },

  // ============================================
  // RESULTS METHODS
  // ============================================

  // ============================================
  // Add Result
  // ============================================
  async addResult(
    data: Omit<CompetitionResult, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    createdBy: string
  ): Promise<CompetitionResult> {
    const now = new Date();

    // Build docData carefully to avoid undefined values
    const docData: Record<string, unknown> = {
      competitionId: data.competitionId,
      competitionName: data.competitionName,
      studentId: data.studentId,
      studentName: data.studentName,
      position: data.position,
      beltCategory: data.beltCategory,
      ageCategory: data.ageCategory,
      date: Timestamp.fromDate(new Date(data.date)),
      createdBy,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Only add optional fields if they have values
    if (data.weightCategory) docData.weightCategory = data.weightCategory;
    if (data.notes) docData.notes = data.notes;

    const docRef = await addDoc(collection(db, RESULTS_COLLECTION), docData);

    // Return result directly without re-fetching
    const result: CompetitionResult = {
      id: docRef.id,
      competitionId: data.competitionId,
      competitionName: data.competitionName,
      studentId: data.studentId,
      studentName: data.studentName,
      position: data.position,
      beltCategory: data.beltCategory,
      ageCategory: data.ageCategory,
      weightCategory: data.weightCategory,
      notes: data.notes,
      date: new Date(data.date),
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    return result;
  },

  // ============================================
  // Get Results for Competition
  // ============================================
  async getResultsForCompetition(competitionId: string): Promise<CompetitionResult[]> {
    const q = query(
      collection(db, RESULTS_COLLECTION),
      where('competitionId', '==', competitionId)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(docToResult);

    // Sort by position client-side (gold, silver, bronze, participant)
    const positionOrder = { gold: 1, silver: 2, bronze: 3, participant: 4 };
    return results.sort((a, b) =>
      (positionOrder[a.position] || 5) - (positionOrder[b.position] || 5)
    );
  },

  // ============================================
  // Get Results for Student
  // ============================================
  async getResultsForStudent(studentId: string): Promise<CompetitionResult[]> {
    const q = query(
      collection(db, RESULTS_COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(docToResult);
    // Sort by date desc client-side
    return results.sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Get Medal Count for Student
  // ============================================
  async getMedalCount(studentId: string): Promise<{
    gold: number;
    silver: number;
    bronze: number;
    total: number;
  }> {
    const results = await this.getResultsForStudent(studentId);

    const count = {
      gold: 0,
      silver: 0,
      bronze: 0,
      total: 0,
    };

    results.forEach((r) => {
      if (r.position === 'gold') count.gold++;
      else if (r.position === 'silver') count.silver++;
      else if (r.position === 'bronze') count.bronze++;
    });

    count.total = count.gold + count.silver + count.bronze;
    return count;
  },

  // ============================================
  // Update Result
  // ============================================
  async updateResult(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const docRef = doc(db, RESULTS_COLLECTION, id);

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Only add fields that are being updated
    if (data.competitionName !== undefined) updateData.competitionName = data.competitionName;
    if (data.studentName !== undefined) updateData.studentName = data.studentName;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.beltCategory !== undefined) updateData.beltCategory = data.beltCategory;
    if (data.ageCategory !== undefined) updateData.ageCategory = data.ageCategory;
    if (data.weightCategory !== undefined) updateData.weightCategory = data.weightCategory;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.date) {
      updateData.date = Timestamp.fromDate(new Date(data.date));
    }

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToResult(updatedDoc);
  },

  // ============================================
  // Delete Result
  // ============================================
  async deleteResult(id: string): Promise<void> {
    const docRef = doc(db, RESULTS_COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Get Result by ID
  // ============================================
  async getResultById(id: string): Promise<CompetitionResult | null> {
    const docRef = doc(db, RESULTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToResult(docSnap);
  },
};

export default competitionService;
