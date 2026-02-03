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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

/**
 * POST /api/payments/onboard/documents/upload
 * Receives a multipart file and uploads it to Asaas for KYC document verification.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await authenticateRequest(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // 2. Verify admin role
    if (user.role !== 'admin') {
      return createErrorResponse('Apenas admins podem enviar documentos', 403);
    }

    // 3. Parse multipart form data
    const formData = await request.formData();
    const documentFile = formData.get('documentFile') as File | null;
    const academyId = formData.get('academyId') as string | null;
    const groupId = formData.get('groupId') as string | null;

    if (!documentFile) {
      return createErrorResponse('documentFile is required');
    }
    if (!academyId) {
      return createErrorResponse('academyId is required');
    }
    if (!groupId) {
      return createErrorResponse('groupId is required');
    }

    // 4. Verify user belongs to academy
    if (user.academyId !== academyId) {
      return createErrorResponse('Access denied: Invalid academy', 403);
    }

    // 5. Validate file type
    if (!ALLOWED_TYPES.includes(documentFile.type)) {
      return createErrorResponse('Apenas imagens JPG e PNG sao aceitas', 400);
    }

    // 6. Validate file size
    if (documentFile.size > MAX_FILE_SIZE) {
      return createErrorResponse('Arquivo deve ter no maximo 5MB', 400);
    }

    // 7. Get sub-account API key
    const apiKey = await getAcademyAsaasApiKey(academyId);
    if (!apiKey) {
      return createErrorResponse('Academia nao tem subconta Asaas', 404);
    }

    // 8. Build FormData for Asaas API
    const asaasFormData = new FormData();
    asaasFormData.append('documentFile', documentFile);

    // 9. Send to Asaas
    const baseUrl = getAsaasBaseUrl();
    const response = await fetch(`${baseUrl}/v3/myAccount/documents/${groupId}`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
      },
      body: asaasFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[KYC-UPLOAD] Asaas upload error:', errorData);
      const errorMsg = (errorData as { errors?: Array<{ description?: string }> }).errors?.[0]?.description
        || 'Falha ao enviar para provedor de pagamento';
      return createErrorResponse(errorMsg, 502);
    }

    const data = await response.json();

    // 10. Update Firestore with upload metadata
    await adminDb.doc(`academies/${academyId}`).update({
      [`asaasKycDocuments.${groupId}.status`]: 'AWAITING_APPROVAL',
      [`asaasKycDocuments.${groupId}.uploadedAt`]: FieldValue.serverTimestamp(),
      asaasKycStatus: 'pending_review',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return createSuccessResponse({
      success: true,
      documentId: data.id || groupId,
    });
  } catch (error) {
    console.error('[KYC-UPLOAD] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
