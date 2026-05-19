import { api } from '@/lib/api/client';
import { Student, StudentFilters, Pagination, PaginatedResponse } from '@/types';

// ============================================
// Go API response shapes (snake_case)
// ============================================
interface GoStudent {
  id: string;
  academy_id: string;
  full_name: string;
  nickname?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  birth_date?: string;
  category: string;
  status: string;
  status_note?: string;
  current_belt: string;
  current_stripes: number;
  attendance_count: number;
  initial_attendance_count?: number;
  plan_id?: string;
  tuition_value?: string;
  tuition_day: number;
  linked_user_uid?: string;
  is_profile_public: boolean;
  primary_sport?: string;
  sports_list?: string[];
  sport_data?: Record<string, unknown>;
  weight_kg?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  guardian?: {
    name?: string;
    phone?: string;
    email?: string;
    cpf?: string;
    relationship?: string;
  };
  cpf?: string;
  rg?: string;
  start_date?: string;
  jiujitsu_start_date?: string;
  medical_certificate_url?: string;
  health_notes?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
  created_by_uid?: string;
}

interface GoStudentListResponse {
  items: GoStudent[];
  has_more: boolean;
  next_cursor: string | null;
}

// ============================================
// Helper: Convert Go response to Student
// ============================================
const goToStudent = (s: GoStudent): Student => {
  return {
    id: s.id,
    fullName: s.full_name,
    nickname: s.nickname,
    birthDate: s.birth_date ? new Date(s.birth_date) : undefined,
    cpf: s.cpf,
    rg: s.rg,
    phone: s.phone,
    email: s.email,
    photoUrl: s.photo_url,
    address: s.address
      ? {
          street: s.address.street ?? '',
          number: '',
          neighborhood: '',
          city: s.address.city ?? '',
          state: s.address.state ?? '',
          zipCode: s.address.zip_code ?? '',
        }
      : undefined,
    guardian: s.guardian
      ? {
          name: s.guardian.name ?? '',
          phone: s.guardian.phone ?? '',
          email: s.guardian.email,
          cpf: s.guardian.cpf,
          relationship: s.guardian.relationship ?? '',
        }
      : undefined,
    startDate: s.start_date ? new Date(s.start_date) : new Date(),
    jiujitsuStartDate: s.jiujitsu_start_date ? new Date(s.jiujitsu_start_date) : undefined,
    currentBelt: s.current_belt as Student['currentBelt'],
    currentStripes: s.current_stripes as Student['currentStripes'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sports: s.sports_list as any,
    sportData: s.sport_data as Student['sportData'],
    category: s.category as Student['category'],
    weight: s.weight_kg ?? undefined,
    initialAttendanceCount: s.initial_attendance_count ?? 0,
    attendanceCount: s.attendance_count,
    planId: s.plan_id,
    status: s.status as Student['status'],
    statusNote: s.status_note,
    tuitionValue: s.tuition_value !== undefined ? parseFloat(s.tuition_value) : 0,
    tuitionDay: s.tuition_day,
    medicalCertificateUrl: s.medical_certificate_url,
    healthNotes: s.health_notes,
    bloodType: s.blood_type,
    allergies: s.allergies ? [s.allergies] : undefined,
    isProfilePublic: s.is_profile_public ?? false,
    linkedUserId: s.linked_user_uid,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    createdBy: s.created_by_uid,
  };
};

// ============================================
// Helper: Convert Student to Go request body (camelCase → snake_case)
// ============================================
const studentToGoBody = (student: Partial<Student>): Record<string, unknown> => {
  const body: Record<string, unknown> = {};

  if (student.fullName !== undefined) body.full_name = student.fullName;
  if (student.nickname !== undefined) body.nickname = student.nickname;
  if (student.email !== undefined) body.email = student.email;
  if (student.phone !== undefined) body.phone = student.phone;
  if (student.photoUrl !== undefined) body.photo_url = student.photoUrl;
  if (student.birthDate !== undefined) body.birth_date = new Date(student.birthDate).toISOString().split('T')[0];
  if (student.category !== undefined) body.category = student.category;
  if (student.status !== undefined) body.status = student.status;
  if (student.statusNote !== undefined) body.status_note = student.statusNote;
  if (student.currentBelt !== undefined) body.current_belt = student.currentBelt;
  if (student.currentStripes !== undefined) body.current_stripes = student.currentStripes;
  if (student.planId !== undefined) body.plan_id = student.planId;
  if (student.tuitionValue !== undefined) body.tuition_value = String(student.tuitionValue);
  if (student.tuitionDay !== undefined) body.tuition_day = student.tuitionDay;
  if (student.weight !== undefined) body.weight_kg = student.weight;
  if (student.isProfilePublic !== undefined) body.is_profile_public = student.isProfilePublic;
  if (student.linkedUserId !== undefined) body.linked_user_uid = student.linkedUserId;
  if (student.cpf !== undefined) body.cpf = student.cpf;
  if (student.rg !== undefined) body.rg = student.rg;
  if (student.startDate !== undefined) body.start_date = new Date(student.startDate).toISOString().split('T')[0];
  if (student.jiujitsuStartDate !== undefined) body.jiujitsu_start_date = new Date(student.jiujitsuStartDate).toISOString().split('T')[0];
  if (student.medicalCertificateUrl !== undefined) body.medical_certificate_url = student.medicalCertificateUrl;
  if (student.healthNotes !== undefined) body.health_notes = student.healthNotes;
  if (student.bloodType !== undefined) body.blood_type = student.bloodType;
  if (student.allergies !== undefined) body.allergies = Array.isArray(student.allergies) ? student.allergies.join(', ') : student.allergies;
  if (student.initialAttendanceCount !== undefined) body.initial_attendance_count = student.initialAttendanceCount;

  if (student.address !== undefined) {
    body.address = {
      street: student.address.street,
      city: student.address.city,
      state: student.address.state,
      zip_code: student.address.zipCode,
    };
  }

  if (student.guardian !== undefined) {
    body.guardian = {
      name: student.guardian.name,
      phone: student.guardian.phone,
      email: student.guardian.email,
      cpf: student.guardian.cpf,
      relationship: student.guardian.relationship,
    };
  }

  if (student.sports !== undefined) body.sports_list = student.sports;
  if (student.sportData !== undefined) body.sport_data = student.sportData;
  if (student.primarySport !== undefined) body.primary_sport = student.primarySport;

  return body;
};

// ============================================
// Student Service Class (Multi-Tenant)
// ============================================
class StudentService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get baseUrl() {
    return `/v1/academies/${this.academyId}/students`;
  }

  // ============================================
  // List Students with Infinite Scroll Support
  // ============================================
  async listAll(
    filters: StudentFilters = {},
    pageSize = 30,
    lastStudentId?: string
  ): Promise<PaginatedResponse<Student> & { hasMore: boolean; lastId?: string }> {
    const params = new URLSearchParams({ limit: '500' });
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.belt) params.set('belt', filters.belt);
    if (filters.search) params.set('q', filters.search);

    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?${params}`);
    const students = res.items.map(goToStudent);

    students.sort((a, b) => {
      const totalA = (a.attendanceCount || 0) + (a.initialAttendanceCount || 0);
      const totalB = (b.attendanceCount || 0) + (b.initialAttendanceCount || 0);
      if (totalB !== totalA) return totalB - totalA;
      return a.fullName.localeCompare(b.fullName);
    });

    const total = students.length;

    let startIndex = 0;
    if (lastStudentId) {
      const cursorIndex = students.findIndex(s => s.id === lastStudentId);
      if (cursorIndex !== -1) startIndex = cursorIndex + 1;
    }

    const pageStudents = students.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < total;
    const lastId = pageStudents.length > 0 ? pageStudents[pageStudents.length - 1].id : undefined;

    const pagination: Pagination = {
      page: Math.floor(startIndex / pageSize) + 1,
      perPage: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };

    return { data: pageStudents, pagination, success: true, hasMore, lastId };
  }

  // ============================================
  // Search Students by Name
  // ============================================
  async searchByName(searchTerm: string, filters: StudentFilters = {}): Promise<Student[]> {
    const params = new URLSearchParams({ limit: '500', q: searchTerm });
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.belt) params.set('belt', filters.belt);

    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?${params}`);
    const students = res.items.map(goToStudent);

    const term = searchTerm.toLowerCase().trim();
    const matches = students.filter(s =>
      s.fullName.toLowerCase().includes(term) ||
      s.nickname?.toLowerCase().includes(term)
    );

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
  ): Promise<PaginatedResponse<Student>> {
    const params = new URLSearchParams({ limit: '500' });
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.belt) params.set('belt', filters.belt);

    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?${params}`);
    const students = res.items.map(goToStudent);
    students.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const total = students.length;
    const startIndex = (page - 1) * perPage;
    const pageStudents = students.slice(startIndex, startIndex + perPage);

    const pagination: Pagination = {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };

    return { data: pageStudents, pagination, success: true };
  }

  // ============================================
  // Get Student by ID
  // ============================================
  async getById(id: string): Promise<Student | null> {
    try {
      const s = await api.get<GoStudent>(`${this.baseUrl}/${id}`);
      return goToStudent(s);
    } catch {
      return null;
    }
  }

  // ============================================
  // Get Students by Status
  // ============================================
  async getByStatus(status: Student['status']): Promise<Student[]> {
    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?status=${status}&limit=500`);
    return res.items.map(goToStudent).sort((a, b) => a.fullName.localeCompare(b.fullName));
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
    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?limit=500`);
    const found = res.items.find(s => s.linked_user_uid === userId);
    return found ? goToStudent(found) : null;
  }

  // ============================================
  // Get All Students (for reports)
  // ============================================
  async getAll(): Promise<Student[]> {
    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?limit=500`);
    return res.items.map(goToStudent).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Search Students by Name
  // ============================================
  async search(searchTerm: string): Promise<Student[]> {
    const params = new URLSearchParams({ q: searchTerm, limit: '20' });
    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?${params}`);
    return res.items.map(goToStudent);
  }

  // ============================================
  // Create Student
  // ============================================
  async create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: string): Promise<Student> {
    const body = studentToGoBody(student);
    if (createdBy) body.created_by_uid = createdBy;
    const s = await api.post<GoStudent>(this.baseUrl, body, {
      'Idempotency-Key': crypto.randomUUID(),
    });
    return goToStudent(s);
  }

  // ============================================
  // Update Student
  // ============================================
  async update(id: string, data: Partial<Student>): Promise<Student> {
    const body = studentToGoBody(data);
    // UpdateStudentRequest does not accept these create-only or dedicated-endpoint fields.
    // Go handler uses DisallowUnknownFields → 400 if sent.
    delete body.initial_attendance_count;
    delete body.current_belt;
    delete body.current_stripes;
    delete body.linked_user_uid;
    delete body.sports_list;
    delete body.sport_data;
    const s = await api.patch<GoStudent>(`${this.baseUrl}/${id}`, body);
    return goToStudent(s);
  }

  // ============================================
  // Delete Student (soft delete via API)
  // ============================================
  async delete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================
  // Hard Delete Student
  // ============================================
  async hardDelete(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // ============================================
  // Quick Create (Minimal data)
  // ============================================
  async quickCreate(
    fullName: string,
    phone: string,
    createdBy: string
  ): Promise<Student> {
    const body = {
      full_name: fullName,
      phone,
      status: 'active',
      current_belt: 'white',
      current_stripes: 0,
      category: 'adult',
      tuition_value: '0',
      tuition_day: 10,
      is_profile_public: false,
      created_by_uid: createdBy,
    };

    const s = await api.post<GoStudent>(this.baseUrl, body, {
      'Idempotency-Key': crypto.randomUUID(),
    });
    return goToStudent(s);
  }

  // ============================================
  // Get Students by Belt
  // ============================================
  async getByBelt(belt: Student['currentBelt']): Promise<Student[]> {
    const res = await api.get<GoStudentListResponse>(
      `${this.baseUrl}?belt=${belt}&status=active&limit=500`
    );
    return res.items.map(goToStudent).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Get Students by Category
  // ============================================
  async getByCategory(category: Student['category']): Promise<Student[]> {
    const res = await api.get<GoStudentListResponse>(
      `${this.baseUrl}?category=${category}&status=active&limit=500`
    );
    return res.items.map(goToStudent).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  // ============================================
  // Get Students Count by Status
  // ============================================
  async getCountByStatus(): Promise<Record<Student['status'], number>> {
    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?limit=500`);
    const counts: Record<Student['status'], number> = {
      active: 0,
      injured: 0,
      inactive: 0,
      suspended: 0,
    };

    res.items.forEach(s => {
      const status = s.status as Student['status'];
      if (status in counts) counts[status]++;
    });

    return counts;
  }

  // ============================================
  // Get Dashboard Stats
  // ============================================
  async getDashboardStats(): Promise<{
    total: number;
    byStatus: { active: number; injured: number; inactive: number; suspended: number };
    byCategory: { kids: number; adult: number };
  }> {
    const res = await api.get<GoStudentListResponse>(`${this.baseUrl}?limit=500`);

    const stats = {
      total: 0,
      byStatus: { active: 0, injured: 0, inactive: 0, suspended: 0 } as Record<string, number>,
      byCategory: { kids: 0, adult: 0 } as Record<string, number>,
    };

    res.items.forEach(s => {
      stats.total++;
      if (s.status && s.status in stats.byStatus) stats.byStatus[s.status]++;
      if (s.category && s.category in stats.byCategory) stats.byCategory[s.category]++;
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
  // Update Sport Grade
  // ============================================
  async updateSportGrade(
    id: string,
    sportId: string,
    newGrade: string,
    newStripes: number,
    promotedBy?: string,
    notes?: string,
    graduationDate?: Date
  ): Promise<Student> {
    const student = await this.getById(id);
    if (!student) throw new Error('Student not found');

    const updateData: Partial<Student> = {};
    const date = graduationDate || new Date();

    if (sportId === 'bjj') {
      updateData.currentBelt = newGrade as Student['currentBelt'];
      updateData.currentStripes = newStripes as Student['currentStripes'];
      updateData.beltHistory = [
        ...(student.beltHistory || []),
        {
          belt: newGrade as Student['currentBelt'],
          stripes: newStripes as Student['currentStripes'],
          date,
          notes,
        },
      ];
    } else {
      const currentSportData = student.sportData?.[sportId] || {
        currentGrade: newGrade,
        currentStripes: newStripes,
        startDate: date,
        gradeHistory: [],
      };

      updateData.sportData = {
        ...(student.sportData || {}),
        [sportId]: {
          ...currentSportData,
          currentGrade: newGrade,
          currentStripes: newStripes,
          gradeHistory: [
            ...(currentSportData.gradeHistory || []),
            {
              grade: newGrade,
              stripes: newStripes,
              date,
              notes,
              promotedBy,
            },
          ],
        },
      };

      const currentSports = student.sports || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!currentSports.includes(sportId as any)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateData.sports = [...currentSports, sportId as any];
      }
    }

    return this.update(id, updateData);
  }

  // ============================================
  // Sync Attendance Counts (no-op — handled by backend)
  // ============================================
  async syncAttendanceCounts(): Promise<{ updated: number; errors: number }> {
    return { updated: 0, errors: 0 };
  }
}

// ============================================
// Factory Function
// ============================================
export function createStudentService(academyId: string): StudentService {
  return new StudentService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
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
  updateSportGrade: (...args: Parameters<StudentService['updateSportGrade']>) =>
    new StudentService(DEFAULT_ACADEMY_ID).updateSportGrade(...args),
  syncAttendanceCounts: () => new StudentService(DEFAULT_ACADEMY_ID).syncAttendanceCounts(),
};

export default studentService;
