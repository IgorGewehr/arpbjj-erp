import { adminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/crypto';

/**
 * Get the Asaas API base URL based on environment.
 */
export function getAsaasBaseUrl(): string {
  const env = process.env.ASAAS_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'https://api.asaas.com'
    : 'https://sandbox.asaas.com/api';
}

/**
 * Get the decrypted Asaas API key for a specific academy's sub-account.
 * Reads from Firestore and decrypts using AES-256-GCM.
 */
export async function getAcademyAsaasApiKey(academyId: string): Promise<string | null> {
  try {
    const academySnap = await adminDb.doc(`academies/${academyId}`).get();
    if (!academySnap.exists) return null;

    const encryptedKey = academySnap.data()?.asaasSubAccountApiKey;
    if (!encryptedKey) return null;

    return decrypt(encryptedKey);
  } catch (error) {
    console.error(`[ASAAS] Error getting API key for academy ${academyId}:`, error);
    return null;
  }
}

/**
 * Convert centavos (integer) to Reais (decimal) for Asaas API.
 * Firestore stores amounts in centavos; Asaas expects Reais.
 */
export function toAsaasAmount(centavos: number): number {
  return Number((centavos / 100).toFixed(2));
}

/**
 * Convert Reais (decimal) from Asaas API to centavos (integer) for Firestore.
 */
export function fromAsaasAmount(reais: number): number {
  return Math.round(reais * 100);
}
