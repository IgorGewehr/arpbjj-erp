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
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  writeBatch,
} from 'firebase/firestore';
import { db, collections } from '@/lib/firebase';
import { removeUndefinedDeep } from '@/lib/firestoreUtils';
import { Student, StudentFilters, Pagination, PaginatedResponse } from '@/types';

// ============================================
// Helper: Convert Firestore document to Student
// ============================================
const docToStudent = (doc: DocumentSnapshot): Student => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  // Convert beltHistory dates
  const beltHistory = data.beltHistory?.map((entry: { belt: string; stripes: number; date: Timestamp | Date; notes?: string }) => ({
    ...entry,
    date: entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date),
  }));

  return {
    id: doc.id,
    fullName: data.fullName,
    nickname: data.nickname,
    birthDate: data.birthDate instanceof Timestamp ? data.birthDate.toDate() : data.birthDate ? new Date(data.birthDate) : undefined,
    cpf: data.cpf,
    rg: data.rg,
    phone: data.phone,
    email: data.email,
    photoUrl: data.photoUrl,
    address: data.address,
    guardian: data.guardian,
    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
    jiujitsuStartDate: data.jiujitsuStartDate instanceof Timestamp
      ? data.jiujitsuStartDate.toDate()
      : data.jiujitsuStartDate
        ? new Date(data.jiujitsuStartDate)
        : undefined,
    currentBelt: data.currentBelt,
    currentStripes: data.currentStripes,
    category: data.category,
    teamId: data.teamId,
    weight: data.weight,
    beltHistory,
    initialAttendanceCount: data.initialAttendanceCount,
    attendanceCount: data.attendanceCount,
    planId: data.planId,
    status: data.status,
    statusNote: data.statusNote,
    tuitionValue: data.tuitionValue,
    tuitionDay: data.tuitionDay,
    medicalCertificateUrl: data.medicalCertificateUrl,
    medicalCertificateExpiry: data.medicalCertificateExpiry instanceof Timestamp
      ? data.medicalCertificateExpiry.toDate()
      : data.medicalCertificateExpiry
        ? new Date(data.medicalCertificateExpiry)
        : undefined,
    healthNotes: data.healthNotes,
    bloodType: data.bloodType,
    allergies: data.allergies,
    emergencyContact: data.emergencyContact,
    isProfilePublic: data.isProfilePublic ?? false,
    linkedUserId: data.linkedUserId,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Helper: Convert Student to Firestore format
// ============================================
const studentToDoc = (student: Partial<Student>): Record<string, unknown> => {
  const data: Record<string, unknown> = { ...student };

  // Convert dates to Timestamps
  if (student.birthDate) {
    data.birthDate = Timestamp.fromDate(new Date(student.birthDate));
  }
  if (student.startDate) {
    data.startDate = Timestamp.fromDate(new Date(student.startDate));
  }
  if (student.jiujitsuStartDate) {
    data.jiujitsuStartDate = Timestamp.fromDate(new Date(student.jiujitsuStartDate));
  }
  if (student.medicalCertificateExpiry) {
    data.medicalCertificateExpiry = Timestamp.fromDate(new Date(student.medicalCertificateExpiry));
  }

  // Convert beltHistory dates to Timestamps
  if (student.beltHistory && student.beltHistory.length > 0) {
    data.beltHistory = student.beltHistory.map(entry => ({
      ...entry,
      date: Timestamp.fromDate(new Date(entry.date)),
    }));
  }

  // Remove id from data (it's the document ID)
  delete data.id;

  // Remove undefined values deeply (Firebase doesn't accept undefined at any level)
  return removeUndefinedDeep(data);
};

// ============================================
// Student Service Class (Multi-Tenant)
// ============================================
class StudentService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get studentsRef() {
    return collections.students(this.academyId);
  }

  private get attendanceRef() {
    return collections.attendance(this.academyId);
  }

  // ============================================
  // List Students with Infinite Scroll Support
  // Sorted by total attendance (attendanceCount + initialAttendanceCount)
  // ============================================
  async listAll(
    filters: StudentFilters = {},
    pageSize = 30,
    lastStudentId?: string
  ): Promise<PaginatedResponse<Student> & { hasMore: boolean; lastId?: string }> {
    // Build filter constraints
    const filterConstraints: QueryConstraint[] = [];

    if (filters.status) {
      filterConstraints.push(where('status', '==', filters.status));
    }
    if (filters.category) {
      filterConstraints.push(where('category', '==', filters.category));
    }
    if (filters.belt) {
      filterConstraints.push(where('currentBelt', '==', filters.belt));
    }

    // Query with filters only (no limit) - we need all to sort by computed field
    const q = query(this.studentsRef, ...filterConstraints);
    const snapshot = await getDocs(q);

    const students = snapshot.docs.map(docToStudent);

    // Sort by total attendance count (descending) - most active first
    students.sort((a, b) => {
      const totalA = (a.attendanceCount || 0) + (a.initialAttendanceCount || 0);
      const totalB = (b.attendanceCount || 0) + (b.initialAttendanceCount || 0);
      if (totalB !== totalA) return totalB - totalA;
      // Secondary sort by name for consistency
      return a.fullName.localeCompare(b.fullName);
    });

    const total = students.length;

    // If we have a cursor, find the position and slice from there
    let startIndex = 0;
    if (lastStudentId) {
      const cursorIndex = students.findIndex(s => s.id === lastStudentId);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    // Get the page of students
    const pageStudents = students.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < total;
    const lastId = pageStudents.length > 0 ? pageStudents[pageStudents.length - 1].id : undefined;

    const pagination: Pagination = {
      page: Math.floor(startIndex / pageSize) + 1,
      perPage: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };

    return {
      data: pageStudents,
      pagination,
      success: true,
      hasMore,
      lastId,
    };
  }

  // ============================================
  // Search Students by Name (Direct database query)
  // ============================================
  async searchByName(searchTerm: string, filters: StudentFilters = {}): Promise<Student[]> {
    // Build filter constraints
    const filterConstraints: QueryConstraint[] = [];

    if (filters.status) {
      filterConstraints.push(where('status', '==', filters.status));
    }
    if (filters.category) {
      filterConstraints.push(where('category', '==', filters.category));
    }
    if (filters.belt) {
      filterConstraints.push(where('currentBelt', '==', filters.belt));
    }

    // Fetch all filtered students and search in memory
    // (Firestore doesn't support case-insensitive contains search)
    const q = query(this.studentsRef, ...filterConstraints);
    const snapshot = await getDocs(q);

    const students = snapshot.docs.map(docToStudent);
    const term = searchTerm.toLowerCase().trim();

    // Filter by name match
    const matches = students.filter(s =>
      s.fullName.toLowerCase().includes(term) ||
      s.nickname?.toLowerCase().includes(term)
    );

    // Sort by total attendance
    matches.sort((a, b) => {
      const totalA = (a.attendanceCount || 0) + (a.initialAttendanceCount || 0);
      const totalB = (b.attendanceCount || 0) + (b.initialAttendanceCount || 0);
      if (totalB !== totalA) return totalB - totalA;
      return a.fullName.localeCompare(b.fullName);
    });

    return matches;
  }

  // ============================================
  // List Students with Pagination and Filters
  // ============================================
  async list(
    filters: StudentFilters = {},
    page = 1,
    perPage = 50,
    lastDoc?: DocumentSnapshot
  ): Promise<PaginatedResponse<Student>> {
    // Build filter constraints (without orderBy to avoid composite index)
    const filterConstraints: QueryConstraint[] = [];

    if (filters.status) {
      filterConstraints.push(where('status', '==', filters.status));
    }
    if (filters.category) {
      filterConstraints.push(where('category', '==', filters.category));
    }
    if (filters.belt) {
      filterConstraints.push(where('currentBelt', '==', filters.belt));
    }

    // Build pagination constraints
    const paginationConstraints: QueryConstraint[] = [limit(perPage)];
    if (lastDoc) {
      paginationConstraints.push(startAfter(lastDoc));
    }

    // Query with filters + pagination
    const q = query(this.studentsRef, ...filterConstraints, ...paginationConstraints);
    const snapshot = await getDocs(q);

    const students = snapshot.docs.map(docToStudent);
    // Sort client-side to avoid Firestore composite index requirement
    students.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Get total count (only filter constraints, no pagination)
    const totalQuery = query(this.studentsRef, ...filterConstraints);
    const totalSnapshot = await getDocs(totalQuery);

    const pagination: Pagination = {
      page,
      perPage,
      total: totalSnapshot.size,
      totalPages: Math.ceil(totalSnapshot.size / perPage),
    };

    return {
      data: students,
      pagination,
      success: true,
    };
  }

  // ============================================
  // Get Student by ID
  // ============================================
  async getById(id: string): Promise<Student | null> {
    const docRef = collections.student(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToStudent(docSnap);
  }

  // ============================================
  // Get Students by Status
  // ============================================
  async getByStatus(status: Student['status']): Promise<Student[]> {
    const q = query(
      this.studentsRef,
      where('status', '==', status)
    );

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(docToStudent);
    // Sort client-side to avoid Firestore composite index requirement
    return students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Get Active Students
  // ============================================
  async getActive(): Promise<Student[]> {
    return this.getByStatus('active');
  }

  // ============================================
  // Get Student by Linked User ID
  // ============================================
  async getByLinkedUserId(userId: string): Promise<Student | null> {
    const q = query(
      this.studentsRef,
      where('linkedUserId', '==', userId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    return docToStudent(snapshot.docs[0]);
  }

  // ============================================
  // Get All Students (for reports)
  // ============================================
  async getAll(): Promise<Student[]> {
    const q = query(this.studentsRef);
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(docToStudent);
    return students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Search Students by Name
  // ============================================
  async search(searchTerm: string): Promise<Student[]> {
    const q = query(
      this.studentsRef,
      where('fullName', '>=', searchTerm),
      where('fullName', '<=', searchTerm + '\uf8ff'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToStudent);
  }

  // ============================================
  // Create Student
  // ============================================
  async create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string = 'system'): Promise<Student> {
    const now = serverTimestamp();

    const docData = {
      ...studentToDoc(student),
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(this.studentsRef, docData);
    const newDoc = await getDoc(docRef);

    return docToStudent(newDoc);
  }

  // ============================================
  // Update Student
  // ============================================
  async update(id: string, data: Partial<Student>): Promise<Student> {
    const docRef = collections.student(this.academyId, id);

    const updateData = {
      ...studentToDoc(data),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return docToStudent(updatedDoc);
  }

  // ============================================
  // Delete Student (Soft delete - set status to inactive)
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = collections.student(this.academyId, id);
    await updateDoc(docRef, {
      status: 'inactive',
      updatedAt: serverTimestamp(),
    });
  }

  // ============================================
  // Hard Delete Student
  // ============================================
  async hardDelete(id: string): Promise<void> {
    const docRef = collections.student(this.academyId, id);
    await deleteDoc(docRef);
  }

  // ============================================
  // Quick Create (Minimal data)
  // ============================================
  async quickCreate(
    fullName: string,
    phone: string,
    createdBy: string
  ): Promise<Student> {
    const now = serverTimestamp();

    const docData = {
      fullName,
      phone,
      status: 'active',
      currentBelt: 'white',
      currentStripes: 0,
      category: 'adult',
      tuitionValue: 0,
      tuitionDay: 10,
      startDate: Timestamp.now(),
      isProfilePublic: false,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(this.studentsRef, docData);
    const newDoc = await getDoc(docRef);

    return docToStudent(newDoc);
  }

  // ============================================
  // Get Students by Belt
  // ============================================
  async getByBelt(belt: Student['currentBelt']): Promise<Student[]> {
    const q = query(
      this.studentsRef,
      where('currentBelt', '==', belt),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(docToStudent);
    // Sort client-side to avoid Firestore composite index requirement
    return students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Get Students by Category
  // ============================================
  async getByCategory(category: Student['category']): Promise<Student[]> {
    const q = query(
      this.studentsRef,
      where('category', '==', category),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(docToStudent);
    // Sort client-side to avoid Firestore composite index requirement
    return students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Get Students Count by Status
  // ============================================
  async getCountByStatus(): Promise<Record<Student['status'], number>> {
    const statuses: Student['status'][] = ['active', 'injured', 'inactive', 'suspended'];
    const counts: Record<Student['status'], number> = {
      active: 0,
      injured: 0,
      inactive: 0,
      suspended: 0,
    };

    for (const status of statuses) {
      const q = query(this.studentsRef, where('status', '==', status));
      const snapshot = await getDocs(q);
      counts[status] = snapshot.size;
    }

    return counts;
  }

  // ============================================
  // Get Dashboard Stats (Single query, optimized)
  // ============================================
  async getDashboardStats(): Promise<{
    total: number;
    byStatus: { active: number; injured: number; inactive: number; suspended: number };
    byCategory: { kids: number; adult: number };
  }> {
    const snapshot = await getDocs(this.studentsRef);

    const stats = {
      total: 0,
      byStatus: { active: 0, injured: 0, inactive: 0, suspended: 0 } as Record<string, number>,
      byCategory: { kids: 0, adult: 0 } as Record<string, number>,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      // Count by status
      const status = data.status as string;
      if (status && stats.byStatus[status] !== undefined) {
        stats.byStatus[status]++;
      }

      // Count by category
      const category = data.category as string;
      if (category && stats.byCategory[category] !== undefined) {
        stats.byCategory[category]++;
      }
    });

    return stats as {
      total: number;
      byStatus: { active: number; injured: number; inactive: number; suspended: number };
      byCategory: { kids: number; adult: number };
    };
  }

  // ============================================
  // Update Belt/Stripes
  // ============================================
  async updateBelt(
    id: string,
    newBelt: Student['currentBelt'],
    newStripes: Student['currentStripes']
  ): Promise<Student> {
    return this.update(id, {
      currentBelt: newBelt,
      currentStripes: newStripes,
    });
  }

  // ============================================
  // Sync Attendance Counts for all students
  // (Run once to populate attendanceCount field for existing students)
  // ============================================
  async syncAttendanceCounts(): Promise<{ updated: number; errors: number }> {
    const result = { updated: 0, errors: 0 };

    // Get all students
    const studentsSnapshot = await getDocs(this.studentsRef);

    // Get all attendance records
    const attendanceSnapshot = await getDocs(this.attendanceRef);

    // Count attendance per student
    const countByStudent: Record<string, number> = {};
    attendanceSnapshot.docs.forEach(doc => {
      const studentId = doc.data().studentId;
      countByStudent[studentId] = (countByStudent[studentId] || 0) + 1;
    });

    // Update each student with their count
    const BATCH_SIZE = 500;
    const students = studentsSnapshot.docs;

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchStudents = students.slice(i, i + BATCH_SIZE);

      batchStudents.forEach(studentDoc => {
        const count = countByStudent[studentDoc.id] || 0;
        batch.update(studentDoc.ref, { attendanceCount: count });
      });

      try {
        await batch.commit();
        result.updated += batchStudents.length;
      } catch {
        result.errors += batchStudents.length;
      }
    }

    return result;
  }
}

// ============================================
// Factory Function
// ============================================
export function createStudentService(academyId: string): StudentService {
  return new StudentService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility during migration)
// Uses a default academy ID that should be set via environment or context
// ============================================
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

export const studentService = {
  listAll: (...args: Parameters<StudentService['listAll']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).listAll(...args),
  searchByName: (...args: Parameters<StudentService['searchByName']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).searchByName(...args),
  list: (...args: Parameters<StudentService['list']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).list(...args),
  getById: (...args: Parameters<StudentService['getById']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).getById(...args),
  getByStatus: (...args: Parameters<StudentService['getByStatus']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).getByStatus(...args),
  getActive: () => new StudentService(DEFAULT_ACADEMY_ID).getActive(),
  getByLinkedUserId: (...args: Parameters<StudentService['getByLinkedUserId']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).getByLinkedUserId(...args),
  getAll: () => new StudentService(DEFAULT_ACADEMY_ID).getAll(),
  search: (...args: Parameters<StudentService['search']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).search(...args),
  create: (...args: Parameters<StudentService['create']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).create(...args),
  update: (...args: Parameters<StudentService['update']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).update(...args),
  delete: (...args: Parameters<StudentService['delete']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).delete(...args),
  hardDelete: (...args: Parameters<StudentService['hardDelete']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).hardDelete(...args),
  quickCreate: (...args: Parameters<StudentService['quickCreate']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).quickCreate(...args),
  getByBelt: (...args: Parameters<StudentService['getByBelt']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).getByBelt(...args),
  getByCategory: (...args: Parameters<StudentService['getByCategory']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).getByCategory(...args),
  getCountByStatus: () => new StudentService(DEFAULT_ACADEMY_ID).getCountByStatus(),
  getDashboardStats: () => new StudentService(DEFAULT_ACADEMY_ID).getDashboardStats(),
  updateBelt: (...args: Parameters<StudentService['updateBelt']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).updateBelt(...args),
  syncAttendanceCounts: () => new StudentService(DEFAULT_ACADEMY_ID).syncAttendanceCounts(),
};

export default studentService;
