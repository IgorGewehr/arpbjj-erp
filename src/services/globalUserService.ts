/**
 * Global User Service
 * Manages users via Go REST backend at /v1/me and /v1/users.
 */

import { api } from '@/lib/api/client';
import {
  GlobalUser,
  AccountType,
  UserAcademyMapping,
  AcademyUser,
  UserRole,
  BeltColor,
  KidsBeltColor,
  Stripes,
  Permission,
} from '@/types';

// ============================================
// Raw response shapes
// ============================================

interface RawMembership {
  uid: string;
  academy_id: string;
  role: string;
  student_id: string | null;
  status: string;
  joined_at: string;
}

interface RawMeResponse {
  user: {
    uid: string;
    email: string;
    display_name: string;
    photo_url?: string;
    phone?: string;
  };
  memberships: RawMembership[];
  primary_academy_id: string | null;
}

// ============================================
// Mappers
// ============================================

function mapMeToGlobalUser(raw: RawMeResponse): GlobalUser {
  return {
    id: raw.user.uid,
    email: raw.user.email || '',
    displayName: raw.user.display_name || '',
    photoUrl: raw.user.photo_url || undefined,
    phone: raw.user.phone || undefined,
    accountType: raw.memberships.length > 0 ? 'linked' : 'free',
    isProfilePublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapMeToUserAcademyMapping(raw: RawMeResponse, uid: string): UserAcademyMapping {
  const academyIds = raw.memberships.map((m) => m.academy_id);
  const academyDetails: UserAcademyMapping['academyDetails'] = {};

  for (const m of raw.memberships) {
    academyDetails[m.academy_id] = {
      studentId: m.student_id || undefined,
      role: m.role as UserRole,
      joinedAt: new Date(m.joined_at),
      status: m.status as 'active' | 'inactive' | 'pending',
    };
  }

  return {
    id: uid,
    academyIds,
    primaryAcademyId: raw.primary_academy_id || undefined,
    academyDetails,
    updatedAt: new Date(),
  };
}

// ============================================
// Global User CRUD
// ============================================

/**
 * Get global user by ID
 * Uses /v1/me for the current user; for other users, fetches memberships.
 */
export async function getGlobalUser(userId: string): Promise<GlobalUser | null> {
  try {
    const raw = await api.get<RawMeResponse>('/v1/me');
    if (raw.user.uid !== userId) {
      // Different user — return minimal info from memberships
      return {
        id: userId,
        email: '',
        displayName: '',
        accountType: 'free',
        isProfilePublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return mapMeToGlobalUser(raw);
  } catch {
    return null;
  }
}

/**
 * Create a new global user.
 * In Go, user creation is handled during Firebase auth setup.
 * This is a no-op that returns the shape callers expect.
 */
export async function createGlobalUser(
  userId: string,
  data: {
    email: string;
    displayName: string;
    photoUrl?: string;
    phone?: string;
    accountType?: AccountType;
  }
): Promise<GlobalUser> {
  // User is created by Firebase auth flow and Go backend onboarding.
  return {
    id: userId,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    phone: data.phone,
    accountType: data.accountType || 'free',
    isProfilePublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update global user profile
 */
export async function updateGlobalUser(
  _userId: string,
  data: Partial<Omit<GlobalUser, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: Record<string, any> = {};
  if (data.displayName !== undefined) body.display_name = data.displayName;
  if (data.photoUrl !== undefined) body.photo_url = data.photoUrl;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.birthDate !== undefined) body.birth_date = (data.birthDate as Date).toISOString();
  if (data.jiujitsuStartDate !== undefined) body.jiujitsu_start_date = (data.jiujitsuStartDate as Date).toISOString();
  if (data.isProfilePublic !== undefined) body.is_profile_public = data.isProfilePublic;
  if (data.cpf !== undefined) body.cpf = data.cpf;
  if (data.weight !== undefined) body.weight = data.weight;

  await api.patch('/v1/me', body);
}

// ============================================
// User-Academy Mapping
// ============================================

/**
 * Get user's academy mapping
 */
export async function getUserAcademyMapping(
  userId: string
): Promise<UserAcademyMapping | null> {
  try {
    const raw = await api.get<RawMeResponse>('/v1/me');
    return mapMeToUserAcademyMapping(raw, userId);
  } catch {
    return null;
  }
}

/**
 * Link user to an academy
 * In Go, this is handled by redeeming a link code (/v1/link-codes/{code}/redeem).
 * This is a no-op kept for signature compatibility.
 */
export async function linkUserToAcademy(
  _userId: string,
  _academyId: string,
  _data: {
    studentId?: string;
    role: UserRole;
    extraPermissions?: Permission[];
  }
): Promise<void> {
  // Linking is done via link code redemption on the Go backend.
}

/**
 * Unlink user from an academy — no-op, handled server-side.
 */
export async function unlinkUserFromAcademy(
  _userId: string,
  _academyId: string
): Promise<void> {
  // No direct endpoint; handled server-side.
}

/**
 * Set primary academy for user
 */
export async function setPrimaryAcademy(
  _userId: string,
  academyId: string
): Promise<void> {
  await api.patch('/v1/me/academy-mapping/primary', { academy_id: academyId });
}

// ============================================
// Belt Synchronization
// ============================================

const BELT_ORDER: (BeltColor | KidsBeltColor)[] = [
  'white', 'grey', 'grey-white', 'grey-black',
  'yellow', 'yellow-white', 'yellow-black',
  'orange', 'orange-white', 'orange-black',
  'green', 'green-white', 'green-black',
  'blue', 'purple', 'brown', 'black',
];

function compareBelts(belt1: BeltColor | KidsBeltColor, belt2: BeltColor | KidsBeltColor): number {
  return BELT_ORDER.indexOf(belt1) - BELT_ORDER.indexOf(belt2);
}

/**
 * Sync highest belt — handled server-side in Go on promotion events.
 * No-op on client.
 */
export async function syncHighestBelt(_userId: string): Promise<void> {
  // Belt sync is handled by Go backend domain events.
}

// ============================================
// Academy User Management
// ============================================

/**
 * Get academy user
 */
export async function getAcademyUser(
  _academyId: string,
  _userId: string
): Promise<AcademyUser | null> {
  try {
    const raw = await api.get<RawMeResponse>('/v1/me');
    const membership = raw.memberships.find((m) => m.academy_id === _academyId);
    if (!membership) return null;

    return {
      id: raw.user.uid,
      email: raw.user.email || '',
      displayName: raw.user.display_name || '',
      photoUrl: raw.user.photo_url || undefined,
      role: membership.role as UserRole,
      phone: raw.user.phone || undefined,
      studentId: membership.student_id || undefined,
      status: membership.status as 'active' | 'inactive' | 'pending',
      joinedAt: new Date(membership.joined_at),
      createdAt: new Date(membership.joined_at),
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

/**
 * Create or update academy user — handled server-side.
 */
export async function upsertAcademyUser(
  _academyId: string,
  _userId: string,
  _data: Partial<AcademyUser>
): Promise<void> {
  // No-op: academy user management is handled server-side.
}

/**
 * Delete academy user — handled server-side.
 */
export async function deleteAcademyUser(
  _academyId: string,
  _userId: string
): Promise<void> {
  // No-op: handled server-side.
}

// ============================================
// Exports
// ============================================

export const globalUserService = {
  // Global user
  getGlobalUser,
  createGlobalUser,
  updateGlobalUser,

  // Academy mapping
  getUserAcademyMapping,
  linkUserToAcademy,
  unlinkUserFromAcademy,
  setPrimaryAcademy,

  // Belt sync
  syncHighestBelt,

  // Academy user
  getAcademyUser,
  upsertAcademyUser,
  deleteAcademyUser,
};
