import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LinkCode } from '@/types';

const COLLECTION = 'linkCodes';

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
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt),
    usedAt: data.usedAt instanceof Timestamp ? data.usedAt.toDate() : data.usedAt ? new Date(data.usedAt) : undefined,
    usedBy: data.usedBy,
  };
};

// ============================================
// Link Code Service
// ============================================
export const linkCodeService = {
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
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    const docRef = await addDoc(collection(db, COLLECTION), docData);
    const newDoc = await getDoc(docRef);

    return docToLinkCode(newDoc);
  },

  // ============================================
  // Get Code by Code String
  // ============================================
  async getByCode(code: string): Promise<LinkCode | null> {
    const q = query(
      collection(db, COLLECTION),
      where('code', '==', code.toUpperCase())
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    return docToLinkCode(snapshot.docs[0]);
  },

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
  },

  // ============================================
  // Mark Code as Used
  // ============================================
  async markAsUsed(code: string, userId: string): Promise<LinkCode> {
    const linkCode = await this.getByCode(code);
    if (!linkCode) {
      throw new Error('Código não encontrado');
    }

    const docRef = doc(db, COLLECTION, linkCode.id);

    await updateDoc(docRef, {
      usedAt: serverTimestamp(),
      usedBy: userId,
    });

    const updatedDoc = await getDoc(docRef);
    return docToLinkCode(updatedDoc);
  },

  // ============================================
  // Get Active Code for Student
  // ============================================
  async getActiveForStudent(studentId: string): Promise<LinkCode | null> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const linkCode = docToLinkCode(doc);

      // Check if code is still valid (not used and not expired)
      if (!linkCode.usedAt && new Date() < linkCode.expiresAt) {
        return linkCode;
      }
    }

    return null;
  },

  // ============================================
  // Get All Codes for Student
  // ============================================
  async getForStudent(studentId: string): Promise<LinkCode[]> {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToLinkCode);
  },

  // ============================================
  // Get Code by ID
  // ============================================
  async getById(id: string): Promise<LinkCode | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return docToLinkCode(docSnap);
  },

  // ============================================
  // Delete Code
  // ============================================
  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },

  // ============================================
  // Delete Expired Codes (Cleanup)
  // ============================================
  async cleanupExpired(): Promise<number> {
    const now = Timestamp.fromDate(new Date());

    const q = query(
      collection(db, COLLECTION),
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(q);

    let deleted = 0;
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
      deleted++;
    }

    return deleted;
  },

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
  },

  // ============================================
  // Get Pending Codes (for admin view)
  // ============================================
  async getPending(): Promise<LinkCode[]> {
    const q = query(
      collection(db, COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const allCodes = snapshot.docs.map(docToLinkCode);

    // Filter to only active (not used, not expired) codes
    const now = new Date();
    return allCodes.filter((c) => !c.usedAt && c.expiresAt > now);
  },

  // ============================================
  // Get Recently Used Codes (for admin view)
  // ============================================
  async getRecentlyUsed(limitCount = 10): Promise<LinkCode[]> {
    const q = query(
      collection(db, COLLECTION),
      orderBy('usedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const allCodes = snapshot.docs.map(docToLinkCode);

    // Filter to only used codes
    return allCodes.filter((c) => c.usedAt).slice(0, limitCount);
  },
};

export default linkCodeService;
