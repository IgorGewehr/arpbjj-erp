import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, collections, getAcademyRef } from '@/lib/firebase';
import { Academy } from '@/types';

// ============================================
// Types
// ============================================
export interface AcademySettings {
  // Basic Info
  name: string;
  slug?: string;
  cnpj?: string;
  email?: string;
  phone?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Branding
  logoUrl?: string;

  // Financial
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // AbacatePay Integration
  abacatePayEnabled?: boolean;
  abacatePayApiKey?: string;

  // Auto-graduation Settings
  autoGraduationEnabled?: boolean;
  autoGraduationAttendances?: number;

  updatedAt?: Date;
}

// ============================================
// Settings Service Class (Multi-Tenant)
// ============================================
class SettingsService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get academyRef() {
    return getAcademyRef(this.academyId);
  }

  // ============================================
  // Get Academy Settings
  // ============================================
  async getAcademySettings(): Promise<AcademySettings | null> {
    try {
      const docSnap = await getDoc(this.academyRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          name: data.name || '',
          slug: data.slug,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          logoUrl: data.logoUrl,
          pixKey: data.pixKey,
          pixKeyType: data.pixKeyType,
          abacatePayEnabled: data.abacatePayEnabled || false,
          abacatePayApiKey: data.abacatePayApiKey,
          autoGraduationEnabled: data.autoGraduationEnabled || false,
          autoGraduationAttendances: data.autoGraduationAttendances,
          updatedAt: data.updatedAt?.toDate(),
        };
      }

      // Return default settings if academy doc not found
      return {
        name: 'Minha Academia',
      };
    } catch (error) {
      console.error('Error fetching academy settings:', error);
      return null;
    }
  }

  // ============================================
  // Save Academy Settings
  // ============================================
  async saveAcademySettings(settings: Partial<AcademySettings>): Promise<void> {
    try {
      // Build settings object, excluding undefined values
      const settingsData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (settings.name !== undefined) settingsData.name = settings.name;
      if (settings.slug !== undefined) settingsData.slug = settings.slug;
      if (settings.cnpj !== undefined) settingsData.cnpj = settings.cnpj;
      if (settings.email !== undefined) settingsData.email = settings.email;
      if (settings.phone !== undefined) settingsData.phone = settings.phone;
      if (settings.address !== undefined) settingsData.address = settings.address;
      if (settings.city !== undefined) settingsData.city = settings.city;
      if (settings.state !== undefined) settingsData.state = settings.state;
      if (settings.zipCode !== undefined) settingsData.zipCode = settings.zipCode;
      if (settings.logoUrl !== undefined) settingsData.logoUrl = settings.logoUrl;
      if (settings.pixKey !== undefined) settingsData.pixKey = settings.pixKey;
      if (settings.pixKeyType !== undefined) settingsData.pixKeyType = settings.pixKeyType;
      if (settings.abacatePayEnabled !== undefined) settingsData.abacatePayEnabled = settings.abacatePayEnabled;
      if (settings.abacatePayApiKey !== undefined) settingsData.abacatePayApiKey = settings.abacatePayApiKey;
      if (settings.autoGraduationEnabled !== undefined) settingsData.autoGraduationEnabled = settings.autoGraduationEnabled;
      if (settings.autoGraduationAttendances !== undefined) settingsData.autoGraduationAttendances = settings.autoGraduationAttendances;

      await setDoc(this.academyRef, settingsData, { merge: true });
    } catch (error) {
      console.error('Error saving academy settings:', error);
      throw error;
    }
  }

  // ============================================
  // Update Logo
  // ============================================
  async updateLogo(logoUrl: string): Promise<void> {
    await updateDoc(this.academyRef, {
      logoUrl,
      updatedAt: serverTimestamp(),
    });
  }

  // ============================================
  // Toggle AbacatePay
  // ============================================
  async toggleAbacatePay(enabled: boolean, apiKey?: string): Promise<void> {
    const updateData: Record<string, unknown> = {
      abacatePayEnabled: enabled,
      updatedAt: serverTimestamp(),
    };

    if (apiKey !== undefined) {
      updateData.abacatePayApiKey = apiKey;
    }

    await updateDoc(this.academyRef, updateData);
  }

  // ============================================
  // Update Auto-graduation Settings
  // ============================================
  async updateAutoGraduation(enabled: boolean, attendances?: number): Promise<void> {
    const updateData: Record<string, unknown> = {
      autoGraduationEnabled: enabled,
      updatedAt: serverTimestamp(),
    };

    if (attendances !== undefined) {
      updateData.autoGraduationAttendances = attendances;
    }

    await updateDoc(this.academyRef, updateData);
  }

  // ============================================
  // Get Full Academy Data
  // ============================================
  async getAcademy(): Promise<Academy | null> {
    try {
      const docSnap = await getDoc(this.academyRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || '',
        slug: data.slug || '',
        logoUrl: data.logoUrl,
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
        abacatePayEnabled: data.abacatePayEnabled || false,
        abacatePayApiKey: data.abacatePayApiKey,
        autoGraduationEnabled: data.autoGraduationEnabled || false,
        autoGraduationAttendances: data.autoGraduationAttendances,
        subscription: data.subscription,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        ownerId: data.ownerId,
      };
    } catch (error) {
      console.error('Error fetching academy:', error);
      return null;
    }
  }
}

// ============================================
// Factory Function
// ============================================
export function createSettingsService(academyId: string): SettingsService {
  return new SettingsService(academyId);
}

// ============================================
// Legacy Export (for backwards compatibility)
// ============================================
const LEGACY_SETTINGS_DOC = 'academy';
const LEGACY_SETTINGS_COLLECTION = 'settings';

export const settingsService = {
  async getAcademySettings(): Promise<AcademySettings | null> {
    try {
      const docRef = doc(db, LEGACY_SETTINGS_COLLECTION, LEGACY_SETTINGS_DOC);
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
          pixKey: data.pixKey,
          pixKeyType: data.pixKeyType,
          abacatePayEnabled: data.abacatePayEnabled || false,
          autoGraduationEnabled: data.autoGraduationEnabled || false,
          autoGraduationAttendances: data.autoGraduationAttendances,
          updatedAt: data.updatedAt?.toDate(),
        };
      }

      return { name: 'Minha Academia' };
    } catch (error) {
      console.error('Error fetching academy settings:', error);
      return null;
    }
  },

  async saveAcademySettings(settings: AcademySettings): Promise<void> {
    try {
      const docRef = doc(db, LEGACY_SETTINGS_COLLECTION, LEGACY_SETTINGS_DOC);

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
      if (settings.pixKey !== undefined) settingsData.pixKey = settings.pixKey;
      if (settings.pixKeyType !== undefined) settingsData.pixKeyType = settings.pixKeyType;
      if (settings.abacatePayEnabled !== undefined) settingsData.abacatePayEnabled = settings.abacatePayEnabled;
      if (settings.autoGraduationEnabled !== undefined) settingsData.autoGraduationEnabled = settings.autoGraduationEnabled;
      if (settings.autoGraduationAttendances !== undefined) settingsData.autoGraduationAttendances = settings.autoGraduationAttendances;

      await setDoc(docRef, settingsData, { merge: true });
    } catch (error) {
      console.error('Error saving academy settings:', error);
      throw error;
    }
  },
};

export default settingsService;
