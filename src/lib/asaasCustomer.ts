import { adminDb } from '@/lib/firebase/admin';
import { getAsaasBaseUrl } from '@/lib/asaas';

interface AsaasCustomerData {
  asaasCustomerId: string;
  studentId: string;
  studentName: string;
  cpf: string;
}

/**
 * Get or create an Asaas customer for a student within an academy's sub-account.
 * Caches the customer ID in Firestore: academies/{id}/asaasCustomers/{studentId}
 */
export async function getOrCreateAsaasCustomer(
  academyId: string,
  studentId: string,
  apiKey: string
): Promise<string | null> {
  try {
    // 1. Check cache in Firestore
    const customerRef = adminDb.doc(`academies/${academyId}/asaasCustomers/${studentId}`);
    const customerSnap = await customerRef.get();

    if (customerSnap.exists) {
      return customerSnap.data()?.asaasCustomerId || null;
    }

    // 2. Get student data for customer creation
    const studentSnap = await adminDb.doc(`academies/${academyId}/students/${studentId}`).get();
    if (!studentSnap.exists) {
      console.error(`[ASAAS] Student not found: ${studentId}`);
      return null;
    }

    const studentData = studentSnap.data()!;
    const isMinor = studentData.category === 'kids';

    // Use guardian CPF for minors, student CPF for adults
    const cpf = isMinor
      ? studentData.guardian?.cpf?.replace(/\D/g, '')
      : studentData.cpf?.replace(/\D/g, '');

    const name = studentData.fullName || 'Aluno';
    const email = studentData.email || studentData.guardian?.email;

    if (!cpf) {
      console.error(`[ASAAS] No CPF found for student ${studentId} (isMinor: ${isMinor})`);
      return null;
    }

    // 3. Create customer in Asaas sub-account
    const baseUrl = getAsaasBaseUrl();
    const response = await fetch(`${baseUrl}/v3/customers`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        cpfCnpj: cpf,
        ...(email && { email }),
        notificationDisabled: true, // White label: we handle notifications
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[ASAAS] Error creating customer:', errorData);
      return null;
    }

    const data = await response.json();
    const asaasCustomerId = data.id;

    // 4. Cache in Firestore
    await customerRef.set({
      asaasCustomerId,
      studentId,
      studentName: name,
      cpf,
      createdAt: new Date(),
    } as AsaasCustomerData & { createdAt: Date });

    return asaasCustomerId;
  } catch (error) {
    console.error(`[ASAAS] Error in getOrCreateAsaasCustomer for student ${studentId}:`, error);
    return null;
  }
}
