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
 * GET /api/payments/onboard/documents?academyId=xxx
 * Fetches pending KYC document groups from the Asaas API for the academy's sub-account.
 * Updates Firestore with the current KYC status.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 2. Verify admin role
    if (user.role !== 'admin') {
      return createErrorResponse('Apenas admins podem verificar documentos', 403);
    }

    const academyId = request.nextUrl.searchParams.get('academyId');
    if (!academyId) {
      return createErrorResponse('academyId query parameter is required');
    }

    // 3. Verify user belongs to academy
    if (user.academyId !== academyId) {
      return createErrorResponse('Access denied: Invalid academy', 403);
    }

    // 4. Get sub-account API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      return createErrorResponse('Academia nao tem subconta Asaas', 404);
    }

    // 5. Query Asaas for pending documents
    const baseUrl = getAsaasBaseUrl();
    const response = await fetch(`${baseUrl}/v3/myAccount/documents`, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[KYC-DOCUMENTS] Asaas documents check error:', errorData);
      return createErrorResponse('Falha ao consultar documentos no provedor de pagamento', 502);
    }

    const data = await response.json();

    // 6. Check for onboardingUrl (external verification flow)
    if (data.onboardingUrl) {
      await adminDb.doc(`academies/${academyId}`).update({
        asaasKycStatus: 'onboarding_url',
        asaasKycOnboardingUrl: data.onboardingUrl,
        asaasKycLastCheckedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return createSuccessResponse({
        status: 'onboarding_url',
        onboardingUrl: data.onboardingUrl,
        documents: [],
      });
    }

    // 7. Parse document groups
    const documents = data.data || [];
    const documentsMap: Record<string, {
      type: string;
      status: string;
      description: string;
      uploadedAt: null;
    }> = {};

    let hasPending = false;
    let allApproved = true;
    let hasRejected = false;

    for (const group of documents) {
      const groupId = group.id;
      const docType = group.type || 'UNKNOWN';
      const docStatus = group.status || 'NOT_SENT';
      const docDescription = group.description || group.title || docType;

      documentsMap[groupId] = {
        type: docType,
        status: docStatus,
        description: docDescription,
        uploadedAt: null,
      };

      if (docStatus === 'NOT_SENT' || docStatus === 'AWAITING_APPROVAL') {
        hasPending = true;
      }
      if (docStatus !== 'APPROVED') {
        allApproved = false;
      }
      if (docStatus === 'REJECTED') {
        hasRejected = true;
      }
    }

    // 8. Determine overall KYC status
    let kycStatus: string;
    if (documents.length === 0) {
      kycStatus = 'not_checked';
    } else if (allApproved) {
      kycStatus = 'approved';
    } else if (hasRejected) {
      kycStatus = 'rejected';
    } else if (hasPending) {
      // Check if any have been sent (AWAITING_APPROVAL) vs not sent
      const hasNotSent = documents.some((g: { status?: string }) => g.status === 'NOT_SENT');
      const hasAwaiting = documents.some((g: { status?: string }) => g.status === 'AWAITING_APPROVAL');
      if (hasNotSent && !hasAwaiting) {
        kycStatus = 'pending_upload';
      } else if (hasAwaiting) {
        kycStatus = 'pending_review';
      } else {
        kycStatus = 'pending_upload';
      }
    } else {
      kycStatus = 'pending_review';
    }

    // 9. Update Firestore
    await adminDb.doc(`academies/${academyId}`).update({
      asaasKycStatus: kycStatus,
      asaasKycOnboardingUrl: null,
      asaasKycDocuments: documentsMap,
      asaasKycLastCheckedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return createSuccessResponse({
      status: kycStatus,
      documents: documents.map((group: {
        id: string;
        type?: string;
        status?: string;
        description?: string;
        title?: string;
      }) => ({
        groupId: group.id,
        type: group.type || 'UNKNOWN',
        status: group.status || 'NOT_SENT',
        description: group.description || group.title || group.type || 'Documento',
      })),
    });
  } catch (error) {
    console.error('[KYC-DOCUMENTS] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
