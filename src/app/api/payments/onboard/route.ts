import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { encrypt } from '@/lib/crypto';
import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  getDefaultCORSHeaders,
} from '@/lib/api/auth';

/**
 * POST /api/payments/onboard
 * Creates an Asaas White Label sub-account for the academy.
 * Uses the main account API key (ASAAS_API_KEY) to create sub-accounts.
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
      return createErrorResponse('Only admins can onboard payments', 403);
    }

    const body = await request.json();
    const { academyId } = body;

    if (!academyId) {
      return createErrorResponse('academyId is required');
    }

    // 3. Verify user belongs to academy
    if (user.academyId !== academyId) {
      return createErrorResponse('Access denied: Invalid academy', 403);
    }

    // 4. Check academy isn't already onboarded
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();
    if (!academySnap.exists) {
      return createErrorResponse('Academy not found', 404);
    }

    const academyData = academySnap.data()!;
    if (academyData.asaasSubAccountId) {
      return createErrorResponse('Academy already has an Asaas sub-account');
    }

    // 5. Validate required fields
    const { cnpj, email, phone, name, address, city, state, zipCode } = academyData;
    if (!cnpj || !email || !name) {
      return createErrorResponse(
        'Academy must have CNPJ, email, and name configured before onboarding'
      );
    }

    // 6. Get main account API key
    const mainApiKey = process.env.ASAAS_API_KEY;
    if (!mainApiKey) {
      return createErrorResponse('Asaas main API key not configured', 500);
    }

    const env = process.env.ASAAS_ENVIRONMENT || 'sandbox';
    const baseUrl = env === 'production'
      ? 'https://api.asaas.com'
      : 'https://sandbox.asaas.com/api';

    // 7. Create sub-account in Asaas
    const accountPayload: Record<string, unknown> = {
      name,
      email,
      cpfCnpj: cnpj.replace(/\D/g, ''),
      ...(phone && { phone: phone.replace(/\D/g, '') }),
      ...(address && {
        address,
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { postalCode: zipCode.replace(/\D/g, '') }),
        province: state,
      }),
      companyType: 'LIMITED',
      incomeValue: 50000,
    };

    const response = await fetch(`${baseUrl}/v3/accounts`, {
      method: 'POST',
      headers: {
        'access_token': mainApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accountPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[ONBOARD] Asaas sub-account creation error:', errorData);
      const errorMsg = errorData.errors?.[0]?.description || 'Failed to create sub-account';
      return createErrorResponse(errorMsg, 500);
    }

    const data = await response.json();

    // 8. Configure webhook for the new sub-account (best-effort, non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && data.apiKey) {
      try {
        const webhookRes = await fetch(`${baseUrl}/v3/webhooks`, {
          method: 'POST',
          headers: {
            'access_token': data.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Webhook ${name}`,
            url: `${appUrl}/api/webhooks/asaas`,
            email,
            sendType: 'SEQUENTIALLY',
            enabled: true,
            interrupted: false,
            authToken: process.env.ASAAS_WEBHOOK_AUTH_TOKEN,
            events: [
              'PAYMENT_RECEIVED',
              'PAYMENT_CONFIRMED',
              'PAYMENT_OVERDUE',
              'PAYMENT_DELETED',
              'PAYMENT_REFUNDED',
              'TRANSFER_DONE',
              'TRANSFER_FAILED',
            ],
          }),
        });
        if (!webhookRes.ok) {
          const whErr = await webhookRes.json().catch(() => ({}));
          console.warn('[ONBOARD] Webhook config failed (non-blocking):', whErr);
        } else {
          console.log('[ONBOARD] Webhook configured successfully');
        }
      } catch (whError) {
        console.warn('[ONBOARD] Webhook config error (non-blocking):', whError);
      }
    }

    // 9. Encrypt and save API key
    const encryptedApiKey = encrypt(data.apiKey);

    await adminDb.doc(`academies/${academyId}`).update({
      asaasSubAccountId: data.id,
      asaasSubAccountApiKey: encryptedApiKey,
      asaasSubAccountWalletId: data.walletId || null,
      asaasOnboardingStatus: 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return createSuccessResponse({
      subAccountId: data.id,
      status: 'pending',
      message: 'Sub-account created. Awaiting Asaas approval.',
    });
  } catch (error) {
    console.error('[ONBOARD] Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getDefaultCORSHeaders(),
  });
}
