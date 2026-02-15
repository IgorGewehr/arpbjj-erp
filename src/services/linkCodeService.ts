import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { collections } from '@/lib/firebase/collections';
import { LinkCode } from '@/types';

// Default academy for backwards compatibility
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

// Code expiration time in hours
const CODE_EXPIRATION_HOURS = 24;

// ============================================
// Helper: Generate random code
// ============================================
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ============================================
// Helper: Convert Firestore document to LinkCode
// ============================================
const docToLinkCode = (doc: DocumentSnapshot): LinkCode => {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: doc.id,
    code: data.code,
    studentId: data.studentId,
    studentName: data.studentName,
    createdBy: data.createdBy,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : data.createdAt
        ? new Date(data.createdAt)
        : new Date(),
    expiresAt: data.expiresAt instanceof Timestamp
      ? data.expiresAt.toDate()
      : data.expiresAt
        ? new Date(data.expiresAt)
        : new Date(),
    usedAt: data.usedAt instanceof Timestamp
      ? data.usedAt.toDate()
      : data.usedAt
        ? new Date(data.usedAt)
        : undefined,
    usedBy: data.usedBy,
  };
};

// ============================================
// Link Code Service (Multi-Tenant)
// ============================================
export class LinkCodeService {
  private academyId: string;
  private linkCodesRef: CollectionReference;

  constructor(academyId: string) {
    this.academyId = academyId;
    this.linkCodesRef = collections.linkCodes(academyId);
  }

  // ============================================
  // Generate New Code for Student
  // ============================================
  async generate(
    studentId: string,
    studentName: string,
    createdBy: string
  ): Promise<LinkCode> {
    // Check if student already has an active code
    const existingCode = await this.getActiveForStudent(studentId);
    if (existingCode) {
      // Return existing code if still valid
      return existingCode;
    }

    // Generate unique code
    let code: string;
    let isUnique = false;

    do {
      code = generateCode();
      const existing = await this.getByCode(code);
      isUnique = !existing;
    } while (!isUnique);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_EXPIRATION_HOURS * 60 * 60 * 1000);

    const docData = {
      code,
      studentId,
      studentName,
      createdBy,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      usedAt: null,
      usedBy: null,
    };

    const docRef = await addDoc(this.linkCodesRef, docData);

    // Return the link code object directly without re-fetching
    const linkCode: LinkCode = {
      id: docRef.id,
      code,
      studentId,
      studentName,
      createdBy,
      createdAt: now,
      expiresAt,
    };

    return linkCode;
  }

  // ============================================
  // Get Code by Code String
  // ============================================
  async getByCode(code: string): Promise<LinkCode | null> {
    const q = query(
      this.linkCodesRef,
      where('code', '==', code.toUpperCase())
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return docToLinkCode(snapshot.docs[0]);
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
  // Mark Code as Used
  // ============================================
  async markAsUsed(code: string, userId: string): Promise<LinkCode> {
    const linkCode = await this.getByCode(code);
    if (!linkCode) {
      throw new Error('Código não encontrado');
    }

    const now = new Date();
    const docRef = collections.linkCode(this.academyId, linkCode.id);

    await updateDoc(docRef, {
      usedAt: Timestamp.fromDate(now),
      usedBy: userId,
    });

    // Return updated link code without re-fetching
    return {
      ...linkCode,
      usedAt: now,
      usedBy: userId,
    };
  }

  // ============================================
  // Get Active Code for Student
  // ============================================
  async getActiveForStudent(studentId: string): Promise<LinkCode | null> {
    // Query by studentId only, sort client-side to avoid composite index
    const q = query(
      this.linkCodesRef,
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const codes = snapshot.docs.map(docToLinkCode);

    // Sort by createdAt desc client-side
    codes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Find first valid code (not used and not expired)
    const now = new Date();
    for (const linkCode of codes) {
      if (!linkCode.usedAt && now < linkCode.expiresAt) {
        return linkCode;
      }
    }

    return null;
  }

  // ============================================
  // Get All Codes for Student
  // ============================================
  async getForStudent(studentId: string): Promise<LinkCode[]> {
    // Query by studentId only, sort client-side to avoid composite index
    const q = query(
      this.linkCodesRef,
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    const codes = snapshot.docs.map(docToLinkCode);

    // Sort by createdAt desc client-side
    return codes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ============================================
  // Get Code by ID
  // ============================================
  async getById(id: string): Promise<LinkCode | null> {
    const docRef = collections.linkCode(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToLinkCode(docSnap);
  }

  // ============================================
  // Delete Code
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = collections.linkCode(this.academyId, id);
    await deleteDoc(docRef);
  }

  // ============================================
  // Delete Expired Codes (Cleanup)
  // ============================================
  async cleanupExpired(): Promise<number> {
    const now = Timestamp.fromDate(new Date());

    const q = query(
      this.linkCodesRef,
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);

    let deleted = 0;
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      deleted++;
    }

    return deleted;
  }

  // ============================================
  // Invalidate Code (for when student is linked another way)
  // ============================================
  async invalidate(studentId: string): Promise<void> {
    const codes = await this.getForStudent(studentId);

    for (const code of codes) {
      if (!code.usedAt) {
        await this.delete(code.id);
      }
    }
  }

  // ============================================
  // Get Pending Codes (for admin view)
  // ============================================
  async getPending(): Promise<LinkCode[]> {
    // Fetch all and filter/sort client-side to avoid index issues
    const snapshot = await getDocs(this.linkCodesRef);
    const allCodes = snapshot.docs.map(docToLinkCode);

    // Filter to only active (not used, not expired) codes
    const now = new Date();
    const pendingCodes = allCodes.filter((c) => !c.usedAt && c.expiresAt > now);

    // Sort by createdAt desc
    return pendingCodes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ============================================
  // Get Recently Used Codes (for admin view)
  // ============================================
  async getRecentlyUsed(limitCount = 10): Promise<LinkCode[]> {
    // Fetch all and filter/sort client-side to avoid index issues
    const snapshot = await getDocs(this.linkCodesRef);
    const allCodes = snapshot.docs.map(docToLinkCode);

    // Filter to only used codes and sort by usedAt desc
    const usedCodes = allCodes
      .filter((c) => c.usedAt)
      .sort((a, b) => (b.usedAt?.getTime() || 0) - (a.usedAt?.getTime() || 0));

    return usedCodes.slice(0, limitCount);
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
  generate: (studentId: string, studentName: string, createdBy: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).generate(studentId, studentName, createdBy),
  getByCode: (code: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).getByCode(code),
  validate: (code: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).validate(code),
  markAsUsed: (code: string, userId: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).markAsUsed(code, userId),
  getActiveForStudent: (studentId: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).getActiveForStudent(studentId),
  getForStudent: (studentId: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).getForStudent(studentId),
  getById: (id: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).getById(id),
  delete: (id: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).delete(id),
  cleanupExpired: () => new LinkCodeService(DEFAULT_ACADEMY_ID).cleanupExpired(),
  invalidate: (studentId: string) => new LinkCodeService(DEFAULT_ACADEMY_ID).invalidate(studentId),
  getPending: () => new LinkCodeService(DEFAULT_ACADEMY_ID).getPending(),
  getRecentlyUsed: (limitCount = 10) => new LinkCodeService(DEFAULT_ACADEMY_ID).getRecentlyUsed(limitCount),
};

export default linkCodeService;
