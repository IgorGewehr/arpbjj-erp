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
// POST Handler - Disable TOTP
// ============================================
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 2. Rate limit
    const rateLimit = checkRateLimit(`totp-disable:${user.uid}`);
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
      return createErrorResponse('2FA nao esta ativado.');
    }

    // 5. Validate code before disabling
    let codeValid = false;

    // Try TOTP code (6-digit)
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
        codeValid = true;
      }
    }

    // Try backup code if TOTP didn't match
    if (!codeValid) {
      const backupCodes = userData.totpBackupCodes as Array<{ hash: string; used: boolean }> | undefined;
      if (backupCodes) {
        const hashedInput = hashCode(code.toUpperCase());
        const match = backupCodes.find((bc) => !bc.used && bc.hash === hashedInput);
        if (match) {
          codeValid = true;
        }
      }
    }

    if (!codeValid) {
      return createErrorResponse('Codigo invalido.');
    }

    // 6. Disable TOTP - remove secret and backup codes
    await userRef.update({
      totpEnabled: false,
      totpSecret: null,
      totpTempSecret: null,
      totpBackupCodes: null,
      totpEnabledAt: null,
      totpDisabledAt: new Date(),
    });

    return createSuccessResponse({ disabled: true });
  } catch (error) {
    console.error('[TOTP] Disable error:', error);
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
