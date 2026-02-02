import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as OTPAuth from 'otpauth';
import {
  authenticateRequest,
  checkRateLimit,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';

// ============================================
// POST Handler - Start TOTP Setup
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
    const rateLimit = checkRateLimit(`totp-setup:${user.uid}`);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds`,
        429
      );
    }

    // 3. Check if TOTP is already enabled
    const userRef = adminDb.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData?.totpEnabled) {
      return createErrorResponse('2FA ja esta ativado. Desative primeiro para reconfigurar.');
    }

    // 4. Generate TOTP secret
    const secret = new OTPAuth.Secret({ size: 20 });

    const totp = new OTPAuth.TOTP({
      issuer: 'BJJEasy',
      label: user.email || user.uid,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const qrCodeUri = totp.toString();

    // 5. Store temp secret (not yet enabled)
    await userRef.update({
      totpTempSecret: secret.base32,
      totpSetupStartedAt: new Date(),
    });

    return createSuccessResponse({
      secret: secret.base32,
      qrCodeUri,
    });
  } catch (error) {
    console.error('[TOTP] Setup error:', error);
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
