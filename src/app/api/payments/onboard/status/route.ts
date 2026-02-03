import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAcademyAsaasApiKey, getAsaasBaseUrl } from '@/lib/asaas';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';

/**
 * GET /api/payments/onboard/status?academyId=xxx
 * Checks the Asaas sub-account approval status and updates Firestore.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const academyId = request.nextUrl.searchParams.get('academyId');
    if (!academyId) {
      return createErrorResponse('academyId query parameter is required');
    }

    // 2. Verify user belongs to academy
    if (user.academyId !== academyId) {
      return createErrorResponse('Access denied: Invalid academy', 403);
    }

    // 3. Get sub-account API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      return createErrorResponse('Academy does not have an Asaas sub-account', 404);
    }

    // 4. Query Asaas for account status
    const baseUrl = getAsaasBaseUrl();
    const response = await fetch(`${baseUrl}/v3/myAccount/status`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[ONBOARD-STATUS] Asaas status check error:', errorData);
      return createErrorResponse('Failed to check account status', 500);
    }

    const data = await response.json();

    // 5. Map Asaas status to our internal status
    // Asaas commercialInfoStatus: APPROVED, PENDING, REJECTED, etc.
    let onboardingStatus: string;
    const commercialStatus = data.commercialInfo?.status || data.commercialInfoStatus;

    if (commercialStatus === 'APPROVED') {
      onboardingStatus = 'approved';
    } else if (commercialStatus === 'REJECTED' || commercialStatus === 'DENIED') {
      onboardingStatus = 'rejected';
    } else {
      onboardingStatus = 'pending';
    }

    // 6. Update Firestore
    await adminDb.doc(`academies/${academyId}`).update({
      asaasOnboardingStatus: onboardingStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return createSuccessResponse({
      status: onboardingStatus,
      details: data,
    });
  } catch (error) {
    console.error('[ONBOARD-STATUS] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
