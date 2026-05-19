import { api } from '@/lib/api/client';
import { Checkin, CheckinStatus } from '@/types';
import { isSameDay, format } from 'date-fns';
import { createAttendanceService } from './attendanceService';

// ============================================
// Go API response shapes
// ============================================
interface QrTokenDTO {
  token: string;
  expires_at: string;
}

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
//
// In the Go backend the "checkin" concept is modelled as attendance records
// plus QR-token-based self-check-in. There is no separate checkins collection.
//
// Mapping:
//   createCheckin / selfCheckin  → POST /attendance/self-checkin
//   confirmCheckins               → POST /attendance  (mark each as attendance)
//   issueQrToken (new)            → POST /classes/{classId}/qr-tokens
//
// Methods that depended on a Firestore checkin collection
// (getPendingByClassAndDate, getStudentCheckin, etc.) now delegate to the
// attendance service since confirmed records are stored there directly.
// ============================================
export class CheckinService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  // ============================================
  // Issue QR Token for a Class (Admin)
  // Mints a short-lived HMAC token that students scan.
  // ============================================
  async issueQrToken(classId: string): Promise<QrTokenDTO> {
    return api.post<QrTokenDTO>(
      `/v1/academies/${this.academyId}/classes/${classId}/qr-tokens`
    );
  }

  // ============================================
  // Self Check-in via QR Token (Student)
  // The student scans the QR and the token is submitted here.
  // Returns the resulting attendance record.
  // ============================================
  async selfCheckin(qrToken: string, classId?: string): Promise<Checkin> {
    const body: Record<string, unknown> = { qr_token: qrToken };
    if (classId) body.class_id = classId;

    const att = await api.post<{
      id: string;
      student_id: string;
      class_id: string;
      date: string;
      verified_by_uid: string;
      created_at: string;
    }>(`/v1/academies/${this.academyId}/attendance/self-checkin`, body);

    const now = new Date();
    // Map attendance record to Checkin shape for backwards compatibility
    const checkin: Checkin = {
      id: att.id,
      studentId: att.student_id,
      studentName: '',
      classId: att.class_id,
      className: '',
      scheduleDate: new Date(att.date),
      scheduleDayOfWeek: new Date(att.date).getDay(),
      scheduleStartTime: '',
      scheduleEndTime: '',
      checkinTime: now,
      status: 'confirmed' as CheckinStatus,
      createdAt: new Date(att.created_at),
    };
    return checkin;
  }

  // ============================================
  // Create Check-in (Student) — delegates to self-checkin flow
  // This method is kept for backwards compatibility with components that
  // call it directly. It requires a QR token in practice; if none is
  // available it falls back to direct attendance marking.
  // ============================================
  async createCheckin(data: {
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    scheduleDayOfWeek: number;
    qrToken?: string;
  }): Promise<Checkin> {
    const now = new Date();
    const scheduleDate = new Date(now);
    scheduleDate.setHours(12, 0, 0, 0);

    // Check if within check-in window
    const inWindow = isInCheckinWindow(
      { startTime: data.scheduleStartTime, endTime: data.scheduleEndTime },
      scheduleDate
    );
    if (!inWindow) {
      throw new Error('Fora do horario de check-in');
    }

    if (data.qrToken) {
      return this.selfCheckin(data.qrToken, data.classId);
    }

    // No QR token: mark attendance directly
    const attendanceService = createAttendanceService(this.academyId);
    const att = await attendanceService.markPresent(
      data.studentId,
      data.studentName,
      data.classId,
      data.className,
      data.studentId, // verifiedBy (self)
      data.studentName,
      scheduleDate
    );

    return {
      id: att.id,
      studentId: att.studentId,
      studentName: data.studentName,
      classId: att.classId,
      className: data.className,
      scheduleDate,
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleStartTime: data.scheduleStartTime,
      scheduleEndTime: data.scheduleEndTime,
      checkinTime: now,
      status: 'confirmed' as CheckinStatus,
      createdAt: att.createdAt,
    };
  }

  // ============================================
  // Get Pending Check-ins by Class and Date
  // In the Go model all attendance is immediately "confirmed".
  // Returns attendance records for the date/class as pending-like items.
  // ============================================
  async getPendingByClassAndDate(classId: string, date: Date): Promise<Checkin[]> {
    const attendanceService = createAttendanceService(this.academyId);
    const records = await attendanceService.getByDateAndClass(date, classId);
    return records.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName ?? '',
      classId: a.classId,
      className: a.className ?? '',
      scheduleDate: a.date,
      scheduleDayOfWeek: a.date.getDay(),
      scheduleStartTime: '',
      scheduleEndTime: '',
      checkinTime: a.createdAt,
      status: 'confirmed' as CheckinStatus,
      createdAt: a.createdAt,
    }));
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
    const attendanceService = createAttendanceService(this.academyId);
    const dateStr = format(date, 'yyyy-MM-dd');
    const records = await attendanceService.getByDateRange(date, date, { studentId, classId });
    if (records.length === 0) return null;
    const a = records[0];
    return {
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName ?? '',
      classId: a.classId,
      className: a.className ?? '',
      scheduleDate: a.date,
      scheduleDayOfWeek: a.date.getDay(),
      scheduleStartTime: '',
      scheduleEndTime: '',
      checkinTime: a.createdAt,
      status: 'confirmed' as CheckinStatus,
      createdAt: a.createdAt,
    };
  }

  // ============================================
  // Remove Check-in (delegates to unmark attendance)
  // In the Go model, "removing a checkin" means deleting the attendance row.
  // ============================================
  async removeCheckin(checkinId: string): Promise<void> {
    await api.delete(`/v1/academies/${this.academyId}/attendance/${checkinId}`);
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
    const scheduleDate = new Date(data.date);
    scheduleDate.setHours(12, 0, 0, 0);

    const attendanceService = createAttendanceService(this.academyId);
    const att = await attendanceService.markPresent(
      data.studentId,
      data.studentName,
      data.classId,
      data.className,
      data.studentId,
      data.studentName,
      scheduleDate
    );

    return {
      id: att.id,
      studentId: att.studentId,
      studentName: data.studentName,
      classId: att.classId,
      className: data.className,
      scheduleDate,
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleStartTime: data.scheduleStartTime,
      scheduleEndTime: data.scheduleEndTime,
      checkinTime: att.createdAt,
      status: 'confirmed' as CheckinStatus,
      createdAt: att.createdAt,
    };
  }

  // ============================================
  // Confirm Check-ins (no-op — attendance is already recorded in Go)
  // In the Go model, every self-checkin directly creates an attendance row
  // (status is always "confirmed"). This method is a no-op kept for API compat.
  // ============================================
  async confirmCheckins(
    checkinIds: string[],
    confirmedBy: string,
    confirmedByName: string
  ): Promise<{ success: number; failed: number }> {
    // Check-ins are already confirmed in Go; nothing to convert.
    return { success: checkinIds.length, failed: 0 };
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
  // Returns the student's recent attendance as checkin-like items.
  // ============================================
  async getStudentPendingCheckins(studentId: string): Promise<Checkin[]> {
    const attendanceService = createAttendanceService(this.academyId);
    const records = await attendanceService.getByStudent(studentId, 50);
    return records.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.studentName ?? '',
      classId: a.classId,
      className: a.className ?? '',
      scheduleDate: a.date,
      scheduleDayOfWeek: a.date.getDay(),
      scheduleStartTime: '',
      scheduleEndTime: '',
      checkinTime: a.createdAt,
      status: 'confirmed' as CheckinStatus,
      createdAt: a.createdAt,
    }));
  }
}

// ============================================
// Factory Function
// ============================================
export function createCheckinService(academyId: string): CheckinService {
  return new CheckinService(academyId);
}

export default CheckinService;
