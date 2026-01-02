import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Attendance, AttendanceFilters } from '@/types';
import { startOfDay, endOfDay, format } from 'date-fns';
import { achievementService } from './achievementService';

const COLLECTION = 'attendance';

// Attendance milestones for achievements
const ATTENDANCE_MILESTONES = [50, 100, 200, 500, 1000];

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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
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

    const q = query(
      collection(db, COLLECTION),
      where('classId', '==', classId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToAttendance);
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
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limitCount).map(docToAttendance);
  },

  // ============================================
  // Get Attendance by Date Range
  // ============================================
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: AttendanceFilters
  ): Promise<Attendance[]> {
    const q = query(
      collection(db, COLLECTION),
      where('date', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('date', '<=', Timestamp.fromDate(endOfDay(endDate))),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(docToAttendance);

    // Apply additional filters in memory
    if (filters?.classId) {
      results = results.filter((a) => a.classId === filters.classId);
    }
    if (filters?.studentId) {
      results = results.filter((a) => a.studentId === filters.studentId);
    }

    return results;
  },

  // ============================================
  // Check if Student is Present
  // ============================================
  async isStudentPresent(studentId: string, classId: string, date: Date): Promise<boolean> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      where('classId', '==', classId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
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
    // Check if already marked
    const isPresent = await this.isStudentPresent(studentId, classId, date);
    if (isPresent) {
      throw new Error('Aluno já marcado como presente');
    }

    const docData = {
      studentId,
      studentName,
      classId,
      className,
      date: Timestamp.fromDate(date),
      verifiedBy,
      verifiedByName,
      notes,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION), docData);
    const newDoc = await getDoc(docRef);

    const attendance = docToAttendance(newDoc);

    // Check for attendance milestones (async, don't block)
    this.checkAttendanceMilestone(studentId, studentName, verifiedBy).catch(() => {
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
    const count = await this.getStudentAttendanceCount(studentId);

    // Check if current count matches any milestone
    if (ATTENDANCE_MILESTONES.includes(count)) {
      // Check if achievement already exists
      const existingAchievements = await achievementService.getByStudent(studentId);
      const alreadyHasMilestone = existingAchievements.some(
        (a) => a.type === 'milestone' && a.milestone === `${count}_presencas`
      );

      if (!alreadyHasMilestone) {
        await achievementService.createAttendanceMilestone(
          studentId,
          studentName,
          count,
          createdBy
        );
      }
    }
  },

  // ============================================
  // Remove Attendance (Unmark)
  // ============================================
  async unmarkPresent(studentId: string, classId: string, date: Date): Promise<void> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      where('classId', '==', classId),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Presença não encontrada');
    }

    // Delete all matches (should be only one)
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
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
          date
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
  // Get Student Attendance Count
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
