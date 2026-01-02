import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ============================================
// Types
// ============================================
export interface AcademySettings {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string;
  updatedAt?: Date;
}

const SETTINGS_DOC = 'academy';
const SETTINGS_COLLECTION = 'settings';

// ============================================
// Settings Service
// ============================================
export const settingsService = {
  // ============================================
  // Get Academy Settings
  // ============================================
  async getAcademySettings(): Promise<AcademySettings | null> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          name: data.name || '',
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          logoUrl: data.logoUrl,
          updatedAt: data.updatedAt?.toDate(),
        };
      }

      // Return default settings if not configured yet
      return {
        name: 'Minha Academia',
      };
    } catch (error) {
      console.error('Error fetching academy settings:', error);
      return null;
    }
  },

  // ============================================
  // Save Academy Settings
  // ============================================
  async saveAcademySettings(settings: AcademySettings): Promise<void> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);

      // Build settings object, excluding undefined values
      const settingsData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (settings.name) settingsData.name = settings.name;
      if (settings.cnpj) settingsData.cnpj = settings.cnpj;
      if (settings.email) settingsData.email = settings.email;
      if (settings.phone) settingsData.phone = settings.phone;
      if (settings.address) settingsData.address = settings.address;
      if (settings.city) settingsData.city = settings.city;
      if (settings.state) settingsData.state = settings.state;
      if (settings.zipCode) settingsData.zipCode = settings.zipCode;
      if (settings.logoUrl) settingsData.logoUrl = settings.logoUrl;

      await setDoc(docRef, settingsData, { merge: true });
    } catch (error) {
      console.error('Error saving academy settings:', error);
      throw error;
    }
  },
};

export default settingsService;
