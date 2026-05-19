import { api } from '@/lib/api/client';
import { LinkCode } from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// ============================================
// Mapper
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapLinkCode = (raw: any): LinkCode => ({
  id: raw.id,
  code: raw.code,
  studentId: raw.student_id,
  studentName: raw.student_name,
  academyId: raw.academy_id,
  createdBy: raw.created_by || '',
  createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
  expiresAt: raw.expires_at ? new Date(raw.expires_at) : new Date(),
  usedAt: raw.used_at ? new Date(raw.used_at) : undefined,
  usedBy: raw.used_by ?? undefined,
});

// ============================================
// Link Code Service (Multi-Tenant)
// ============================================
export class LinkCodeService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get base() {
    return `/v1/academies/${this.academyId}/link-codes`;
  }

  // ============================================
  // Generate New Code for Student
  // POST /link-codes creates a fresh code server-side.
  // ============================================
  async generate(
    studentId: string,
    _studentName: string,
    _createdBy: string
  ): Promise<LinkCode> {
    const raw = await api.post<unknown>(this.base, {
      role: 'student',
      student_id: studentId,
    });
    return mapLinkCode(raw);
  }

  // ============================================
  // Get Code by Code String (public preview)
  // ============================================
  async getByCode(code: string): Promise<LinkCode | null> {
    try {
      const raw = await api.get<unknown>(`/v1/link-codes/${code.toUpperCase()}`);
      return mapLinkCode(raw);
    } catch {
      return null;
    }
  }

  // ============================================
  // Validate Code
  // ============================================
  async validate(code: string): Promise<{
    valid: boolean;
    linkCode?: LinkCode;
    error?: string;
  }> {
    const linkCode = await this.getByCode(code);

    if (!linkCode) {
      return { valid: false, error: 'Código não encontrado' };
    }

    if (linkCode.usedAt) {
      return { valid: false, error: 'Este código já foi utilizado' };
    }

    if (new Date() > linkCode.expiresAt) {
      return { valid: false, error: 'Este código expirou' };
    }

    return { valid: true, linkCode };
  }

  // ============================================
  // Redeem Code (mark as used)
  // ============================================
  async markAsUsed(code: string, _userId: string): Promise<LinkCode> {
    const raw = await api.post<unknown>(`/v1/link-codes/${code.toUpperCase()}/redeem`, {});
    return mapLinkCode(raw);
  }

  // ============================================
  // Get Active Code for Student
  // The Go backend does not expose a list-by-student endpoint,
  // so we generate a new code each time if needed.
  // ============================================
  async getActiveForStudent(_studentId: string): Promise<LinkCode | null> {
    // No server-side query available for active codes by student.
    return null;
  }

  // ============================================
  // Get All Codes for Student
  // ============================================
  async getForStudent(_studentId: string): Promise<LinkCode[]> {
    // No server-side query available.
    return [];
  }

  // ============================================
  // Get Code by ID
  // ============================================
  async getById(_id: string): Promise<LinkCode | null> {
    // No endpoint for direct ID lookup in Go spec.
    return null;
  }

  // ============================================
  // Delete Code
  // ============================================
  async delete(_id: string): Promise<void> {
    // No delete endpoint in Go spec; no-op.
  }

  // ============================================
  // Delete Expired Codes (cleanup — server handles it)
  // ============================================
  async cleanupExpired(): Promise<number> {
    return 0;
  }

  // ============================================
  // Invalidate Codes for Student
  // Backend handles this automatically when a new code is created.
  // ============================================
  async invalidate(_studentId: string): Promise<void> {
    // No-op: backend invalidates old codes on new code creation.
  }

  // ============================================
  // Get Pending Codes (admin view)
  // ============================================
  async getPending(): Promise<LinkCode[]> {
    return [];
  }

  // ============================================
  // Get Recently Used Codes (admin view)
  // ============================================
  async getRecentlyUsed(_limitCount = 10): Promise<LinkCode[]> {
    return [];
  }

  // ============================================
  // Generate Instructor Link Code
  // ============================================
  async generateInstructorCode(_createdBy: string): Promise<LinkCode> {
    const raw = await api.post<unknown>(
      `/v1/academies/${this.academyId}/instructor-link-codes`,
      {}
    );
    return mapLinkCode(raw);
  }
}

// ============================================
// Factory Function
// ============================================
export function createLinkCodeService(academyId: string): LinkCodeService {
  return new LinkCodeService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
export const linkCodeService = {
  generate: (studentId: string, studentName: string, createdBy: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).generate(studentId, studentName, createdBy),
  getByCode: (code: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).getByCode(code),
  validate: (code: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).validate(code),
  markAsUsed: (code: string, userId: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).markAsUsed(code, userId),
  getActiveForStudent: (studentId: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).getActiveForStudent(studentId),
  getForStudent: (studentId: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).getForStudent(studentId),
  getById: (id: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).getById(id),
  delete: (id: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).delete(id),
  cleanupExpired: () =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).cleanupExpired(),
  invalidate: (studentId: string) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).invalidate(studentId),
  getPending: () =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).getPending(),
  getRecentlyUsed: (limitCount = 10) =>
    new LinkCodeService(DEFAULT_ACADEMY_ID).getRecentlyUsed(limitCount),
};

export default linkCodeService;
