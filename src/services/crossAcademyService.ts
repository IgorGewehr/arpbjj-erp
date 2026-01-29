/**
 * Cross-Academy Service
 * Fetches data across all academies a user is linked to.
 * Used by monitors/professors to see a student's complete history.
 */

import {
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { collections, rootCollections } from '@/lib/firebase/collections';
import {
  BeltProgression,
  CompetitionResult,
  UserAcademyMapping,
  BeltColor,
  KidsBeltColor,
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
// Helper: Convert Firestore documents
// ============================================

const docToBeltProgression = (doc: DocumentSnapshot): BeltProgression => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    studentId: data.studentId,
    previousBelt: data.previousBelt,
    previousStripes: data.previousStripes,
    newBelt: data.newBelt,
    newStripes: data.newStripes,
    promotionDate: data.promotionDate instanceof Timestamp ? data.promotionDate.toDate() : new Date(data.promotionDate),
    totalClasses: data.totalClasses,
    promotedBy: data.promotedBy,
    promotedByName: data.promotedByName,
    notes: data.notes,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  };
};

const docToCompetitionResult = (doc: DocumentSnapshot): CompetitionResult => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    competitionId: data.competitionId,
    competitionName: data.competitionName,
    studentId: data.studentId,
    studentName: data.studentName,
    position: data.position,
    beltCategory: data.beltCategory,
    ageCategory: data.ageCategory,
    weightCategory: data.weightCategory,
    notes: data.notes,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    createdBy: data.createdBy,
  };
};

// ============================================
// Get Academy Name Helper
// ============================================

async function getAcademyName(academyId: string): Promise<string> {
  try {
    const academyRef = collections.academy(academyId);
    const academySnap = await getDoc(academyRef);
    if (academySnap.exists()) {
      const data = academySnap.data();
      return (data?.name as string) || academyId;
    }
    return academyId;
  } catch {
    return academyId;
  }
}

// ============================================
// Get User Academy Mapping
// ============================================

async function getUserAcademyMapping(linkedUserId: string): Promise<UserAcademyMapping | null> {
  const mappingRef = rootCollections.userAcademyMappingDoc(linkedUserId);
  const mappingSnap = await getDoc(mappingRef);

  if (!mappingSnap.exists()) {
    return null;
  }

  const data = mappingSnap.data() as Record<string, unknown>;
  return {
    id: mappingSnap.id,
    academyIds: (data.academyIds as string[]) || [],
    primaryAcademyId: data.primaryAcademyId as string | undefined,
    academyDetails: data.academyDetails as UserAcademyMapping['academyDetails'],
    updatedAt: data.updatedAt
      ? (data.updatedAt as Timestamp).toDate()
      : undefined,
  };
}

// ============================================
// Check if Global User Profile is Public
// ============================================

async function isProfilePublic(linkedUserId: string): Promise<boolean> {
  try {
    const userRef = rootCollections.user(linkedUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      return (data?.isProfilePublic as boolean) || false;
    }
    return false;
  } catch {
    return false;
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
    // Optionally exclude current academy
    if (excludeAcademyId && academyId === excludeAcademyId) continue;

    const academyDetail = mapping.academyDetails?.[academyId];
    if (!academyDetail?.studentId) continue;

    const studentId = academyDetail.studentId;
    const academyName = await getAcademyName(academyId);

    try {
      const progressionsRef = collections.beltProgressions(academyId);
      const q = query(progressionsRef, where('studentId', '==', studentId));
      const snapshot = await getDocs(q);

      const progressions = snapshot.docs.map((doc) => ({
        ...docToBeltProgression(doc),
        academyId,
        academyName,
      }));

      allProgressions.push(...progressions);
    } catch (error) {
      console.error(`Error fetching belt progressions for academy ${academyId}:`, error);
    }
  }

  // Sort by promotion date descending
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
    // Optionally exclude current academy
    if (excludeAcademyId && academyId === excludeAcademyId) continue;

    const academyDetail = mapping.academyDetails?.[academyId];
    if (!academyDetail?.studentId) continue;

    const studentId = academyDetail.studentId;
    const academyName = await getAcademyName(academyId);

    try {
      const resultsRef = collections.competitionResults(academyId);
      const q = query(resultsRef, where('studentId', '==', studentId));
      const snapshot = await getDocs(q);

      const results = snapshot.docs.map((doc) => ({
        ...docToCompetitionResult(doc),
        academyId,
        academyName,
      }));

      allResults.push(...results);
    } catch (error) {
      console.error(`Error fetching competition results for academy ${academyId}:`, error);
    }
  }

  // Sort by date descending
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
      // Get student to check for initialAttendanceCount
      const studentRef = collections.student(academyId, studentId);
      const studentSnap = await getDoc(studentRef);
      let initialCount = 0;
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        initialCount = (studentData?.initialAttendanceCount as number) || 0;
      }

      // Count attendance records
      const attendanceRef = collections.attendance(academyId);
      const q = query(attendanceRef, where('studentId', '==', studentId));
      const snapshot = await getDocs(q);
      const count = snapshot.size;

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

    // Get student belt info
    const studentRef = collections.student(academyId, academyDetail.studentId);
    const studentSnap = await getDoc(studentRef);
    let currentBelt: BeltColor | KidsBeltColor = 'white';
    let currentStripes = 0;

    if (studentSnap.exists()) {
      const studentData = studentSnap.data();
      currentBelt = (studentData?.currentBelt as BeltColor | KidsBeltColor) || 'white';
      currentStripes = (studentData?.currentStripes as number) || 0;
    }

    academies.push({
      academyId,
      academyName,
      studentId: academyDetail.studentId,
      currentBelt,
      currentStripes,
    });
  }

  // Get belt progressions from other academies (exclude current)
  const beltProgressions = await getBeltProgressionsAcrossAcademies(linkedUserId, currentAcademyId);

  // Get competition results from other academies (exclude current)
  const competitionResults = await getCompetitionResultsAcrossAcademies(linkedUserId, currentAcademyId);

  // Get attendance stats from all academies
  const attendanceStats = await getAttendanceStatsAcrossAcademies(linkedUserId);

  // Calculate totals
  const totalAttendance = attendanceStats.reduce((sum, stat) => sum + stat.totalCount, 0);

  // Calculate medal count from all academies
  const medalCount = { gold: 0, silver: 0, bronze: 0, total: 0 };

  // Get all results (including current academy) for medal count
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
  isProfilePublic,
  getBeltProgressionsAcrossAcademies,
  getCompetitionResultsAcrossAcademies,
  getAttendanceStatsAcrossAcademies,
  getStudentGlobalHistory,
};

export default crossAcademyService;
