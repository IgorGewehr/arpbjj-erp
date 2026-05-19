import { api, ApiError } from '@/lib/api/client';
import { InstructorLinkCode, Permission } from '@/types';

// ============================================
// Instructor Link Code Service
//
// Mirrors the student link-code flow but with two key differences:
//   1) The code carries the snapshot of `extraPermissions` to grant on redeem,
//      so the owner picks the perms once and the professor only types the code.
//   2) Handled by the Go backend at /v1/academies/{id}/instructor-link-codes.
// ============================================

// ============================================
// Go API response shape
// ============================================
interface InstructorLinkCodeDTO {
  id: string;
  code: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  expires_at: string;
  extra_permissions: Permission[];
  used_at?: string | null;
  used_by?: string | null;
  used_by_name?: string | null;
}

// ============================================
// Mapper: Go DTO → InstructorLinkCode
// ============================================
function dtoToCode(dto: InstructorLinkCodeDTO): InstructorLinkCode {
  return {
    id: dto.id ?? dto.code,
    code: dto.code,
    createdBy: dto.created_by,
    createdByName: dto.created_by_name,
    createdAt: new Date(dto.created_at),
    expiresAt: new Date(dto.expires_at),
    extraPermissions: Array.isArray(dto.extra_permissions) ? dto.extra_permissions : [],
    usedAt: dto.used_at ? new Date(dto.used_at) : undefined,
    usedBy: dto.used_by ?? undefined,
    usedByName: dto.used_by_name ?? undefined,
  };
}

export class InstructorLinkCodeService {
  constructor(private academyId: string) {}

  private get base() {
    return `/v1/academies/${this.academyId}/instructor-link-codes`;
  }

  /**
   * Generate a fresh instructor invite code via the Go backend.
   * Returns the persisted InstructorLinkCode with the generated code string.
   */
  async generate(
    createdBy: string,
    createdByName: string,
    extraPermissions: Permission[]
  ): Promise<InstructorLinkCode> {
    const dto = await api.post<InstructorLinkCodeDTO>(this.base, {
      created_by: createdBy,
      created_by_name: createdByName,
      extra_permissions: extraPermissions,
    });
    return dtoToCode(dto);
  }

  /**
   * List active (unused, unexpired) instructor invite codes for the academy.
   * TODO(tatami): No GET /v1/academies/{id}/instructor-link-codes endpoint exists yet.
   * Returns empty array until the backend exposes a list endpoint.
   */
  async listActive(): Promise<InstructorLinkCode[]> {
    // TODO(tatami): implement when GET /v1/academies/{academyId}/instructor-link-codes is available.
    return [];
  }

  /**
   * Delete an instructor invite code.
   * TODO(tatami): No DELETE /v1/academies/{id}/instructor-link-codes/{code} endpoint exists yet.
   */
  async delete(_codeId: string): Promise<void> {
    // TODO(tatami): implement when DELETE /v1/academies/{academyId}/instructor-link-codes/{codeId} is available.
  }
}

export function createInstructorLinkCodeService(academyId: string): InstructorLinkCodeService {
  return new InstructorLinkCodeService(academyId);
}

// ============================================
// Cross-academy helpers (no academy context yet — used during code redeem)
// ============================================

/**
 * Validate an instructor invite code globally.
 * Uses GET /v1/link-codes/{code} which the Go backend resolves across all academies.
 */
export async function validateInstructorCodeGlobally(
  rawCode: string
): Promise<{ code: InstructorLinkCode; academyId: string } | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  try {
    const dto = await api.get<InstructorLinkCodeDTO & { academy_id: string }>(
      `/v1/link-codes/${code}`
    );

    // Treat 409 (used/expired) and 404 (not found) as invalid silently;
    // any other shape means the code exists and is valid.
    if (!dto || !dto.code) return null;
    if (dto.used_at) return null;
    if (new Date(dto.expires_at).getTime() <= Date.now()) return null;

    const academyId = dto.academy_id;
    return { code: dtoToCode(dto), academyId };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 409)) {
      return null;
    }
    throw err;
  }
}

/**
 * Promote an existing academy member to admin role with extra permissions.
 * Uses PATCH /v1/academies/{academyId}/memberships/{userId}.
 * The Firebase ID token is injected automatically by the API client.
 */
export async function promoteUserToInstructor(opts: {
  userId: string;
  academyId: string;
  extraPermissions: Permission[];
  email?: string;
  displayName?: string;
}): Promise<void> {
  const { userId, academyId, extraPermissions } = opts;

  await api.patch(`/v1/academies/${academyId}/memberships/${userId}`, {
    role: 'admin',
    extra_permissions: extraPermissions,
  });
}

/**
 * Redeem a previously generated instructor code: calls the Go backend which
 * atomically marks the code as used and upserts the user_academy_mappings
 * with the instructor role and extraPermissions.
 *
 * The Firebase ID token is injected automatically by the API client interceptor.
 */
export async function redeemInstructorCode(opts: {
  code: InstructorLinkCode;
  academyId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
}): Promise<void> {
  const { code, userDisplayName } = opts;

  await api.post(`/v1/link-codes/${code.code}/redeem`, { full_name: userDisplayName });
}
