/**
 * Cross-Academy Service
 * Fetches data across all academies a user is linked to.
 * Uses /v1/me to get memberships, then queries per-academy endpoints.
 */

import { api } from '@/lib/api/client';
import {
  BeltProgression,
  CompetitionResult,
  UserAcademyMapping,
  BeltColor,
  KidsBeltColor,
  UserRole,
} from '@/types';

// ============================================
// Types for Cross-Academy Data
// ============================================

export interface CrossAcademyBeltProgression extends BeltProgression {
  academyId: string;
  academyName: string;
}

export interface CrossAcademyCompetitionResult extends CompetitionResult {
  academyId: string;
  academyName: string;
}

export interface AcademyAttendanceStats {
  academyId: string;
  academyName: string;
  count: number;
  initialCount: number;
  totalCount: number;
}

export interface CrossAcademyStudentHistory {
  linkedUserId: string;
  isProfilePublic: boolean;
  academies: {
    academyId: string;
    academyName: string;
    studentId: string;
    currentBelt: BeltColor | KidsBeltColor;
    currentStripes: number;
  }[];
  beltProgressions: CrossAcademyBeltProgression[];
  competitionResults: CrossAcademyCompetitionResult[];
  attendanceStats: AcademyAttendanceStats[];
  totalAttendance: number;
  medalCount: {
    gold: number;
    silver: number;
    bronze: number;
    total: number;
  };
}

// ============================================
// Raw /v1/me response
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
// Helper: map /v1/me to UserAcademyMapping
// ============================================

function mapMeToUserAcademyMapping(raw: RawMeResponse): UserAcademyMapping {
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
    id: raw.user.uid,
    academyIds,
    primaryAcademyId: raw.primary_academy_id || undefined,
    academyDetails,
    updatedAt: new Date(),
  };
}

// ============================================
// Get User Academy Mapping
// ============================================

async function getUserAcademyMapping(linkedUserId: string): Promise<UserAcademyMapping | null> {
  try {
    const raw = await api.get<RawMeResponse>('/v1/me');
    return mapMeToUserAcademyMapping(raw);
  } catch {
    return null;
  }
}

// ============================================
// Check if Global User Profile is Public
// ============================================

async function isProfilePublic(_linkedUserId: string): Promise<boolean> {
  try {
    const raw = await api.get<RawMeResponse>('/v1/me');
    // Go backend may expose isProfilePublic on user object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw.user as any).is_profile_public ?? false;
  } catch {
    return false;
  }
}

// ============================================
// Get Academy Name Helper
// ============================================

async function getAcademyName(academyId: string): Promise<string> {
  try {
    const res = await api.get<{ items: Array<{ key: string; value: unknown }> } | Array<{ key: string; value: unknown }>>(
      `/v1/academies/${academyId}/settings`
    );
    const items = Array.isArray(res) ? res : (res as { items: Array<{ key: string; value: unknown }> }).items ?? [];
    const nameSetting = items.find((s) => s.key === 'name');
    return (nameSetting?.value as string) || academyId;
  } catch {
    return academyId;
  }
}

// ============================================
// Get Belt Progressions Across Academies
// ============================================

export async function getBeltProgressionsAcrossAcademies(
  linkedUserId: string,
  excludeAcademyId?: string
): Promise<CrossAcademyBeltProgression[]> {
  const mapping = await getUserAcademyMapping(linkedUserId);
  if (!mapping) return [];

  const allProgressions: CrossAcademyBeltProgression[] = [];

  for (const academyId of mapping.academyIds) {
    if (excludeAcademyId && academyId === excludeAcademyId) continue;

    const academyDetail = mapping.academyDetails?.[academyId];
    if (!academyDetail?.studentId) continue;

    const studentId = academyDetail.studentId;
    const academyName = await getAcademyName(academyId);

    try {
      const _bpRes = await api.get<{ items: unknown[] } | unknown[]>(
        `/v1/academies/${academyId}/students/${studentId}/belt-progressions`
      );
      const raw = Array.isArray(_bpRes) ? _bpRes : (_bpRes as { items: unknown[] }).items ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressions: CrossAcademyBeltProgression[] = raw.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        previousBelt: r.previous_belt,
        previousStripes: r.previous_stripes,
        newBelt: r.new_belt,
        newStripes: r.new_stripes,
        promotionDate: new Date(r.promotion_date),
        totalClasses: r.total_classes ?? 0,
        effectiveCountAtPromotion: r.effective_count_at_promotion,
        promotedBy: r.promoted_by,
        promotedByName: r.promoted_by_name,
        notes: r.notes,
        createdAt: new Date(r.created_at),
        academyId,
        academyName,
      }));
      allProgressions.push(...progressions);
    } catch (error) {
      console.error(`Error fetching belt progressions for academy ${academyId}:`, error);
    }
  }

  return allProgressions.sort((a, b) => b.promotionDate.getTime() - a.promotionDate.getTime());
}

// ============================================
// Get Competition Results Across Academies
// ============================================

export async function getCompetitionResultsAcrossAcademies(
  linkedUserId: string,
  excludeAcademyId?: string
): Promise<CrossAcademyCompetitionResult[]> {
  const mapping = await getUserAcademyMapping(linkedUserId);
  if (!mapping) return [];

  const allResults: CrossAcademyCompetitionResult[] = [];

  for (const academyId of mapping.academyIds) {
    if (excludeAcademyId && academyId === excludeAcademyId) continue;

    const academyDetail = mapping.academyDetails?.[academyId];
    if (!academyDetail?.studentId) continue;

    const studentId = academyDetail.studentId;
    const academyName = await getAcademyName(academyId);

    try {
      // Fetch all competitions then collect results for student
      const _compRes = await api.get<{ items: Array<{ id: string }> } | Array<{ id: string }>>(
        `/v1/academies/${academyId}/competitions`
      );
      const competitions = Array.isArray(_compRes) ? _compRes : (_compRes as { items: Array<{ id: string }> }).items ?? [];
      for (const comp of competitions) {
        try {
          const _rRes = await api.get<{ items: unknown[] } | unknown[]>(
            `/v1/academies/${academyId}/competitions/${comp.id}/results`
          );
          const rawResults = Array.isArray(_rRes) ? _rRes : (_rRes as { items: unknown[] }).items ?? [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const studentResults = rawResults.filter((r: any) => r.student_id === studentId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: CrossAcademyCompetitionResult[] = studentResults.map((r: any) => ({
            id: r.id,
            competitionId: r.competition_id,
            competitionName: r.competition_name,
            studentId: r.student_id,
            studentName: r.student_name,
            position: r.position,
            beltCategory: r.belt_category,
            ageCategory: r.age_category,
            weightCategory: r.weight_category,
            modality: r.modality,
            divisionType: r.division_type,
            notes: r.notes,
            date: new Date(r.date),
            createdAt: new Date(r.created_at),
            updatedAt: new Date(r.updated_at),
            createdBy: r.created_by || '',
            academyId,
            academyName,
          }));
          allResults.push(...mapped);
        } catch {
          // skip
        }
      }
    } catch (error) {
      console.error(`Error fetching competition results for academy ${academyId}:`, error);
    }
  }

  return allResults.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ============================================
// Get Attendance Stats Across Academies
// ============================================

export async function getAttendanceStatsAcrossAcademies(
  linkedUserId: string
): Promise<AcademyAttendanceStats[]> {
  const mapping = await getUserAcademyMapping(linkedUserId);
  if (!mapping) return [];

  const stats: AcademyAttendanceStats[] = [];

  for (const academyId of mapping.academyIds) {
    const academyDetail = mapping.academyDetails?.[academyId];
    if (!academyDetail?.studentId) continue;

    const studentId = academyDetail.studentId;
    const academyName = await getAcademyName(academyId);

    try {
      // Attendance count is embedded in the student object (attendance_count +
      // initial_attendance_count). There is no standalone /attendance/stats
      // endpoint in the Go backend.
      const student = await api.get<{
        attendance_count: number;
        initial_attendance_count?: number;
      }>(`/v1/academies/${academyId}/students/${studentId}`);

      const count = student.attendance_count ?? 0;
      const initialCount = student.initial_attendance_count ?? 0;

      stats.push({
        academyId,
        academyName,
        count,
        initialCount,
        totalCount: count + initialCount,
      });
    } catch (error) {
      console.error(`Error fetching attendance stats for academy ${academyId}:`, error);
    }
  }

  return stats;
}

// ============================================
// Get Academies for User
// ============================================
export async function getAcademiesForUser(linkedUserId: string): Promise<UserAcademyMapping | null> {
  return getUserAcademyMapping(linkedUserId);
}

// ============================================
// Get Complete Student History Across Academies
// ============================================

export async function getStudentGlobalHistory(
  linkedUserId: string,
  currentAcademyId?: string
): Promise<CrossAcademyStudentHistory | null> {
  const mapping = await getUserAcademyMapping(linkedUserId);
  if (!mapping) return null;

  const profilePublic = await isProfilePublic(linkedUserId);

  // Get academy info for all linked academies
  const academies: CrossAcademyStudentHistory['academies'] = [];
  for (const academyId of mapping.academyIds) {
    const academyDetail = mapping.academyDetails?.[academyId];
    if (!academyDetail?.studentId) continue;

    const academyName = await getAcademyName(academyId);

    let currentBelt: BeltColor | KidsBeltColor = 'white';
    let currentStripes = 0;

    try {
      const student = await api.get<{ current_belt?: string; current_stripes?: number }>(
        `/v1/academies/${academyId}/students/${academyDetail.studentId}`
      );
      currentBelt = (student.current_belt as BeltColor | KidsBeltColor) || 'white';
      currentStripes = student.current_stripes ?? 0;
    } catch {
      // keep defaults
    }

    academies.push({
      academyId,
      academyName,
      studentId: academyDetail.studentId,
      currentBelt,
      currentStripes,
    });
  }

  const beltProgressions = await getBeltProgressionsAcrossAcademies(linkedUserId, currentAcademyId);
  const competitionResults = await getCompetitionResultsAcrossAcademies(linkedUserId, currentAcademyId);
  const attendanceStats = await getAttendanceStatsAcrossAcademies(linkedUserId);

  const totalAttendance = attendanceStats.reduce((sum, stat) => sum + stat.totalCount, 0);

  const medalCount = { gold: 0, silver: 0, bronze: 0, total: 0 };
  const allResults = await getCompetitionResultsAcrossAcademies(linkedUserId);
  allResults.forEach((result) => {
    if (result.position === 'gold') medalCount.gold++;
    else if (result.position === 'silver') medalCount.silver++;
    else if (result.position === 'bronze') medalCount.bronze++;
    medalCount.total++;
  });

  return {
    linkedUserId,
    isProfilePublic: profilePublic,
    academies,
    beltProgressions,
    competitionResults,
    attendanceStats,
    totalAttendance,
    medalCount,
  };
}

// ============================================
// Exports
// ============================================

export const crossAcademyService = {
  getUserAcademyMapping,
  getAcademiesForUser,
  isProfilePublic,
  getBeltProgressionsAcrossAcademies,
  getCompetitionResultsAcrossAcademies,
  getAttendanceStatsAcrossAcademies,
  getStudentGlobalHistory,
};

export default crossAcademyService;
