import {
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import { Checkin, CheckinStatus } from '@/types';
import { startOfDay, endOfDay, isSameDay } from 'date-fns';
import { createAttendanceService } from './attendanceService';

// ============================================
// Helper: Convert Firestore document to Checkin
// ============================================
const docToCheckin = (doc: DocumentSnapshot): Checkin => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    studentName: data.studentName,
    classId: data.classId,
    className: data.className,
    scheduleDate: data.scheduleDate instanceof Timestamp ? data.scheduleDate.toDate() : new Date(data.scheduleDate),
    scheduleDayOfWeek: data.scheduleDayOfWeek,
    scheduleStartTime: data.scheduleStartTime,
    scheduleEndTime: data.scheduleEndTime,
    checkinTime: data.checkinTime instanceof Timestamp ? data.checkinTime.toDate() : new Date(data.checkinTime),
    status: data.status as CheckinStatus,
    confirmedBy: data.confirmedBy,
    confirmedByName: data.confirmedByName,
    confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : data.confirmedAt ? new Date(data.confirmedAt) : undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : new Date(),
  };
};

// ============================================
// Helper: Check if current time is within check-in window
// Window: 30 min before class START until 1 hour after class END
// ============================================
export function isInCheckinWindow(
  schedule: { startTime: string; endTime: string },
  date: Date
): boolean {
  const now = new Date();
  if (!isSameDay(now, date)) return false;

  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);

  const windowStart = new Date(date);
  windowStart.setHours(startHour, startMin - 30, 0, 0); // 30 min before start

  const windowEnd = new Date(date);
  windowEnd.setHours(endHour, endMin + 60, 0, 0); // 1 hour after end

  return now >= windowStart && now <= windowEnd;
}

// ============================================
// Helper: Get time until check-in window opens
// ============================================
export function getTimeUntilCheckinOpens(
  schedule: { startTime: string },
  date: Date
): { hours: number; minutes: number } | null {
  const now = new Date();
  if (!isSameDay(now, date)) return null;

  const [startHour, startMin] = schedule.startTime.split(':').map(Number);

  const windowStart = new Date(date);
  windowStart.setHours(startHour, startMin - 30, 0, 0);

  if (now >= windowStart) return null; // Already open or passed

  const diffMs = windowStart.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  return { hours, minutes };
}

// ============================================
// Checkin Service (Multi-Tenant)
// ============================================
export class CheckinService {
  private academyId: string;
  private checkinRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.checkinRef = collections.checkins(academyId);
  }

  // ============================================
  // Create Check-in (Student)
  // ============================================
  async createCheckin(data: {
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    scheduleDayOfWeek: number;
  }): Promise<Checkin> {
    const now = new Date();

    // Normalize schedule date to noon to avoid timezone issues
    const scheduleDate = new Date(now);
    scheduleDate.setHours(12, 0, 0, 0);

    // Check if student already has a check-in for this class today
    const existingCheckin = await this.getStudentCheckin(
      data.studentId,
      data.classId,
      scheduleDate
    );
    if (existingCheckin) {
      throw new Error('Voce ja fez check-in para esta aula');
    }

    // Check if within check-in window
    const inWindow = isInCheckinWindow(
      { startTime: data.scheduleStartTime, endTime: data.scheduleEndTime },
      scheduleDate
    );
    if (!inWindow) {
      throw new Error('Fora do horario de check-in');
    }

    const docData = {
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      className: data.className,
      scheduleDate: Timestamp.fromDate(scheduleDate),
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleStartTime: data.scheduleStartTime,
      scheduleEndTime: data.scheduleEndTime,
      checkinTime: Timestamp.fromDate(now),
      status: 'pending' as CheckinStatus,
      createdAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(this.checkinRef, docData);

    return {
      id: docRef.id,
      ...data,
      scheduleDate,
      checkinTime: now,
      status: 'pending',
      createdAt: now,
    };
  }

  // ============================================
  // Get Pending Check-ins by Class and Date
  // ============================================
  async getPendingByClassAndDate(classId: string, date: Date): Promise<Checkin[]> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const q = query(
      this.checkinRef,
      where('classId', '==', classId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const checkins = snapshot.docs.map(docToCheckin);

    // Filter by date range in memory
    return checkins
      .filter(c => c.scheduleDate.getTime() >= start.getTime() && c.scheduleDate.getTime() <= end.getTime())
      .sort((a, b) => a.checkinTime.getTime() - b.checkinTime.getTime());
  }

  // ============================================
  // Check if Student has Check-in
  // ============================================
  async hasCheckin(studentId: string, classId: string, date: Date): Promise<boolean> {
    const checkin = await this.getStudentCheckin(studentId, classId, date);
    return checkin !== null;
  }

  // ============================================
  // Get Student Check-in
  // ============================================
  async getStudentCheckin(studentId: string, classId: string, date: Date): Promise<Checkin | null> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const q = query(
      this.checkinRef,
      where('studentId', '==', studentId),
      where('classId', '==', classId)
    );

    const snapshot = await getDocs(q);
    const checkins = snapshot.docs.map(docToCheckin);

    // Filter by date in memory
    const todayCheckin = checkins.find(
      c => c.scheduleDate.getTime() >= start.getTime() && c.scheduleDate.getTime() <= end.getTime()
    );

    return todayCheckin || null;
  }

  // ============================================
  // Remove Check-in
  // ============================================
  async removeCheckin(checkinId: string): Promise<void> {
    const docRef = collections.checkin(this.academyId, checkinId);
    await deleteDoc(docRef);
  }

  // ============================================
  // Add Manual Check-in (Admin)
  // ============================================
  async addManualCheckin(data: {
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    scheduleDayOfWeek: number;
    date: Date;
  }): Promise<Checkin> {
    const now = new Date();

    // Normalize schedule date to noon
    const scheduleDate = new Date(data.date);
    scheduleDate.setHours(12, 0, 0, 0);

    // Check if student already has a check-in for this class on this date
    const existingCheckin = await this.getStudentCheckin(
      data.studentId,
      data.classId,
      scheduleDate
    );
    if (existingCheckin) {
      throw new Error('Aluno ja possui check-in para esta aula');
    }

    const docData = {
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      className: data.className,
      scheduleDate: Timestamp.fromDate(scheduleDate),
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleStartTime: data.scheduleStartTime,
      scheduleEndTime: data.scheduleEndTime,
      checkinTime: Timestamp.fromDate(now),
      status: 'pending' as CheckinStatus,
      createdAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(this.checkinRef, docData);

    return {
      id: docRef.id,
      studentId: data.studentId,
      studentName: data.studentName,
      classId: data.classId,
      className: data.className,
      scheduleDate,
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleStartTime: data.scheduleStartTime,
      scheduleEndTime: data.scheduleEndTime,
      checkinTime: now,
      status: 'pending',
      createdAt: now,
    };
  }

  // ============================================
  // Confirm Check-ins (Convert to Attendance)
  // ============================================
  async confirmCheckins(
    checkinIds: string[],
    confirmedBy: string,
    confirmedByName: string
  ): Promise<{ success: number; failed: number }> {
    const attendanceService = createAttendanceService(this.academyId);
    let success = 0;
    let failed = 0;

    for (const checkinId of checkinIds) {
      try {
        // Get the check-in
        const docRef = collections.checkin(this.academyId, checkinId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          failed++;
          continue;
        }

        const checkin = docToCheckin(docSnap);

        // Create attendance record
        await attendanceService.markPresent(
          checkin.studentId,
          checkin.studentName,
          checkin.classId,
          checkin.className,
          confirmedBy,
          confirmedByName,
          checkin.scheduleDate
        );

        // Delete the check-in (or update status to 'confirmed')
        await deleteDoc(docRef);

        success++;
      } catch {
        // Student might already be marked present, skip
        failed++;
      }
    }

    return { success, failed };
  }

  // ============================================
  // Count Pending Check-ins for Class/Date
  // ============================================
  async countPendingCheckins(classId: string, date: Date): Promise<number> {
    const checkins = await this.getPendingByClassAndDate(classId, date);
    return checkins.length;
  }

  // ============================================
  // Get All Pending Check-ins for Student
  // ============================================
  async getStudentPendingCheckins(studentId: string): Promise<Checkin[]> {
    const q = query(
      this.checkinRef,
      where('studentId', '==', studentId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToCheckin).sort((a, b) => b.checkinTime.getTime() - a.checkinTime.getTime());
  }
}

// ============================================
// Factory Function
// ============================================
export function createCheckinService(academyId: string): CheckinService {
  return new CheckinService(academyId);
}

export default CheckinService;
