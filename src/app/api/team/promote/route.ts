import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api/auth';

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (authResult instanceof NextResponse) return authResult;
  const { user: requester } = authResult;

  const body = await request.json().catch(() => null);
  if (!body) return createErrorResponse('Invalid JSON', 400);

  const { targetUserId, academyId, extraPermissions, studentId, email, displayName } = body;

  if (!targetUserId || !academyId || !Array.isArray(extraPermissions)) {
    return createErrorResponse('targetUserId, academyId e extraPermissions são obrigatórios', 400);
  }

  // Verify requester is staff (admin or instructor) of this academy.
  // verifyIdToken resolves role via primaryAcademyId; we also check the specific
  // academyId from the body to handle multi-academy scenarios.
  const requesterMappingDoc = await adminDb.collection('userAcademyMapping').doc(requester.uid).get();
  const requesterMappingData = requesterMappingDoc.data();
  const roleForAcademy = requesterMappingData?.academyDetails?.[academyId]?.role;
  const effectiveRole = roleForAcademy ?? requester.role;

  if (effectiveRole !== 'admin' && effectiveRole !== 'instructor') {
    return createErrorResponse('Apenas administradores podem promover alunos', 403);
  }

  // Update userAcademyMapping for the target user via Admin SDK (bypasses Firestore rules).
  // Use update() so dot-notation resolves as nested paths.
  // Fall back to set() if the document doesn't exist yet (edge case: account created
  // but mapping document was never written, e.g. incomplete registration).
  const mappingRef = adminDb.collection('userAcademyMapping').doc(targetUserId);
  try {
    await mappingRef.update({
      [`academyDetails.${academyId}.role`]: 'instructor',
      [`academyDetails.${academyId}.extraPermissions`]: extraPermissions,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err: unknown) {
    const grpcErr = err as { code?: number };
    if (grpcErr.code === 5) {
      // NOT_FOUND: document doesn't exist — create it from scratch
      await mappingRef.set({
        academyIds: [academyId],
        primaryAcademyId: academyId,
        academyDetails: {
          [academyId]: {
            role: 'instructor',
            extraPermissions,
            status: 'active',
            ...(studentId ? { studentId } : {}),
            joinedAt: FieldValue.serverTimestamp(),
          },
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      throw err;
    }
  }

  // Mirror role + extraPermissions in the academy-scoped user doc (legacy fallback path)
  const academyUserRef = adminDb
    .collection('academies')
    .doc(academyId)
    .collection('users')
    .doc(targetUserId);

  const academyUserUpdate: Record<string, unknown> = {
    role: 'instructor',
    extraPermissions,
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (email) academyUserUpdate.email = email;
  if (displayName) academyUserUpdate.displayName = displayName;
  if (studentId) academyUserUpdate.studentId = studentId;

  await academyUserRef.set(academyUserUpdate, { merge: true });

  return createSuccessResponse({ promoted: true });
}
