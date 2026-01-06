import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  writeBatch,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Attendance, AttendanceFilters } from '@/types';
import { startOfDay, endOfDay, format, differenceInYears, addYears } from 'date-fns';
import { achievementService } from './achievementService';
import { studentService } from './studentService';

const COLLECTION = 'attendance';

// Attendance milestones for achievements
const ATTENDANCE_MILESTONES = [50, 100, 200, 500, 1000];

// Anniversary milestones (years of training)
const ANNIVERSARY_MILESTONES = [1, 2, 3, 5, 10];

// ============================================
// Helper: Convert Firestore document to Attendance
// ============================================
const docToAttendance = (doc: DocumentSnapshot): Attendance => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    classId: data.classId,
    className: data.className,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    verifiedBy: data.verifiedBy,
    verifiedByName: data.verifiedByName,
    notes: data.notes,
    // createdAt might not be set immediately when using serverTimestamp()
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt
        ? new Date(data.createdAt)
        : new Date(),
  };
};

// ============================================
// Attendance Service
// ============================================
export const attendanceService = {
  // ============================================
  // Get Attendance by Date and Class
  // ============================================
  async getByDateAndClass(date: Date, classId: string): Promise<Attendance[]> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    // Query by classId first, then filter by date in memory
    // This avoids needing a composite index
    const q = query(
      collection(db, COLLECTION),
      where('classId', '==', classId)
    );

    const snapshot = await getDocs(q);
    const allAttendance = snapshot.docs.map(docToAttendance);

    // Filter by date range using getTime() for robust comparison
    return allAttendance
      .filter(a => a.date.getTime() >= start.getTime() && a.date.getTime() <= end.getTime())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Get Today's Attendance for a Class
  // ============================================
  async getTodayByClass(classId: string): Promise<Attendance[]> {
    return this.getByDateAndClass(new Date(), classId);
  },

  // ============================================
  // Get Attendance by Student
  // ============================================
  async getByStudent(studentId: string, limitCount = 50): Promise<Attendance[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const attendance = snapshot.docs.map(docToAttendance);
    // Sort client-side and limit
    return attendance
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limitCount);
  },

  // ============================================
  // Get Attendance by Date Range
  // ============================================
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: AttendanceFilters
  ): Promise<Attendance[]> {
    // Fetch all attendance and filter in memory to avoid composite index
    const snapshot = await getDocs(collection(db, COLLECTION));
    let results = snapshot.docs.map(docToAttendance);

    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Filter by date range using getTime() for robust comparison
    results = results.filter(a => a.date.getTime() >= start.getTime() && a.date.getTime() <= end.getTime());

    // Apply additional filters in memory
    if (filters?.classId) {
      results = results.filter((a) => a.classId === filters.classId);
    }
    if (filters?.studentId) {
      results = results.filter((a) => a.studentId === filters.studentId);
    }

    // Sort by date descending
    return results.sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // ============================================
  // Check if Student is Present
  // ============================================
  async isStudentPresent(studentId: string, classId: string, date: Date): Promise<boolean> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    // Query by studentId only and filter in memory to avoid composite index
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const attendance = snapshot.docs.map(docToAttendance);

    // Filter by classId and date in memory using getTime() for robust comparison
    return attendance.some(
      a => a.classId === classId &&
           a.date.getTime() >= start.getTime() &&
           a.date.getTime() <= end.getTime()
    );
  },

  // ============================================
  // Get Present Students for a Class Today
  // ============================================
  async getPresentStudentIds(classId: string, date: Date = new Date()): Promise<Set<string>> {
    const attendance = await this.getByDateAndClass(date, classId);
    return new Set(attendance.map((a) => a.studentId));
  },

  // ============================================
  // Mark Attendance (Single Student)
  // ============================================
  async markPresent(
    studentId: string,
    studentName: string,
    classId: string,
    className: string,
    verifiedBy: string,
    verifiedByName: string,
    date: Date = new Date(),
    notes?: string
  ): Promise<Attendance> {
    // Normalize date to noon to avoid timezone issues
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);

    // Check if already marked
    const isPresent = await this.isStudentPresent(studentId, classId, normalizedDate);
    if (isPresent) {
      throw new Error('Aluno já marcado como presente');
    }

    const now = new Date();
    const docData: Record<string, unknown> = {
      studentId,
      studentName,
      classId,
      className,
      date: Timestamp.fromDate(normalizedDate),
      verifiedBy,
      verifiedByName,
      createdAt: Timestamp.fromDate(now),
    };

    // Only add notes if it has a value (Firestore doesn't accept undefined)
    if (notes) {
      docData.notes = notes;
    }

    const docRef = await addDoc(collection(db, COLLECTION), docData);

    // Increment the student's attendanceCount (async, don't block main flow)
    const studentDocRef = doc(db, 'students', studentId);
    updateDoc(studentDocRef, {
      attendanceCount: increment(1),
    }).catch(() => {
      // Silently ignore errors - don't break attendance flow
    });

    // Return the attendance object directly without re-fetching
    const attendance: Attendance = {
      id: docRef.id,
      studentId,
      studentName,
      classId,
      className,
      date: normalizedDate,
      verifiedBy,
      verifiedByName,
      notes,
      createdAt: now,
    };

    // Check for attendance milestones (async, don't block)
    this.checkAttendanceMilestone(studentId, studentName, verifiedBy).catch(() => {
      // Silently ignore errors - don't break attendance flow
    });

    // Check for anniversary milestones (async, don't block)
    this.checkAnniversaryMilestone(studentId, studentName, verifiedBy).catch(() => {
      // Silently ignore errors - don't break attendance flow
    });

    return attendance;
  },

  // ============================================
  // Check Attendance Milestone
  // ============================================
  async checkAttendanceMilestone(
    studentId: string,
    studentName: string,
    createdBy: string
  ): Promise<void> {
    // Get system attendance count
    const systemCount = await this.getStudentAttendanceCount(studentId);

    // Get student to access initialAttendanceCount (previous trainings)
    const student = await studentService.getById(studentId);
    const initialCount = student?.initialAttendanceCount || 0;

    // Total count = system + previous trainings
    const totalCount = systemCount + initialCount;

    // Check if current total matches any milestone
    if (ATTENDANCE_MILESTONES.includes(totalCount)) {
      // Check if achievement already exists
      const existingAchievements = await achievementService.getByStudent(studentId);
      const alreadyHasMilestone = existingAchievements.some(
        (a) => a.type === 'milestone' && a.milestone === `${totalCount}_presencas`
      );

      if (!alreadyHasMilestone) {
        await achievementService.createAttendanceMilestone(
          studentId,
          studentName,
          totalCount,
          createdBy
        );
      }
    }
  },

  // ============================================
  // Check Anniversary Milestone
  // ============================================
  async checkAnniversaryMilestone(
    studentId: string,
    studentName: string,
    createdBy: string
  ): Promise<void> {
    // Get student to access startDate
    const student = await studentService.getById(studentId);
    if (!student?.startDate) return;

    const startDate = new Date(student.startDate);
    const yearsTraining = differenceInYears(new Date(), startDate);

    // Check if current years matches any anniversary milestone
    if (ANNIVERSARY_MILESTONES.includes(yearsTraining)) {
      // Check if achievement already exists
      const existingAchievements = await achievementService.getByStudent(studentId);
      const alreadyHasMilestone = existingAchievements.some(
        (a) => a.type === 'milestone' && a.milestone === `${yearsTraining}_anos_treino`
      );

      if (!alreadyHasMilestone) {
        // Calculate the actual anniversary date (startDate + years of training)
        const anniversaryDate = addYears(startDate, yearsTraining);

        await achievementService.createAnniversaryMilestone(
          studentId,
          studentName,
          yearsTraining,
          anniversaryDate,
          createdBy
        );
      }
    }
  },

  // ============================================
  // Remove Attendance (Unmark)
  // ============================================
  async unmarkPresent(studentId: string, classId: string, date: Date): Promise<void> {
    // Normalize date for consistent comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);
    const start = startOfDay(normalizedDate);
    const end = endOfDay(normalizedDate);

    // Query by studentId only and filter in memory to avoid composite index
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);

    // Filter by classId and date in memory using getTime() for robust comparison
    const matchingDocs = snapshot.docs.filter(doc => {
      const data = doc.data();
      const docDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
      return data.classId === classId &&
             docDate.getTime() >= start.getTime() &&
             docDate.getTime() <= end.getTime();
    });

    if (matchingDocs.length === 0) {
      throw new Error('Presença não encontrada');
    }

    // Delete all matches (should be only one)
    const batch = writeBatch(db);
    matchingDocs.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });

    await batch.commit();

    // Decrement the student's attendanceCount (async, don't block main flow)
    const studentDocRef = doc(db, 'students', studentId);
    updateDoc(studentDocRef, {
      attendanceCount: increment(-matchingDocs.length),
    }).catch(() => {
      // Silently ignore errors
    });
  },

  // ============================================
  // Bulk Mark Attendance
  // ============================================
  async bulkMarkPresent(
    students: Array<{ id: string; name: string }>,
    classId: string,
    className: string,
    verifiedBy: string,
    verifiedByName: string,
    date: Date = new Date()
  ): Promise<Attendance[]> {
    // Normalize date for consistency
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);

    const results: Attendance[] = [];

    for (const student of students) {
      try {
        const attendance = await this.markPresent(
          student.id,
          student.name,
          classId,
          className,
          verifiedBy,
          verifiedByName,
          normalizedDate
        );
        results.push(attendance);
      } catch {
        // Student already marked, skip
        continue;
      }
    }

    return results;
  },

  // ============================================
  // Get Student Attendance Count (system only, without initial)
  // ============================================
  async getStudentAttendanceCount(studentId: string): Promise<number> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // ============================================
  // Get Total Student Attendance Count (including initial)
  // ============================================
  async getTotalStudentAttendanceCount(studentId: string, initialCount: number = 0): Promise<number> {
    const systemCount = await this.getStudentAttendanceCount(studentId);
    return systemCount + initialCount;
  },

  // ============================================
  // Get Monthly Attendance Stats
  // ============================================
  async getMonthlyStats(month: string): Promise<{
    totalClasses: number;
    uniqueStudents: number;
    attendanceByDay: Record<string, number>;
  }> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const attendance = await this.getByDateRange(startDate, endDate);

    const uniqueStudents = new Set(attendance.map((a) => a.studentId)).size;

    const attendanceByDay: Record<string, number> = {};
    attendance.forEach((a) => {
      const day = format(a.date, 'yyyy-MM-dd');
      attendanceByDay[day] = (attendanceByDay[day] || 0) + 1;
    });

    return {
      totalClasses: Object.keys(attendanceByDay).length,
      uniqueStudents,
      attendanceByDay,
    };
  },

  // ============================================
  // Get Today's Total Attendance
  // ============================================
  async getTodayTotal(): Promise<number> {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const q = query(
      collection(db, COLLECTION),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  // ============================================
  // Get Attendance Rate for Student
  // ============================================
  async getStudentAttendanceRate(
    studentId: string,
    startDate: Date,
    totalPossibleClasses: number
  ): Promise<number> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      where('date', '>=', Timestamp.fromDate(startDate))
    );

    const snapshot = await getDocs(q);
    const attended = snapshot.size;

    if (totalPossibleClasses === 0) return 0;
    return (attended / totalPossibleClasses) * 100;
  },

  // ============================================
  // Delete Attendance by ID
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },
};

export default attendanceService;
