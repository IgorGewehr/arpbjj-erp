import { api } from '@/lib/api/client';
import { Attendance, AttendanceFilters } from '@/types';
import { format } from 'date-fns';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Go API response shapes
// ============================================
interface AttendanceDTO {
  id: string;
  academy_id: string;
  student_id: string;
  class_id: string;
  date: string;
  verified_by_uid: string;
  weight: string;
  created_at: string;
}

interface AttendancePageDTO {
  items: AttendanceDTO[];
  has_more: boolean;
  next_cursor?: string;
}

interface RecordAttendanceResultDTO {
  status: string;
  attendance?: AttendanceDTO;
  error?: string;
}

interface RecordAttendanceResponseDTO {
  results: RecordAttendanceResultDTO[];
  promotion_eligible_student_ids?: string[];
}

// ============================================
// Mapper: Go DTO → Attendance
// ============================================
const dtoToAttendance = (dto: AttendanceDTO): Attendance => ({
  id: dto.id,
  studentId: dto.student_id,
  classId: dto.class_id,
  date: new Date(dto.date),
  verifiedBy: dto.verified_by_uid,
  weight: dto.weight ? parseFloat(dto.weight) : undefined,
  createdAt: new Date(dto.created_at),
});

// ============================================
// Attendance Service (Multi-Tenant)
// ============================================
export class AttendanceService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private base(): string {
    return `/v1/academies/${this.academyId}/attendance`;
  }

  // ============================================
  // Get Attendance by Date and Class
  // ============================================
  async getByDateAndClass(date: Date, classId: string): Promise<Attendance[]> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const res = await api.get<AttendancePageDTO>(
      `${this.base()}?classId=${classId}&dateFrom=${dateStr}&dateTo=${dateStr}&limit=10000`
    );
    return res.items
      .map(dtoToAttendance)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ============================================
  // Get Today's Attendance for a Class
  // ============================================
  async getTodayByClass(classId: string): Promise<Attendance[]> {
    return this.getByDateAndClass(new Date(), classId);
  }

  // ============================================
  // Get Attendance by Student
  // ============================================
  async getByStudent(studentId: string, limitCount = 50): Promise<Attendance[]> {
    const res = await api.get<AttendancePageDTO>(
      `${this.base()}?studentId=${studentId}&limit=${limitCount}`
    );
    return res.items
      .map(dtoToAttendance)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ============================================
  // Get Attendance by Date Range
  // ============================================
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: AttendanceFilters
  ): Promise<Attendance[]> {
    const from = format(startDate, 'yyyy-MM-dd');
    const to = format(endDate, 'yyyy-MM-dd');

    let url = `${this.base()}?dateFrom=${from}&dateTo=${to}&limit=10000`;
    if (filters?.classId) url += `&classId=${filters.classId}`;
    if (filters?.studentId) url += `&studentId=${filters.studentId}`;

    const res = await api.get<AttendancePageDTO>(url);
    return res.items
      .map(dtoToAttendance)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ============================================
  // Check if Student is Present
  // ============================================
  async isStudentPresent(studentId: string, classId: string, date: Date): Promise<boolean> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const res = await api.get<AttendancePageDTO>(
      `${this.base()}?studentId=${studentId}&classId=${classId}&dateFrom=${dateStr}&dateTo=${dateStr}&limit=1`
    );
    return res.items.length > 0;
  }

  // ============================================
  // Get Present Students for a Class Today
  // ============================================
  async getPresentStudentIds(classId: string, date: Date = new Date()): Promise<Set<string>> {
    const attendance = await this.getByDateAndClass(date, classId);
    return new Set(attendance.map((a) => a.studentId));
  }

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
    notes?: string,
    weight?: number
  ): Promise<Attendance> {
    const dateStr = format(date, 'yyyy-MM-dd');

    const body: Record<string, unknown> = {
      class_id: classId,
      date: dateStr,
    };
    if (weight !== undefined && weight !== 1) {
      body.weight = weight.toString();
    }

    const dto = await api.post<AttendanceDTO>(
      `/v1/academies/${this.academyId}/students/${studentId}/attendance`,
      body
    );

    return dtoToAttendance(dto);
  }

  // ============================================
  // Get Weighted Attendance Count
  // ============================================
  async getStudentWeightedAttendanceCount(studentId: string): Promise<number> {
    const attendance = await this.getByStudent(studentId, 100000);
    return attendance.reduce((sum, a) => sum + (a.weight ?? 1), 0);
  }

  // ============================================
  // Check Attendance Milestone (no-op — backend fires outbox events)
  // ============================================
  async checkAttendanceMilestone(
    _studentId: string,
    _studentName: string,
    _createdBy: string
  ): Promise<void> {
    // The Go backend handles milestone events automatically via outbox.
    // Nothing to do on the frontend.
  }

  // ============================================
  // Remove Attendance (Unmark)
  // ============================================
  async unmarkPresent(studentId: string, classId: string, date: Date): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    await api.delete(
      `/v1/academies/${this.academyId}/students/${studentId}/attendance`,
      { class_id: classId, date: dateStr }
    );
  }

  // ============================================
  // Bulk Mark Attendance
  // ============================================
  async bulkMarkPresent(
    students: Array<{ id: string; name: string }>,
    classId: string,
    className: string,
    verifiedBy: string,
    verifiedByName: string,
    date: Date = new Date(),
    weight?: number
  ): Promise<Attendance[]> {
    const dateStr = format(date, 'yyyy-MM-dd');

    const entries = students.map((s) => {
      const entry: Record<string, unknown> = {
        student_id: s.id,
        class_id: classId,
        date: dateStr,
      };
      if (weight !== undefined && weight !== 1) {
        entry.weight = weight.toString();
      }
      return entry;
    });

    const res = await api.post<RecordAttendanceResponseDTO>(
      `${this.base()}`,
      { items: entries }
    );

    return res.results
      .filter((r) => r.status === 'created' && r.attendance)
      .map((r) => dtoToAttendance(r.attendance!));
  }

  // ============================================
  // Get Student Attendance Count (system only)
  // ============================================
  async getStudentAttendanceCount(studentId: string): Promise<number> {
    const res = await api.get<AttendancePageDTO>(
      `${this.base()}?studentId=${studentId}&limit=10000`
    );
    return res.items.length;
  }

  // ============================================
  // Get Total Student Attendance Count (including initial)
  // ============================================
  async getTotalStudentAttendanceCount(studentId: string, initialCount: number = 0): Promise<number> {
    const systemCount = await this.getStudentAttendanceCount(studentId);
    return systemCount + initialCount;
  }

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
  }

  // ============================================
  // Get Today's Total Attendance
  // ============================================
  async getTodayTotal(): Promise<number> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const res = await api.get<AttendancePageDTO>(
      `${this.base()}?dateFrom=${today}&dateTo=${today}&limit=10000`
    );
    return res.items.length;
  }

  // ============================================
  // Get Attendance Rate for Student
  // ============================================
  async getStudentAttendanceRate(
    studentId: string,
    startDate: Date,
    totalPossibleClasses: number
  ): Promise<number> {
    const from = format(startDate, 'yyyy-MM-dd');
    const res = await api.get<AttendancePageDTO>(
      `${this.base()}?studentId=${studentId}&dateFrom=${from}&limit=10000`
    );
    const attended = res.items.length;
    if (totalPossibleClasses === 0) return 0;
    return (attended / totalPossibleClasses) * 100;
  }

  // ============================================
  // Delete Attendance by ID
  // ============================================
  async delete(id: string): Promise<void> {
    await api.delete(`${this.base()}/${id}`);
  }

  // ============================================
  // Recalculate Achievements for Student (no-op — backend handles)
  // ============================================
  async recalculateAchievementsForStudent(
    _studentId: string,
    _studentName: string,
    _createdBy: string
  ): Promise<{ anniversaryCreated: string[]; attendanceCreated: string[] }> {
    return { anniversaryCreated: [], attendanceCreated: [] };
  }

  // ============================================
  // Recalculate All Achievements (no-op — backend handles)
  // ============================================
  async recalculateAllAchievements(
    _createdBy: string
  ): Promise<{
    studentsProcessed: number;
    totalAnniversaryCreated: number;
    totalAttendanceCreated: number;
    details: Array<{
      studentId: string;
      studentName: string;
      anniversaryCreated: string[];
      attendanceCreated: string[];
    }>;
  }> {
    return {
      studentsProcessed: 0,
      totalAnniversaryCreated: 0,
      totalAttendanceCreated: 0,
      details: [],
    };
  }
}

// ============================================
// Factory Function
// ============================================
export function createAttendanceService(academyId: string): AttendanceService {
  return new AttendanceService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const attendanceService = {
  getByDateAndClass: (date: Date, classId: string) => new AttendanceService(DEFAULT_ACADEMY_ID).getByDateAndClass(date, classId),
  getTodayByClass: (classId: string) => new AttendanceService(DEFAULT_ACADEMY_ID).getTodayByClass(classId),
  getByStudent: (studentId: string, limitCount = 50) => new AttendanceService(DEFAULT_ACADEMY_ID).getByStudent(studentId, limitCount),
  getByDateRange: (startDate: Date, endDate: Date, filters?: AttendanceFilters) => new AttendanceService(DEFAULT_ACADEMY_ID).getByDateRange(startDate, endDate, filters),
  isStudentPresent: (studentId: string, classId: string, date: Date) => new AttendanceService(DEFAULT_ACADEMY_ID).isStudentPresent(studentId, classId, date),
  getPresentStudentIds: (classId: string, date: Date = new Date()) => new AttendanceService(DEFAULT_ACADEMY_ID).getPresentStudentIds(classId, date),
  markPresent: (studentId: string, studentName: string, classId: string, className: string, verifiedBy: string, verifiedByName: string, date: Date = new Date(), notes?: string) => new AttendanceService(DEFAULT_ACADEMY_ID).markPresent(studentId, studentName, classId, className, verifiedBy, verifiedByName, date, notes),
  checkAttendanceMilestone: (studentId: string, studentName: string, createdBy: string) => new AttendanceService(DEFAULT_ACADEMY_ID).checkAttendanceMilestone(studentId, studentName, createdBy),
  unmarkPresent: (studentId: string, classId: string, date: Date) => new AttendanceService(DEFAULT_ACADEMY_ID).unmarkPresent(studentId, classId, date),
  bulkMarkPresent: (students: Array<{ id: string; name: string }>, classId: string, className: string, verifiedBy: string, verifiedByName: string, date: Date = new Date()) => new AttendanceService(DEFAULT_ACADEMY_ID).bulkMarkPresent(students, classId, className, verifiedBy, verifiedByName, date),
  getStudentAttendanceCount: (studentId: string) => new AttendanceService(DEFAULT_ACADEMY_ID).getStudentAttendanceCount(studentId),
  getTotalStudentAttendanceCount: (studentId: string, initialCount: number = 0) => new AttendanceService(DEFAULT_ACADEMY_ID).getTotalStudentAttendanceCount(studentId, initialCount),
  getMonthlyStats: (month: string) => new AttendanceService(DEFAULT_ACADEMY_ID).getMonthlyStats(month),
  getTodayTotal: () => new AttendanceService(DEFAULT_ACADEMY_ID).getTodayTotal(),
  getStudentAttendanceRate: (studentId: string, startDate: Date, totalPossibleClasses: number) => new AttendanceService(DEFAULT_ACADEMY_ID).getStudentAttendanceRate(studentId, startDate, totalPossibleClasses),
  delete: (id: string) => new AttendanceService(DEFAULT_ACADEMY_ID).delete(id),
  recalculateAchievementsForStudent: (studentId: string, studentName: string, createdBy: string) => new AttendanceService(DEFAULT_ACADEMY_ID).recalculateAchievementsForStudent(studentId, studentName, createdBy),
  recalculateAllAchievements: (createdBy: string) => new AttendanceService(DEFAULT_ACADEMY_ID).recalculateAllAchievements(createdBy),
};

export default attendanceService;
