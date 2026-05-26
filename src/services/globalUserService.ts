/**
 * Global User Service
 * Manages users at ROOT /users/{uid} (independent of academies)
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { rootCollections, collections } from '@/lib/firebase/collections';
import { removeUndefinedDeep } from '@/lib/firestoreUtils';
import {
  GlobalUser,
  AccountType,
  UserAcademyMapping,
  AcademyUser,
  UserRole,
  BeltColor,
  KidsBeltColor,
  Stripes,
} from '@/types';

// ============================================
// Type Converters
// ============================================

function docToGlobalUser(
  docData: Record<string, unknown>,
  id: string
): GlobalUser {
  return {
    id,
    email: (docData.email as string) || '',
    displayName: (docData.displayName as string) || '',
    photoUrl: docData.photoUrl as string | undefined,
    phone: docData.phone as string | undefined,
    accountType: (docData.accountType as AccountType) || 'free',
    birthDate: docData.birthDate
      ? (docData.birthDate as Timestamp).toDate()
      : undefined,
    cpf: docData.cpf as string | undefined,
    weight: docData.weight as number | undefined,
    jiujitsuStartDate: docData.jiujitsuStartDate
      ? (docData.jiujitsuStartDate as Timestamp).toDate()
      : undefined,
    highestBelt: docData.highestBelt as BeltColor | KidsBeltColor | undefined,
    highestStripes: docData.highestStripes as Stripes | undefined,
    isProfilePublic: (docData.isProfilePublic as boolean) || false,
    createdAt: docData.createdAt
      ? (docData.createdAt as Timestamp).toDate()
      : new Date(),
    updatedAt: docData.updatedAt
      ? (docData.updatedAt as Timestamp).toDate()
      : new Date(),
  };
}

function docToUserAcademyMapping(
  docData: Record<string, unknown>,
  id: string
): UserAcademyMapping {
  return {
    id,
    academyIds: (docData.academyIds as string[]) || [],
    primaryAcademyId: docData.primaryAcademyId as string | undefined,
    academyDetails: docData.academyDetails as UserAcademyMapping['academyDetails'],
    updatedAt: docData.updatedAt
      ? (docData.updatedAt as Timestamp).toDate()
      : undefined,
  };
}

// ============================================
// Global User CRUD
// ============================================

/**
 * Get global user by ID
 */
export async function getGlobalUser(userId: string): Promise<GlobalUser | null> {
  const userRef = rootCollections.user(userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return docToGlobalUser(userSnap.data() as Record<string, unknown>, userSnap.id);
}

/**
 * Create a new global user (for free accounts or first-time signup)
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
  const userRef = rootCollections.user(userId);
  const mappingRef = rootCollections.userAcademyMappingDoc(userId);

  const userData = {
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl || null,
    phone: data.phone || null,
    accountType: data.accountType || 'free',
    isProfilePublic: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Race-safe create. onAuthStateChanged fires this auto-create the instant
  // createUserWithEmailAndPassword resolves, which runs CONCURRENTLY with the
  // account/academy creation pages (criar-conta, criar-academia) writing the
  // populated user + mapping docs. A plain setDoc here would clobber those
  // richer docs — emptying the mapping causes the post-signup "infinite
  // loading" (AcademyContext finds no academy). The transaction only writes
  // each doc when it does not already exist, and Firestore aborts+retries if a
  // concurrent write lands between the read and commit, so a populated mapping
  // is never overwritten with an empty one.
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const mappingSnap = await tx.get(mappingRef);
    if (!userSnap.exists()) {
      tx.set(userRef, userData);
    }
    if (!mappingSnap.exists()) {
      tx.set(mappingRef, {
        academyIds: [],
        primaryAcademyId: null,
        academyDetails: {},
        updatedAt: serverTimestamp(),
      });
    }
  });

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
  userId: string,
  data: Partial<Omit<GlobalUser, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const userRef = rootCollections.user(userId);

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Convert dates to Timestamps
  if (data.birthDate) {
    updateData.birthDate = Timestamp.fromDate(data.birthDate);
  }
  if (data.jiujitsuStartDate) {
    updateData.jiujitsuStartDate = Timestamp.fromDate(data.jiujitsuStartDate);
  }

  await updateDoc(userRef, removeUndefinedDeep(updateData));
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
  const mappingRef = rootCollections.userAcademyMappingDoc(userId);
  const mappingSnap = await getDoc(mappingRef);

  if (!mappingSnap.exists()) {
    return null;
  }

  return docToUserAcademyMapping(
    mappingSnap.data() as Record<string, unknown>,
    mappingSnap.id
  );
}

/**
 * Link user to an academy
 */
export async function linkUserToAcademy(
  userId: string,
  academyId: string,
  data: {
    studentId?: string;
    role: UserRole;
    extraPermissions?: import('@/types').Permission[];
  }
): Promise<void> {
  const mappingRef = rootCollections.userAcademyMappingDoc(userId);
  const userRef = rootCollections.user(userId);

  // Get current mapping
  const mappingSnap = await getDoc(mappingRef);
  const currentMapping = mappingSnap.exists()
    ? (mappingSnap.data() as Record<string, unknown>)
    : null;

  const academyDetail: Record<string, unknown> = {
    studentId: data.studentId || null,
    role: data.role,
    joinedAt: serverTimestamp(),
    status: 'active',
  };
  // Only persist extraPermissions when the role can actually use them.
  // Students never have extras; admins already get everything by default.
  if (data.extraPermissions && data.extraPermissions.length > 0) {
    academyDetail.extraPermissions = data.extraPermissions;
  }

  if (currentMapping) {
    // Update existing mapping
    await updateDoc(mappingRef, {
      academyIds: arrayUnion(academyId),
      primaryAcademyId:
        currentMapping.primaryAcademyId || academyId, // Keep existing or set new
      [`academyDetails.${academyId}`]: academyDetail,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Create new mapping
    await setDoc(mappingRef, {
      academyIds: [academyId],
      primaryAcademyId: academyId,
      academyDetails: {
        [academyId]: academyDetail,
      },
      updatedAt: serverTimestamp(),
    });
  }

  // Update global user accountType to 'linked'
  await updateDoc(userRef, {
    accountType: 'linked',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Unlink user from an academy
 */
export async function unlinkUserFromAcademy(
  userId: string,
  academyId: string
): Promise<void> {
  const mappingRef = rootCollections.userAcademyMappingDoc(userId);
  const userRef = rootCollections.user(userId);

  // Get current mapping
  const mappingSnap = await getDoc(mappingRef);
  if (!mappingSnap.exists()) {
    return;
  }

  const currentMapping = mappingSnap.data() as Record<string, unknown>;
  const currentAcademyIds = (currentMapping.academyIds as string[]) || [];
  const currentDetails = (currentMapping.academyDetails as Record<string, unknown>) || {};

  // Remove academy from list
  const newAcademyIds = currentAcademyIds.filter((id) => id !== academyId);

  // Remove academy details
  const newDetails = { ...currentDetails };
  delete newDetails[academyId];

  // Determine new primary academy
  const newPrimaryAcademyId =
    currentMapping.primaryAcademyId === academyId
      ? newAcademyIds[0] || null
      : currentMapping.primaryAcademyId;

  // Update mapping
  await updateDoc(mappingRef, {
    academyIds: newAcademyIds,
    primaryAcademyId: newPrimaryAcademyId,
    academyDetails: newDetails,
    updatedAt: serverTimestamp(),
  });

  // If no more academies, set user back to 'free'
  if (newAcademyIds.length === 0) {
    await updateDoc(userRef, {
      accountType: 'free',
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Set primary academy for user
 */
export async function setPrimaryAcademy(
  userId: string,
  academyId: string
): Promise<void> {
  const mappingRef = rootCollections.userAcademyMappingDoc(userId);

  await updateDoc(mappingRef, {
    primaryAcademyId: academyId,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Belt Synchronization
// ============================================

/**
 * Belt comparison helper (higher belt returns positive)
 */
const BELT_ORDER: (BeltColor | KidsBeltColor)[] = [
  // Kids belts
  'white',
  'grey',
  'grey-white',
  'grey-black',
  'yellow',
  'yellow-white',
  'yellow-black',
  'orange',
  'orange-white',
  'orange-black',
  'green',
  'green-white',
  'green-black',
  // Adult belts
  'blue',
  'purple',
  'brown',
  'black',
];

function compareBelts(
  belt1: BeltColor | KidsBeltColor,
  belt2: BeltColor | KidsBeltColor
): number {
  const index1 = BELT_ORDER.indexOf(belt1);
  const index2 = BELT_ORDER.indexOf(belt2);
  return index1 - index2;
}

/**
 * Sync highest belt from all linked academies
 * Call this after any belt change in any academy
 */
export async function syncHighestBelt(userId: string): Promise<void> {
  const userRef = rootCollections.user(userId);
  const mappingRef = rootCollections.userAcademyMappingDoc(userId);

  // Get mapping
  const mappingSnap = await getDoc(mappingRef);
  if (!mappingSnap.exists()) {
    return;
  }

  const mapping = mappingSnap.data() as Record<string, unknown>;
  const academyIds = (mapping.academyIds as string[]) || [];

  if (academyIds.length === 0) {
    return;
  }

  let highestBelt: BeltColor | KidsBeltColor = 'white';
  let highestStripes: Stripes = 0;
  let earliestJiujitsuStart: Date | undefined;

  // Check each academy
  for (const academyId of academyIds) {
    const academyDetails = (mapping.academyDetails as Record<string, unknown>)?.[academyId] as Record<string, unknown> | undefined;
    if (!academyDetails?.studentId) continue;

    const studentRef = collections.student(academyId, academyDetails.studentId as string);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) continue;

    const studentData = studentSnap.data() as Record<string, unknown>;
    const belt = studentData.currentBelt as BeltColor | KidsBeltColor;
    const stripes = (studentData.currentStripes as Stripes) || 0;
    const jiujitsuStart = studentData.jiujitsuStartDate
      ? (studentData.jiujitsuStartDate as Timestamp).toDate()
      : undefined;

    // Compare belts
    if (compareBelts(belt, highestBelt) > 0) {
      highestBelt = belt;
      highestStripes = stripes;
    } else if (belt === highestBelt && stripes > highestStripes) {
      highestStripes = stripes;
    }

    // Track earliest jiu-jitsu start date
    if (jiujitsuStart) {
      if (!earliestJiujitsuStart || jiujitsuStart < earliestJiujitsuStart) {
        earliestJiujitsuStart = jiujitsuStart;
      }
    }
  }

  // Update global user
  const updateData: Record<string, unknown> = {
    highestBelt,
    highestStripes,
    updatedAt: serverTimestamp(),
  };

  if (earliestJiujitsuStart) {
    updateData.jiujitsuStartDate = Timestamp.fromDate(earliestJiujitsuStart);
  }

  await updateDoc(userRef, updateData);
}

// ============================================
// Academy User Management
// ============================================

/**
 * Get academy user (user within academy context)
 */
export async function getAcademyUser(
  academyId: string,
  userId: string
): Promise<AcademyUser | null> {
  const userRef = collections.user(academyId, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  const data = userSnap.data() as Record<string, unknown>;
  return {
    id: userSnap.id,
    email: (data.email as string) || '',
    displayName: (data.displayName as string) || '',
    photoUrl: data.photoUrl as string | undefined,
    role: (data.role as UserRole) || 'student',
    phone: data.phone as string | undefined,
    studentId: data.studentId as string | undefined,
    linkedStudentIds: data.linkedStudentIds as string[] | undefined,
    instructorId: data.instructorId as string | undefined,
    pendingStudentLink: data.pendingStudentLink as string | undefined,
    approvedAt: data.approvedAt
      ? (data.approvedAt as Timestamp).toDate()
      : undefined,
    status: data.status as 'active' | 'inactive' | 'pending' | undefined,
    joinedAt: data.joinedAt
      ? (data.joinedAt as Timestamp).toDate()
      : undefined,
    createdAt: data.createdAt
      ? (data.createdAt as Timestamp).toDate()
      : new Date(),
    updatedAt: data.updatedAt
      ? (data.updatedAt as Timestamp).toDate()
      : new Date(),
  };
}

/**
 * Create or update academy user
 */
export async function upsertAcademyUser(
  academyId: string,
  userId: string,
  data: Partial<AcademyUser>
): Promise<void> {
  const userRef = collections.user(academyId, userId);

  const userData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Convert dates
  if (data.approvedAt) {
    userData.approvedAt = Timestamp.fromDate(data.approvedAt);
  }
  if (data.joinedAt) {
    userData.joinedAt = Timestamp.fromDate(data.joinedAt);
  }

  await setDoc(userRef, removeUndefinedDeep(userData), { merge: true });
}

/**
 * Delete academy user (when leaving academy)
 */
export async function deleteAcademyUser(
  academyId: string,
  userId: string
): Promise<void> {
  const userRef = collections.user(academyId, userId);
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(userRef);
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
