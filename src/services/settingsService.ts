import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
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
  portalSlogan?: string;              // Frase exibida na TopAppBar do portal (ex: "Vamos avante, ombro a ombro")
  sidebarLogoUrl?: string;            // Logo alternativo para sidebar (se diferente do logoUrl)
  portalBackgroundUrl?: string;       // Background do portal do aluno
  adminBackgroundUrl?: string;        // Background do painel admin/professor
  sidebarBackgroundUrl?: string;      // Background da sidebar

  // Financial
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // AbacatePay Integration
  abacatePayEnabled?: boolean;
  abacatePayApiKey?: string;

  // Auto-graduation Settings
  autoGraduationEnabled?: boolean;
  autoGraduationAttendances?: number;

  // Store Settings
  storeEnabled?: boolean;
  storePublished?: boolean;
  storeWelcomeMessage?: string;
  storeMinOrderAmount?: number;

  // Monitors
  monitorIds?: string[];

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
          portalSlogan: data.portalSlogan,
          sidebarLogoUrl: data.sidebarLogoUrl,
          portalBackgroundUrl: data.portalBackgroundUrl,
          adminBackgroundUrl: data.adminBackgroundUrl,
          sidebarBackgroundUrl: data.sidebarBackgroundUrl,
          pixKey: data.pixKey,
          pixKeyType: data.pixKeyType,
          abacatePayEnabled: data.abacatePayEnabled || false,
          abacatePayApiKey: data.abacatePayApiKey,
          autoGraduationEnabled: data.autoGraduationEnabled || false,
          autoGraduationAttendances: data.autoGraduationAttendances,
          storeEnabled: data.storeEnabled || false,
          storePublished: data.storePublished || false,
          storeWelcomeMessage: data.storeWelcomeMessage,
          storeMinOrderAmount: data.storeMinOrderAmount,
          monitorIds: data.monitorIds || [],
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
      if (settings.portalSlogan !== undefined) settingsData.portalSlogan = settings.portalSlogan;
      if (settings.sidebarLogoUrl !== undefined) settingsData.sidebarLogoUrl = settings.sidebarLogoUrl;
      if (settings.portalBackgroundUrl !== undefined) settingsData.portalBackgroundUrl = settings.portalBackgroundUrl;
      if (settings.adminBackgroundUrl !== undefined) settingsData.adminBackgroundUrl = settings.adminBackgroundUrl;
      if (settings.sidebarBackgroundUrl !== undefined) settingsData.sidebarBackgroundUrl = settings.sidebarBackgroundUrl;
      if (settings.pixKey !== undefined) settingsData.pixKey = settings.pixKey;
      if (settings.pixKeyType !== undefined) settingsData.pixKeyType = settings.pixKeyType;
      if (settings.abacatePayEnabled !== undefined) settingsData.abacatePayEnabled = settings.abacatePayEnabled;
      if (settings.abacatePayApiKey !== undefined) settingsData.abacatePayApiKey = settings.abacatePayApiKey;
      if (settings.autoGraduationEnabled !== undefined) settingsData.autoGraduationEnabled = settings.autoGraduationEnabled;
      if (settings.autoGraduationAttendances !== undefined) settingsData.autoGraduationAttendances = settings.autoGraduationAttendances;
      if (settings.storeEnabled !== undefined) settingsData.storeEnabled = settings.storeEnabled;
      if (settings.storePublished !== undefined) settingsData.storePublished = settings.storePublished;
      if (settings.storeWelcomeMessage !== undefined) settingsData.storeWelcomeMessage = settings.storeWelcomeMessage;
      if (settings.storeMinOrderAmount !== undefined) settingsData.storeMinOrderAmount = settings.storeMinOrderAmount;

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
  // Monitor Management
  // ============================================
  async getMonitors(): Promise<string[]> {
    try {
      const docSnap = await getDoc(this.academyRef);
      if (docSnap.exists()) {
        return docSnap.data().monitorIds || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching monitors:', error);
      return [];
    }
  }

  async addMonitor(studentId: string): Promise<void> {
    await updateDoc(this.academyRef, {
      monitorIds: arrayUnion(studentId),
      updatedAt: serverTimestamp(),
    });
  }

  async removeMonitor(studentId: string): Promise<void> {
    await updateDoc(this.academyRef, {
      monitorIds: arrayRemove(studentId),
      updatedAt: serverTimestamp(),
    });
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
        // Branding
        portalSlogan: data.portalSlogan,
        sidebarLogoUrl: data.sidebarLogoUrl,
        portalBackgroundUrl: data.portalBackgroundUrl,
        adminBackgroundUrl: data.adminBackgroundUrl,
        sidebarBackgroundUrl: data.sidebarBackgroundUrl,
        // Contact
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        // Financial
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
        abacatePayEnabled: data.abacatePayEnabled || false,
        abacatePayApiKey: data.abacatePayApiKey,
        // Auto-graduation
        autoGraduationEnabled: data.autoGraduationEnabled || false,
        autoGraduationAttendances: data.autoGraduationAttendances,
        // Store
        storeEnabled: data.storeEnabled || false,
        storePublished: data.storePublished || false,
        storeWelcomeMessage: data.storeWelcomeMessage,
        storeMinOrderAmount: data.storeMinOrderAmount,
        // Monitors
        monitorIds: data.monitorIds || [],
        // Subscription & Metadata
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
          portalSlogan: data.portalSlogan,
          sidebarLogoUrl: data.sidebarLogoUrl,
          portalBackgroundUrl: data.portalBackgroundUrl,
          adminBackgroundUrl: data.adminBackgroundUrl,
          sidebarBackgroundUrl: data.sidebarBackgroundUrl,
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
      if (settings.portalSlogan !== undefined) settingsData.portalSlogan = settings.portalSlogan;
      if (settings.sidebarLogoUrl !== undefined) settingsData.sidebarLogoUrl = settings.sidebarLogoUrl;
      if (settings.portalBackgroundUrl !== undefined) settingsData.portalBackgroundUrl = settings.portalBackgroundUrl;
      if (settings.adminBackgroundUrl !== undefined) settingsData.adminBackgroundUrl = settings.adminBackgroundUrl;
      if (settings.sidebarBackgroundUrl !== undefined) settingsData.sidebarBackgroundUrl = settings.sidebarBackgroundUrl;
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
