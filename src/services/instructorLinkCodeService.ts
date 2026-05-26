import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  collectionGroup,
  Timestamp,
  CollectionReference,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { InstructorLinkCode, Permission } from '@/types';
import { upsertAcademyUser } from './globalUserService';

// ============================================
// Instructor Link Code Service
//
// Mirrors the student link-code flow but with two key differences:
//   1) The code carries the snapshot of `extraPermissions` to grant on redeem,
//      so the owner picks the perms once and the professor only types the code.
//   2) Lives under /academies/{id}/instructorLinkCodes/{code} (the code IS the
//      doc id). Anonymous reads on unused codes mirror the student link-codes
//      rule so a not-yet-logged-in user can validate the code during register.
// ============================================

const CODE_TTL_MINUTES = 30;
const CODE_LENGTH = 8;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid OCR ambiguity

function generateCodeString(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function instructorLinkCodesRef(academyId: string): CollectionReference {
  return collection(db, `academies/${academyId}/instructorLinkCodes`);
}

function fromDoc(d: { id: string; data: () => Record<string, unknown> }): InstructorLinkCode {
  const data = d.data();
  return {
    id: d.id,
    code: (data.code as string) ?? d.id,
    createdBy: data.createdBy as string,
    createdByName: data.createdByName as string,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as string),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt as string),
    extraPermissions: Array.isArray(data.extraPermissions) ? (data.extraPermissions as Permission[]) : [],
    usedAt: data.usedAt instanceof Timestamp ? data.usedAt.toDate() : undefined,
    usedBy: typeof data.usedBy === 'string' ? data.usedBy : undefined,
    usedByName: typeof data.usedByName === 'string' ? data.usedByName : undefined,
  };
}

export class InstructorLinkCodeService {
  constructor(private academyId: string) {}

  /**
   * Generate a fresh code for the academy. Up to 5 retries on collision.
   * Returns the persisted [InstructorLinkCode] including the random code id.
   */
  async generate(
    createdBy: string,
    createdByName: string,
    extraPermissions: Permission[]
  ): Promise<InstructorLinkCode> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);

    let attempts = 0;
    while (attempts < 5) {
      const code = generateCodeString();
      const ref = doc(instructorLinkCodesRef(this.academyId), code);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        attempts++;
        continue;
      }
      const payload = {
        code,
        createdBy,
        createdByName,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        extraPermissions,
      };
      await setDoc(ref, payload);
      return {
        id: code,
        code,
        createdBy,
        createdByName,
        createdAt: now,
        expiresAt,
        extraPermissions,
      };
    }
    throw new Error('Não foi possível gerar um código único. Tente novamente.');
  }

  /**
   * List active (unused, unexpired) codes for the academy.
   */
  async listActive(): Promise<InstructorLinkCode[]> {
    const snap = await getDocs(instructorLinkCodesRef(this.academyId));
    const now = new Date();
    return snap.docs
      .map(fromDoc)
      .filter((c) => !c.usedAt && c.expiresAt.getTime() > now.getTime())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async delete(codeId: string): Promise<void> {
    await deleteDoc(doc(instructorLinkCodesRef(this.academyId), codeId));
  }
}

export function createInstructorLinkCodeService(academyId: string): InstructorLinkCodeService {
  return new InstructorLinkCodeService(academyId);
}

// ============================================
// Cross-academy helpers (no academy context yet — used during code redeem)
// ============================================

/**
 * Search every academy for an unused, unexpired code. Returns the matching
 * code plus the academy it belongs to (extracted from the doc path). Mirrors
 * the student link-code validation flow.
 */
export async function validateInstructorCodeGlobally(
  rawCode: string
): Promise<{ code: InstructorLinkCode; academyId: string } | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const q = query(collectionGroup(db, 'instructorLinkCodes'), where('code', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  for (const d of snap.docs) {
    const parsed = fromDoc(d);
    if (parsed.usedAt) continue;
    if (parsed.expiresAt.getTime() <= Date.now()) continue;
    // Path is /academies/{academyId}/instructorLinkCodes/{codeId}
    const pathParts = d.ref.path.split('/');
    const academyId = pathParts[1];
    return { code: parsed, academyId };
  }
  return null;
}

/**
 * Promote an existing user who's already linked to the academy as `student`
 * (or any role) to `instructor`. Keeps studentId intact so the user can still
 * access their own student portal data, but switches role and stamps the
 * extraPermissions chosen by the owner. Idempotent — calling twice doesn't
 * stack permissions, just rewrites them.
 */
export async function promoteUserToInstructor(opts: {
  userId: string;
  academyId: string;
  extraPermissions: Permission[];
  email?: string;
  displayName?: string;
}): Promise<void> {
  const { userId, academyId, extraPermissions, email, displayName } = opts;

  // Update the mapping: role -> instructor, attach extraPermissions.
  // We use FieldValue updates so studentId (if any) is preserved.
  const mappingRef = doc(db, `userAcademyMapping/${userId}`);
  const updates: Record<string, unknown> = {
    [`academyDetails.${academyId}.role`]: 'instructor',
    updatedAt: serverTimestamp(),
  };
  if (extraPermissions.length > 0) {
    updates[`academyDetails.${academyId}.extraPermissions`] = extraPermissions;
  } else {
    // Clear any previous extras so a re-promote with empty list resets them
    // instead of silently inheriting stale values.
    updates[`academyDetails.${academyId}.extraPermissions`] = [];
  }
  await setDoc(mappingRef, updates, { merge: true });

  // Mirror the role in the academy-scoped user doc so legacy code reading
  // from there also sees instructor.
  await upsertAcademyUser(academyId, userId, {
    role: 'instructor',
    ...(email ? { email } : {}),
    ...(displayName ? { displayName } : {}),
    status: 'active',
  });
}

/**
 * Redeem a previously generated instructor code: links the current user to
 * the academy as `instructor`, attaches `extraPermissions`, and marks the
 * code as used.
 */
export async function redeemInstructorCode(opts: {
  code: InstructorLinkCode;
  academyId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
}): Promise<void> {
  // Routed through the shared `redeemInstructorCode` Cloud Function (deployed
  // from graduabjj into this same Firebase project). The hardened Firestore
  // rules forbid a client from self-assigning the `instructor` role in its own
  // userAcademyMapping, so this MUST run server-side. The function resolves the
  // academy from the code, stamps role + extraPermissions, mirrors the
  // academy-scoped user doc, and marks the code used — atomically.
  const callRedeem = httpsCallable<{ code: string }, { success: boolean; academyId: string }>(
    functions,
    'redeemInstructorCode',
  );
  await callRedeem({ code: opts.code.code });
}
