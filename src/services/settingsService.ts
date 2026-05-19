import { api } from '@/lib/api/client';
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

  // Responsible Person (for Asaas onboarding)
  responsibleBirthDate?: string;

  // Branding
  logoUrl?: string;
  portalSlogan?: string;
  sidebarLogoUrl?: string;
  portalBackgroundUrl?: string;
  adminBackgroundUrl?: string;
  sidebarBackgroundUrl?: string;

  // Financial
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // AbacatePay Integration
  abacatePayEnabled?: boolean;

  // Asaas Integration
  asaasEnabled?: boolean;

  // Asaas KYC
  asaasKycStatus?: 'not_checked' | 'pending_upload' | 'pending_review' | 'approved' | 'rejected' | 'onboarding_url';
  asaasKycOnboardingUrl?: string;

  // Auto-graduation Settings
  autoGraduationEnabled?: boolean;
  autoGraduationAttendances?: number;
  useClassWeights?: boolean;

  // Store Settings
  storeEnabled?: boolean;
  storePublished?: boolean;
  storeWelcomeMessage?: string;
  storeMinOrderAmount?: number;
  storeCreditCardEnabled?: boolean;

  // Student Check-in Settings
  studentCheckinEnabled?: boolean;

  // Monitors
  monitorIds?: string[];

  updatedAt?: Date;
}

// ============================================
// Go API setting shape
// ============================================
interface RawSetting {
  academy_id: string;
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  updated_at: string;
}

// ============================================
// Helper: settings array → plain object map
// ============================================
function settingsArrayToMap(items: RawSetting[]): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const item of items) {
    map[item.key] = item.value;
  }
  return map;
}

// ============================================
// Helper: map flat Go settings to AcademySettings
// ============================================
function mapToAcademySettings(data: Record<string, unknown>): AcademySettings {
  return {
    name: (data.name as string) || '',
    slug: data.slug as string | undefined,
    cnpj: data.cnpj as string | undefined,
    email: data.email as string | undefined,
    phone: data.phone as string | undefined,
    address: data.address as string | undefined,
    city: data.city as string | undefined,
    state: data.state as string | undefined,
    zipCode: data.zipCode as string | undefined,
    responsibleBirthDate: data.responsibleBirthDate as string | undefined,
    logoUrl: data.logoUrl as string | undefined,
    portalSlogan: data.portalSlogan as string | undefined,
    sidebarLogoUrl: data.sidebarLogoUrl as string | undefined,
    portalBackgroundUrl: data.portalBackgroundUrl as string | undefined,
    adminBackgroundUrl: data.adminBackgroundUrl as string | undefined,
    sidebarBackgroundUrl: data.sidebarBackgroundUrl as string | undefined,
    pixKey: data.pixKey as string | undefined,
    pixKeyType: data.pixKeyType as AcademySettings['pixKeyType'],
    abacatePayEnabled: (data.abacatePayEnabled as boolean) || false,
    asaasEnabled: (data.asaasEnabled as boolean) || false,
    asaasKycStatus: data.asaasKycStatus as AcademySettings['asaasKycStatus'],
    asaasKycOnboardingUrl: data.asaasKycOnboardingUrl as string | undefined,
    autoGraduationEnabled: (data.autoGraduationEnabled as boolean) || false,
    autoGraduationAttendances: data.autoGraduationAttendances as number | undefined,
    useClassWeights: (data.useClassWeights as boolean) || false,
    storeEnabled: (data.storeEnabled as boolean) || false,
    storePublished: (data.storePublished as boolean) || false,
    storeWelcomeMessage: data.storeWelcomeMessage as string | undefined,
    storeMinOrderAmount: data.storeMinOrderAmount as number | undefined,
    storeCreditCardEnabled: (data.storeCreditCardEnabled as boolean) || false,
    studentCheckinEnabled: (data.studentCheckinEnabled as boolean) || false,
    monitorIds: (data.monitorIds as string[]) || [],
  };
}

// ============================================
// Settings Service Class (Multi-Tenant)
// ============================================
class SettingsService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get base() {
    return `/v1/academies/${this.academyId}/settings`;
  }

  private async getAllSettings(): Promise<Record<string, unknown>> {
    const res = await api.get<{ items: RawSetting[] } | RawSetting[]>(this.base);
    const items = Array.isArray(res) ? res : (res as { items: RawSetting[] }).items ?? [];
    return settingsArrayToMap(items);
  }

  private async setSetting(key: string, value: unknown): Promise<void> {
    await api.put(`${this.base}/${key}`, { value });
  }

  // ============================================
  // Get Academy Settings
  // ============================================
  async getAcademySettings(): Promise<AcademySettings | null> {
    try {
      const data = await this.getAllSettings();
      return mapToAcademySettings(data);
    } catch (error) {
      console.error('Error fetching academy settings:', error);
      return null;
    }
  }

  // ============================================
  // Save Academy Settings (batch PUT per key)
  // ============================================
  async saveAcademySettings(settings: Partial<AcademySettings>): Promise<void> {
    try {
      const pairs: Array<[string, unknown]> = [];

      if (settings.name !== undefined) pairs.push(['name', settings.name]);
      if (settings.slug !== undefined) pairs.push(['slug', settings.slug]);
      if (settings.cnpj !== undefined) pairs.push(['cnpj', settings.cnpj]);
      if (settings.email !== undefined) pairs.push(['email', settings.email]);
      if (settings.phone !== undefined) pairs.push(['phone', settings.phone]);
      if (settings.address !== undefined) pairs.push(['address', settings.address]);
      if (settings.city !== undefined) pairs.push(['city', settings.city]);
      if (settings.state !== undefined) pairs.push(['state', settings.state]);
      if (settings.zipCode !== undefined) pairs.push(['zipCode', settings.zipCode]);
      if (settings.responsibleBirthDate !== undefined) pairs.push(['responsibleBirthDate', settings.responsibleBirthDate]);
      if (settings.logoUrl !== undefined) pairs.push(['logoUrl', settings.logoUrl]);
      if (settings.portalSlogan !== undefined) pairs.push(['portalSlogan', settings.portalSlogan]);
      if (settings.sidebarLogoUrl !== undefined) pairs.push(['sidebarLogoUrl', settings.sidebarLogoUrl]);
      if (settings.portalBackgroundUrl !== undefined) pairs.push(['portalBackgroundUrl', settings.portalBackgroundUrl]);
      if (settings.adminBackgroundUrl !== undefined) pairs.push(['adminBackgroundUrl', settings.adminBackgroundUrl]);
      if (settings.sidebarBackgroundUrl !== undefined) pairs.push(['sidebarBackgroundUrl', settings.sidebarBackgroundUrl]);
      if (settings.pixKey !== undefined) pairs.push(['pixKey', settings.pixKey]);
      if (settings.pixKeyType !== undefined) pairs.push(['pixKeyType', settings.pixKeyType]);
      if (settings.abacatePayEnabled !== undefined) pairs.push(['abacatePayEnabled', settings.abacatePayEnabled]);
      if (settings.asaasEnabled !== undefined) pairs.push(['asaasEnabled', settings.asaasEnabled]);
      if (settings.autoGraduationEnabled !== undefined) pairs.push(['autoGraduationEnabled', settings.autoGraduationEnabled]);
      if (settings.autoGraduationAttendances !== undefined) pairs.push(['autoGraduationAttendances', settings.autoGraduationAttendances]);
      if (settings.useClassWeights !== undefined) pairs.push(['useClassWeights', settings.useClassWeights]);
      if (settings.storeEnabled !== undefined) pairs.push(['storeEnabled', settings.storeEnabled]);
      if (settings.storePublished !== undefined) pairs.push(['storePublished', settings.storePublished]);
      if (settings.storeWelcomeMessage !== undefined) pairs.push(['storeWelcomeMessage', settings.storeWelcomeMessage]);
      if (settings.storeMinOrderAmount !== undefined) pairs.push(['storeMinOrderAmount', settings.storeMinOrderAmount]);
      if (settings.storeCreditCardEnabled !== undefined) pairs.push(['storeCreditCardEnabled', settings.storeCreditCardEnabled]);
      if (settings.studentCheckinEnabled !== undefined) pairs.push(['studentCheckinEnabled', settings.studentCheckinEnabled]);

      await Promise.all(pairs.map(([key, value]) => this.setSetting(key, value)));
    } catch (error) {
      console.error('Error saving academy settings:', error);
      throw error;
    }
  }

  // ============================================
  // Update Logo
  // ============================================
  async updateLogo(logoUrl: string): Promise<void> {
    await this.setSetting('logoUrl', logoUrl);
  }

  // ============================================
  // Toggle AbacatePay
  // ============================================
  async toggleAbacatePay(enabled: boolean): Promise<void> {
    await this.setSetting('abacatePayEnabled', enabled);
  }

  // ============================================
  // Update Auto-graduation Settings
  // ============================================
  async updateAutoGraduation(enabled: boolean, attendances?: number): Promise<void> {
    await this.setSetting('autoGraduationEnabled', enabled);
    if (attendances !== undefined) {
      await this.setSetting('autoGraduationAttendances', attendances);
    }
  }

  // ============================================
  // Monitor Management
  // ============================================
  async getMonitors(): Promise<string[]> {
    try {
      const data = await this.getAllSettings();
      return (data.monitorIds as string[]) || [];
    } catch {
      return [];
    }
  }

  async addMonitor(studentId: string): Promise<void> {
    const monitors = await this.getMonitors();
    if (!monitors.includes(studentId)) {
      await this.setSetting('monitorIds', [...monitors, studentId]);
    }
  }

  async removeMonitor(studentId: string): Promise<void> {
    const monitors = await this.getMonitors();
    await this.setSetting('monitorIds', monitors.filter((id) => id !== studentId));
  }

  // ============================================
  // Get Full Academy Data
  // Constructs an Academy object from settings keys.
  // ============================================
  async getAcademy(): Promise<Academy | null> {
    try {
      const data = await this.getAllSettings();
      return {
        id: this.academyId,
        name: (data.name as string) || '',
        slug: (data.slug as string) || '',
        logoUrl: data.logoUrl as string | undefined,
        portalSlogan: data.portalSlogan as string | undefined,
        sidebarLogoUrl: data.sidebarLogoUrl as string | undefined,
        portalBackgroundUrl: data.portalBackgroundUrl as string | undefined,
        adminBackgroundUrl: data.adminBackgroundUrl as string | undefined,
        sidebarBackgroundUrl: data.sidebarBackgroundUrl as string | undefined,
        cnpj: data.cnpj as string | undefined,
        email: data.email as string | undefined,
        phone: data.phone as string | undefined,
        address: data.address as string | undefined,
        city: data.city as string | undefined,
        state: data.state as string | undefined,
        zipCode: data.zipCode as string | undefined,
        responsibleBirthDate: data.responsibleBirthDate as string | undefined,
        pixKey: data.pixKey as string | undefined,
        pixKeyType: data.pixKeyType as Academy['pixKeyType'],
        abacatePayEnabled: (data.abacatePayEnabled as boolean) || false,
        asaasEnabled: (data.asaasEnabled as boolean) || false,
        autoGraduationEnabled: (data.autoGraduationEnabled as boolean) || false,
        autoGraduationAttendances: data.autoGraduationAttendances as number | undefined,
        useClassWeights: (data.useClassWeights as boolean) || false,
        storeEnabled: (data.storeEnabled as boolean) || false,
        storePublished: (data.storePublished as boolean) || false,
        storeWelcomeMessage: data.storeWelcomeMessage as string | undefined,
        storeMinOrderAmount: data.storeMinOrderAmount as number | undefined,
        storeCreditCardEnabled: (data.storeCreditCardEnabled as boolean) || false,
        studentCheckinEnabled: (data.studentCheckinEnabled as boolean) || false,
        monitorIds: (data.monitorIds as string[]) || [],
        subscription: data.subscription as Academy['subscription'],
        createdAt: data.createdAt ? new Date(data.createdAt as string) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt as string) : new Date(),
        ownerId: (data.ownerId as string) || '',
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
// Uses DEFAULT_ACADEMY_ID from env
// ============================================
const DEFAULT_ACADEMY_ID = process.env.NEXT_PUBLIC_DEFAULT_ACADEMY_ID || 'default';

export const settingsService = {
  async getAcademySettings(): Promise<AcademySettings | null> {
    return new SettingsService(DEFAULT_ACADEMY_ID).getAcademySettings();
  },

  async saveAcademySettings(settings: AcademySettings): Promise<void> {
    return new SettingsService(DEFAULT_ACADEMY_ID).saveAcademySettings(settings);
  },
};

export default settingsService;
