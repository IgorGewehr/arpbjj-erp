import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as OTPAuth from 'otpauth';
import crypto from 'crypto';
import {
  authenticateRequest,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// ============================================
// POST Handler - Validate TOTP Code
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 2. Rate limit (stricter - prevent brute force)
    const rateLimit = checkRateLimit(`totp-validate:${user.uid}`);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        429
      );
    }

    // 3. Parse body
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return createErrorResponse('Codigo obrigatorio');
    }

    // 4. Get user TOTP data
    const userRef = adminDb.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData?.totpEnabled || !userData?.totpSecret) {
      return createErrorResponse('2FA nao esta ativado para este usuario.');
    }

    // 5. Try TOTP code first (6-digit)
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      const totp = new OTPAuth.TOTP({
        issuer: 'BJJEasy',
        label: user.email || user.uid,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(userData.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta !== null) {
        return createSuccessResponse({ validated: true });
      }
    }

    // 6. Try backup code
    const backupCodes = userData.totpBackupCodes as Array<{ hash: string; used: boolean }> | undefined;
    if (backupCodes) {
      const hashedInput = hashCode(code.toUpperCase());
      const matchIndex = backupCodes.findIndex(
        (bc) => !bc.used && bc.hash === hashedInput
      );

      if (matchIndex !== -1) {
        // Mark backup code as used
        const updatedCodes = [...backupCodes];
        updatedCodes[matchIndex] = { ...updatedCodes[matchIndex], used: true };
        await userRef.update({ totpBackupCodes: updatedCodes });

        return createSuccessResponse({ validated: true, usedBackupCode: true });
      }
    }

    return createErrorResponse('Codigo invalido.');
  } catch (error) {
    console.error('[TOTP] Validate error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// ============================================
// OPTIONS Handler - CORS
// ============================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
