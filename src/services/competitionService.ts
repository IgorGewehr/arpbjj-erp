import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import {
  Competition,
  CompetitionResult,
  CompetitionStatus,
  CompetitionPosition,
  CompetitionTransportStatus,
  AgeCategory,
  BeltColor,
  KidsBeltColor,
} from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

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
    // Transport fields
    transportStatus: data.transportStatus,
    transportNotes: data.transportNotes,
    transportCapacity: data.transportCapacity,
    // Custom weight categories
    customWeightCategories: data.customWeightCategories || [],
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
    modality: data.modality,
    divisionType: data.divisionType,
    notes: data.notes,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Competition Service (Multi-Tenant)
// ============================================
export class CompetitionService {
  private academyId: string;
  private competitionsRef: CollectionReference;
  private resultsRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.competitionsRef = collections.competitions(academyId);
    this.resultsRef = collections.competitionResults(academyId);
  }

  // ============================================
  // List All Competitions
  // ============================================
  async list(): Promise<Competition[]> {
    const snapshot = await getDocs(this.competitionsRef);
    const competitions = snapshot.docs.map(docToCompetition);
    // Sort client-side to avoid index issues
    return competitions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ============================================
  // Get Upcoming Competitions
  // ============================================
  async getUpcoming(): Promise<Competition[]> {
    // Fetch all and filter/sort client-side to avoid composite index
    const snapshot = await getDocs(this.competitionsRef);
    const competitions = snapshot.docs.map(docToCompetition);
    return competitions
      .filter((c) => c.status === 'upcoming')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ============================================
  // Get Completed Competitions
  // ============================================
  async getCompleted(): Promise<Competition[]> {
    // Fetch all and filter/sort client-side to avoid composite index
    const snapshot = await getDocs(this.competitionsRef);
    const competitions = snapshot.docs.map(docToCompetition);
    return competitions
      .filter((c) => c.status === 'completed')
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ============================================
  // Get Competition by ID
  // ============================================
  async getById(id: string): Promise<Competition | null> {
    const docRef = collections.competition(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToCompetition(docSnap);
  }

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
    // Transport fields
    if (data.transportStatus) docData.transportStatus = data.transportStatus;
    if (data.transportNotes) docData.transportNotes = data.transportNotes;
    if (data.transportCapacity !== undefined) docData.transportCapacity = data.transportCapacity;
    // Custom weight categories
    if (data.customWeightCategories && data.customWeightCategories.length > 0) {
      docData.customWeightCategories = data.customWeightCategories;
    }

    const docRef = await addDoc(this.competitionsRef, docData);

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
      transportStatus: data.transportStatus,
      transportNotes: data.transportNotes,
      transportCapacity: data.transportCapacity,
      customWeightCategories: data.customWeightCategories || [],
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    return competition;
  }

  // ============================================
  // Update Competition
  // ============================================
  async update(id: string, data: Partial<Competition>): Promise<Competition> {
    const docRef = collections.competition(this.academyId, id);

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
    // Transport fields
    if (data.transportStatus !== undefined) updateData.transportStatus = data.transportStatus;
    if (data.transportNotes !== undefined) updateData.transportNotes = data.transportNotes;
    if (data.transportCapacity !== undefined) updateData.transportCapacity = data.transportCapacity;
    // Team result fields
    if (data.teamPosition !== undefined) updateData.teamPosition = data.teamPosition;
    if (data.teamNotes !== undefined) updateData.teamNotes = data.teamNotes;
    // Custom weight categories
    if (data.customWeightCategories !== undefined) updateData.customWeightCategories = data.customWeightCategories;

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToCompetition(updatedDoc);
  }

  // ============================================
  // Update Transport Status
  // ============================================
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

  // ============================================
  // Add Custom Weight Category
  // ============================================
  async addCustomWeightCategory(id: string, category: string): Promise<Competition> {
    const competition = await this.getById(id);
    if (!competition) throw new Error('Competition not found');

    const currentCategories = competition.customWeightCategories || [];
    if (currentCategories.includes(category)) {
      return competition; // Already exists
    }

    return this.update(id, {
      customWeightCategories: [...currentCategories, category],
    });
  }

  // ============================================
  // Remove Custom Weight Category
  // ============================================
  async removeCustomWeightCategory(id: string, category: string): Promise<Competition> {
    const competition = await this.getById(id);
    if (!competition) throw new Error('Competition not found');

    return this.update(id, {
      customWeightCategories: (competition.customWeightCategories || []).filter((c) => c !== category),
    });
  }

  // ============================================
  // Delete Competition
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = collections.competition(this.academyId, id);
    await deleteDoc(docRef);

    // Also delete all results for this competition
    const resultsQuery = query(
      this.resultsRef,
      where('competitionId', '==', id)
    );
    const resultsSnapshot = await getDocs(resultsQuery);
    for (const resultDoc of resultsSnapshot.docs) {
      await deleteDoc(resultDoc.ref);
    }
  }

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
  }

  // ============================================
  // Unenroll Student from Competition
  // ============================================
  async unenrollStudent(competitionId: string, studentId: string): Promise<Competition> {
    const competition = await this.getById(competitionId);
    if (!competition) throw new Error('Competition not found');

    return this.update(competitionId, {
      enrolledStudentIds: competition.enrolledStudentIds.filter((id) => id !== studentId),
    });
  }

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
  }

  // ============================================
  // Update Competition Status
  // ============================================
  async updateStatus(id: string, status: CompetitionStatus): Promise<Competition> {
    return this.update(id, { status });
  }

  // ============================================
  // Get Competitions for Student
  // ============================================
  async getForStudent(studentId: string): Promise<Competition[]> {
    const allCompetitions = await this.list();
    return allCompetitions.filter((c) => c.enrolledStudentIds.includes(studentId));
  }

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
    if (data.modality) docData.modality = data.modality;
    if (data.divisionType) docData.divisionType = data.divisionType;
    if (data.notes) docData.notes = data.notes;

    const docRef = await addDoc(this.resultsRef, docData);

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
      modality: data.modality,
      divisionType: data.divisionType,
      notes: data.notes,
      date: new Date(data.date),
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    return result;
  }

  // ============================================
  // Get Results for Competition
  // ============================================
  async getResultsForCompetition(competitionId: string): Promise<CompetitionResult[]> {
    const q = query(
      this.resultsRef,
      where('competitionId', '==', competitionId)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(docToResult);

    // Sort by position client-side (gold, silver, bronze, participant)
    const positionOrder = { gold: 1, silver: 2, bronze: 3, participant: 4 };
    return results.sort((a, b) =>
      (positionOrder[a.position] || 5) - (positionOrder[b.position] || 5)
    );
  }

  // ============================================
  // Get Results for Student
  // ============================================
  async getResultsForStudent(studentId: string): Promise<CompetitionResult[]> {
    const q = query(
      this.resultsRef,
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(docToResult);
    // Sort by date desc client-side
    return results.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

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
  }

  // ============================================
  // Update Result
  // ============================================
  async updateResult(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const docRef = collections.competitionResult(this.academyId, id);

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
  }

  // ============================================
  // Delete Result
  // ============================================
  async deleteResult(id: string): Promise<void> {
    const docRef = collections.competitionResult(this.academyId, id);
    await deleteDoc(docRef);
  }

  // ============================================
  // Get Result by ID
  // ============================================
  async getResultById(id: string): Promise<CompetitionResult | null> {
    const docRef = collections.competitionResult(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToResult(docSnap);
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
  create: (data: Omit<Competition, 'id' | 'createdAt' | 'updatedAt' | 'enrolledStudentIds'>, createdBy: string) => new CompetitionService(DEFAULT_ACADEMY_ID).create(data, createdBy),
  update: (id: string, data: Partial<Competition>) => new CompetitionService(DEFAULT_ACADEMY_ID).update(id, data),
  updateTransportStatus: (id: string, status: CompetitionTransportStatus, notes?: string, capacity?: number) => new CompetitionService(DEFAULT_ACADEMY_ID).updateTransportStatus(id, status, notes, capacity),
  addCustomWeightCategory: (id: string, category: string) => new CompetitionService(DEFAULT_ACADEMY_ID).addCustomWeightCategory(id, category),
  removeCustomWeightCategory: (id: string, category: string) => new CompetitionService(DEFAULT_ACADEMY_ID).removeCustomWeightCategory(id, category),
  delete: (id: string) => new CompetitionService(DEFAULT_ACADEMY_ID).delete(id),
  enrollStudent: (competitionId: string, studentId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).enrollStudent(competitionId, studentId),
  unenrollStudent: (competitionId: string, studentId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).unenrollStudent(competitionId, studentId),
  toggleEnrollment: (competitionId: string, studentId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).toggleEnrollment(competitionId, studentId),
  updateStatus: (id: string, status: CompetitionStatus) => new CompetitionService(DEFAULT_ACADEMY_ID).updateStatus(id, status),
  getForStudent: (studentId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).getForStudent(studentId),
  addResult: (data: Omit<CompetitionResult, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, createdBy: string) => new CompetitionService(DEFAULT_ACADEMY_ID).addResult(data, createdBy),
  getResultsForCompetition: (competitionId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).getResultsForCompetition(competitionId),
  getResultsForStudent: (studentId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).getResultsForStudent(studentId),
  getMedalCount: (studentId: string) => new CompetitionService(DEFAULT_ACADEMY_ID).getMedalCount(studentId),
  updateResult: (id: string, data: Partial<CompetitionResult>) => new CompetitionService(DEFAULT_ACADEMY_ID).updateResult(id, data),
  deleteResult: (id: string) => new CompetitionService(DEFAULT_ACADEMY_ID).deleteResult(id),
  getResultById: (id: string) => new CompetitionService(DEFAULT_ACADEMY_ID).getResultById(id),
};

export default competitionService;
