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

// ============================================
// Generate Backup Codes
// ============================================
function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8-char alphanumeric codes, easy to read (no ambiguous chars)
    const bytes = crypto.randomBytes(5);
    const code = bytes
      .toString('hex')
      .substring(0, 8)
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// ============================================
// POST Handler - Verify TOTP Setup
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
    const rateLimit = checkRateLimit(`totp-verify:${user.uid}`);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        429
      );
    }

    // 3. Parse body
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return createErrorResponse('Codigo de 6 digitos obrigatorio');
    }

    // 4. Get temp secret
    const userRef = adminDb.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData?.totpTempSecret) {
      return createErrorResponse('Nenhuma configuracao 2FA em andamento. Inicie o setup primeiro.');
    }

    if (userData?.totpEnabled) {
      return createErrorResponse('2FA ja esta ativado.');
    }

    // 5. Check setup expiry (15 min window)
    const setupStarted = userData.totpSetupStartedAt?.toDate?.() || userData.totpSetupStartedAt;
    if (setupStarted) {
      const elapsed = Date.now() - new Date(setupStarted).getTime();
      if (elapsed > 15 * 60 * 1000) {
        await userRef.update({
          totpTempSecret: null,
          totpSetupStartedAt: null,
        });
        return createErrorResponse('Sessao de configuracao expirou. Inicie novamente.');
      }
    }

    // 6. Verify code against temp secret
    const totp = new OTPAuth.TOTP({
      issuer: 'BJJEasy',
      label: user.email || user.uid,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(userData.totpTempSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return createErrorResponse('Codigo invalido. Verifique e tente novamente.');
    }

    // 7. Generate backup codes
    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map((c) => ({
      hash: hashCode(c),
      used: false,
    }));

    // 8. Enable TOTP - move temp secret to permanent, store hashed backup codes
    await userRef.update({
      totpEnabled: true,
      totpSecret: userData.totpTempSecret,
      totpTempSecret: null,
      totpSetupStartedAt: null,
      totpBackupCodes: hashedBackupCodes,
      totpEnabledAt: new Date(),
    });

    return createSuccessResponse({
      backupCodes,
    });
  } catch (error) {
    console.error('[TOTP] Verify-setup error:', error);
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
