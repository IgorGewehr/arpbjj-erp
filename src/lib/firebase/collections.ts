import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './config';

// ============================================
// Collection Path Helpers (Multi-Tenant)
// ============================================

/**
 * Get the full path for a subcollection within an academy
 */
export function getCollectionPath(academyId: string, collectionName: string): string {
  return `academies/${academyId}/${collectionName}`;
}

/**
 * Get a CollectionReference for a subcollection within an academy
 */
export function getCollection(
  academyId: string,
  collectionName: string
): CollectionReference {
  return collection(db, getCollectionPath(academyId, collectionName));
}

/**
 * Get a DocumentReference for a document within an academy subcollection
 */
export function getDocRef(
  academyId: string,
  collectionName: string,
  docId: string
): DocumentReference {
  return doc(db, getCollectionPath(academyId, collectionName), docId);
}

/**
 * Get the academy document reference
 */
export function getAcademyRef(academyId: string): DocumentReference {
  return doc(db, 'academies', academyId);
}

/**
 * Get the user-academy mapping document reference
 */
export function getUserAcademyMappingRef(userId: string): DocumentReference {
  return doc(db, 'userAcademyMapping', userId);
}

// ============================================
// Typed Collection Helpers
// ============================================
export const collections = {
  // Academy document
  academy: (academyId: string) => getAcademyRef(academyId),

  // Academy subcollections
  users: (academyId: string) => getCollection(academyId, 'users'),
  students: (academyId: string) => getCollection(academyId, 'students'),
  classes: (academyId: string) => getCollection(academyId, 'classes'),
  attendance: (academyId: string) => getCollection(academyId, 'attendance'),
  financials: (academyId: string) => getCollection(academyId, 'financials'),
  achievements: (academyId: string) => getCollection(academyId, 'achievements'),
  beltProgressions: (academyId: string) => getCollection(academyId, 'beltProgressions'),
  competitions: (academyId: string) => getCollection(academyId, 'competitions'),
  competitionResults: (academyId: string) => getCollection(academyId, 'competitionResults'),
  competitionEnrollments: (academyId: string) => getCollection(academyId, 'competitionEnrollments'),
  plans: (academyId: string) => getCollection(academyId, 'plans'),
  linkCodes: (academyId: string) => getCollection(academyId, 'linkCodes'),
  assessments: (academyId: string) => getCollection(academyId, 'assessments'),
  notifications: (academyId: string) => getCollection(academyId, 'notifications'),
  walletTransactions: (academyId: string) => getCollection(academyId, 'walletTransactions'),
  storeProducts: (academyId: string) => getCollection(academyId, 'storeProducts'),
  storeOrders: (academyId: string) => getCollection(academyId, 'storeOrders'),

  // Document references
  user: (academyId: string, userId: string) => getDocRef(academyId, 'users', userId),
  student: (academyId: string, studentId: string) => getDocRef(academyId, 'students', studentId),
  class: (academyId: string, classId: string) => getDocRef(academyId, 'classes', classId),
  attendanceDoc: (academyId: string, attendanceId: string) => getDocRef(academyId, 'attendance', attendanceId),
  financial: (academyId: string, financialId: string) => getDocRef(academyId, 'financials', financialId),
  achievement: (academyId: string, achievementId: string) => getDocRef(academyId, 'achievements', achievementId),
  beltProgression: (academyId: string, progressionId: string) => getDocRef(academyId, 'beltProgressions', progressionId),
  competition: (academyId: string, competitionId: string) => getDocRef(academyId, 'competitions', competitionId),
  competitionResult: (academyId: string, resultId: string) => getDocRef(academyId, 'competitionResults', resultId),
  competitionEnrollment: (academyId: string, enrollmentId: string) => getDocRef(academyId, 'competitionEnrollments', enrollmentId),
  plan: (academyId: string, planId: string) => getDocRef(academyId, 'plans', planId),
  linkCode: (academyId: string, codeId: string) => getDocRef(academyId, 'linkCodes', codeId),
  assessment: (academyId: string, assessmentId: string) => getDocRef(academyId, 'assessments', assessmentId),
  notification: (academyId: string, notificationId: string) => getDocRef(academyId, 'notifications', notificationId),
  walletTransaction: (academyId: string, transactionId: string) => getDocRef(academyId, 'walletTransactions', transactionId),
  wallet: (academyId: string) => doc(db, `academies/${academyId}/wallet`, 'balance'),
  storeProduct: (academyId: string, productId: string) => getDocRef(academyId, 'storeProducts', productId),
  storeOrder: (academyId: string, orderId: string) => getDocRef(academyId, 'storeOrders', orderId),
};

// ============================================
// Root Collections (not per-academy)
// ============================================
export const rootCollections = {
  // Academy documents
  academies: () => collection(db, 'academies'),

  // Global users (identity independent of academies)
  users: () => collection(db, 'users'),
  user: (userId: string) => doc(db, 'users', userId),

  // User-to-Academy mapping
  userAcademyMapping: () => collection(db, 'userAcademyMapping'),
  userAcademyMappingDoc: (userId: string) => doc(db, 'userAcademyMapping', userId),
};
