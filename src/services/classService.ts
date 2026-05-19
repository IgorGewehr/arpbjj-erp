import { api } from '@/lib/api/client';
import { Class, StudentCategory } from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Go API response shapes (snake_case)
// ============================================
interface GoScheduleEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface GoClass {
  id: string;
  academy_id: string;
  name: string;
  description?: string;
  instructor_uid?: string;
  instructor_name?: string;
  instructor_uids?: string[];
  primary_instructor_uid?: string;
  schedule: GoScheduleEntry[];
  category: string;
  sport?: string;
  min_belt?: string;
  max_belt?: string;
  max_students?: number;
  weight?: string;
  is_active: boolean;
  student_ids?: string[];
  created_at: string;
  updated_at: string;
}

interface GoClassListResponse {
  items: GoClass[];
  has_more: boolean;
  next_cursor: string | null;
}

// ============================================
// Helper: Convert Go response to Class
// ============================================
const goToClass = (c: GoClass): Class => {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    instructorId: c.instructor_uid ?? c.primary_instructor_uid ?? '',
    instructorName: c.instructor_name,
    studentIds: (c.student_ids ?? []).map(String),
    schedule: (c.schedule ?? []).map(s => ({
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
    })),
    category: c.category as Class['category'],
    sport: c.sport as Class['sport'],
    minBelt: c.min_belt as Class['minBelt'],
    maxBelt: c.max_belt as Class['maxBelt'],
    maxStudents: c.max_students,
    isActive: c.is_active ?? true,
    weight: c.weight !== undefined ? parseFloat(c.weight) : undefined,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  };
};

// ============================================
// Helper: Convert Class schedule to Go request format
// ============================================
const scheduleToGo = (schedule: Class['schedule']): GoScheduleEntry[] => {
  return schedule.map(s => ({
    day_of_week: s.dayOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
  }));
};

// ============================================
// Class Service (Multi-Tenant)
// ============================================
export class ClassService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get baseUrl() {
    return `/v1/academies/${this.academyId}/classes`;
  }

  // ============================================
  // List All Classes
  // ============================================
  async list(): Promise<Class[]> {
    const res = await api.get<GoClassListResponse>(`${this.baseUrl}?limit=500`);
    const classes = res.items.map(goToClass).filter(c => c.isActive);
    return classes.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ============================================
  // Get Class by ID
  // ============================================
  async getById(id: string): Promise<Class | null> {
    try {
      const c = await api.get<GoClass>(`${this.baseUrl}/${id}`);
      return goToClass(c);
    } catch {
      return null;
    }
  }

  // ============================================
  // Get Classes by Student ID
  // ============================================
  async getByStudent(studentId: string): Promise<Class[]> {
    const res = await api.get<GoClassListResponse>(`${this.baseUrl}?limit=500`);
    return res.items
      .map(goToClass)
      .filter(c => c.isActive && c.studentIds.includes(studentId));
  }

  // ============================================
  // Get Classes by Day of Week
  // ============================================
  async getByDayOfWeek(dayOfWeek: number): Promise<Class[]> {
    const allClasses = await this.list();
    return allClasses.filter(cls =>
      cls.schedule.some(s => s.dayOfWeek === dayOfWeek)
    );
  }

  // ============================================
  // Get Current Class (based on day and time)
  // ============================================
  async getCurrentClass(): Promise<Class | null> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const classesForToday = await this.getByDayOfWeek(dayOfWeek);

    for (const cls of classesForToday) {
      for (const schedule of cls.schedule) {
        if (schedule.dayOfWeek !== dayOfWeek) continue;

        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (currentTime >= startMinutes - 30 && currentTime <= endMinutes) {
          return cls;
        }
      }
    }

    return null;
  }

  // ============================================
  // Get Today's Classes
  // ============================================
  async getTodayClasses(): Promise<Class[]> {
    const dayOfWeek = new Date().getDay();
    return this.getByDayOfWeek(dayOfWeek);
  }

  // ============================================
  // Get Classes for a Specific Date
  // ============================================
  async getClassesForDate(date: Date): Promise<Class[]> {
    const dayOfWeek = date.getDay();
    return this.getByDayOfWeek(dayOfWeek);
  }

  // ============================================
  // Get Classes by Category
  // ============================================
  async getByCategory(category: StudentCategory): Promise<Class[]> {
    const res = await api.get<GoClassListResponse>(`${this.baseUrl}?limit=500`);
    const classes = res.items
      .map(goToClass)
      .filter(c => c.isActive && c.category === category);
    return classes.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ============================================
  // Create Class
  // ============================================
  async create(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): Promise<Class> {
    const body: Record<string, unknown> = {
      name: classData.name,
      category: classData.category,
      schedule: scheduleToGo(classData.schedule),
      is_active: true,
      student_ids: classData.studentIds ?? [],
    };

    if (classData.description) body.description = classData.description;
    if (classData.instructorId) body.instructor_uid = classData.instructorId;
    if (classData.instructorName) body.instructor_name = classData.instructorName;
    if (classData.sport) body.sport = classData.sport;
    if (classData.minBelt) body.min_belt = classData.minBelt;
    if (classData.maxBelt) body.max_belt = classData.maxBelt;
    if (classData.maxStudents) body.max_students = classData.maxStudents;
    if (classData.weight !== undefined) body.weight = String(classData.weight);

    const c = await api.post<GoClass>(this.baseUrl, body);
    return goToClass(c);
  }

  // ============================================
  // Update Class
  // ============================================
  async update(id: string, data: Partial<Class>): Promise<Class> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, ...rest } = data as Class & { id?: string };
    const body: Record<string, unknown> = {};

    if (rest.name !== undefined) body.name = rest.name;
    if (rest.description !== undefined) body.description = rest.description;
    if (rest.instructorId !== undefined) body.instructor_uid = rest.instructorId;
    if (rest.instructorName !== undefined) body.instructor_name = rest.instructorName;
    if (rest.category !== undefined) body.category = rest.category;
    if (rest.sport !== undefined) body.sport = rest.sport;
    if (rest.minBelt !== undefined) body.min_belt = rest.minBelt;
    if (rest.maxBelt !== undefined) body.max_belt = rest.maxBelt;
    if (rest.maxStudents !== undefined) body.max_students = rest.maxStudents;
    if (rest.isActive !== undefined) body.is_active = rest.isActive;
    if (rest.weight !== undefined) body.weight = String(rest.weight);
    if (rest.schedule !== undefined) body.schedule = scheduleToGo(rest.schedule);
    if (rest.studentIds !== undefined) body.student_ids = rest.studentIds;

    const c = await api.patch<GoClass>(`${this.baseUrl}/${id}`, body);
    return goToClass(c);
  }

  // ============================================
  // Delete Class (soft delete via API)
  // ============================================
  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================
  // Hard Delete Class
  // ============================================
  async hardDelete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================
  // Get Weekly Schedule
  // ============================================
  async getWeeklySchedule(): Promise<Record<number, Class[]>> {
    const allClasses = await this.list();
    const schedule: Record<number, Class[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };

    for (const cls of allClasses) {
      for (const s of cls.schedule) {
        if (!schedule[s.dayOfWeek].find(c => c.id === cls.id)) {
          schedule[s.dayOfWeek].push(cls);
        }
      }
    }

    for (const day of Object.keys(schedule)) {
      schedule[Number(day)].sort((a, b) => {
        const aTime = a.schedule.find(s => s.dayOfWeek === Number(day))?.startTime || '00:00';
        const bTime = b.schedule.find(s => s.dayOfWeek === Number(day))?.startTime || '00:00';
        return aTime.localeCompare(bTime);
      });
    }

    return schedule;
  }

  // ============================================
  // Add Student to Class
  // ============================================
  async addStudent(classId: string, studentId: string): Promise<Class> {
    const cls = await this.getById(classId);
    if (!cls) throw new Error('Class not found');

    const studentIds = cls.studentIds || [];
    if (!studentIds.includes(studentId)) {
      await api.post(`${this.baseUrl}/${classId}/students`, { student_id: studentId });
      return (await this.getById(classId))!;
    }

    return cls;
  }

  // ============================================
  // Remove Student from Class
  // ============================================
  async removeStudent(classId: string, studentId: string): Promise<Class> {
    await api.delete(`${this.baseUrl}/${classId}/students/${studentId}`);
    return (await this.getById(classId))!;
  }

  // ============================================
  // Toggle Student in Class
  // ============================================
  async toggleStudent(classId: string, studentId: string): Promise<Class> {
    const cls = await this.getById(classId);
    if (!cls) throw new Error('Class not found');

    const studentIds = cls.studentIds || [];
    if (studentIds.includes(studentId)) {
      return this.removeStudent(classId, studentId);
    } else {
      return this.addStudent(classId, studentId);
    }
  }
}

// ============================================
// Factory Function
// ============================================
export function createClassService(academyId: string): ClassService {
  return new ClassService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const classService = {
  list: () => new ClassService(DEFAULT_ACADEMY_ID).list(),
  getById: (id: string) => new ClassService(DEFAULT_ACADEMY_ID).getById(id),
  getByDayOfWeek: (dayOfWeek: number) => new ClassService(DEFAULT_ACADEMY_ID).getByDayOfWeek(dayOfWeek),
  getCurrentClass: () => new ClassService(DEFAULT_ACADEMY_ID).getCurrentClass(),
  getTodayClasses: () => new ClassService(DEFAULT_ACADEMY_ID).getTodayClasses(),
  getClassesForDate: (date: Date) => new ClassService(DEFAULT_ACADEMY_ID).getClassesForDate(date),
  getByCategory: (category: StudentCategory) => new ClassService(DEFAULT_ACADEMY_ID).getByCategory(category),
  create: (classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) => new ClassService(DEFAULT_ACADEMY_ID).create(classData),
  update: (id: string, data: Partial<Class>) => new ClassService(DEFAULT_ACADEMY_ID).update(id, data),
  delete: (id: string) => new ClassService(DEFAULT_ACADEMY_ID).delete(id),
  hardDelete: (id: string) => new ClassService(DEFAULT_ACADEMY_ID).hardDelete(id),
  getWeeklySchedule: () => new ClassService(DEFAULT_ACADEMY_ID).getWeeklySchedule(),
  addStudent: (classId: string, studentId: string) => new ClassService(DEFAULT_ACADEMY_ID).addStudent(classId, studentId),
  removeStudent: (classId: string, studentId: string) => new ClassService(DEFAULT_ACADEMY_ID).removeStudent(classId, studentId),
  toggleStudent: (classId: string, studentId: string) => new ClassService(DEFAULT_ACADEMY_ID).toggleStudent(classId, studentId),
};

export default classService;
