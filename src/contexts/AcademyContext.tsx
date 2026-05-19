'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import { api, academyApi, ApiError } from '@/lib/api/client';
import { Academy, UserAcademyMapping, AcademyUser, UserRole } from '@/types';

// ============================================
// Query keys that depend on the active academy.
// Used by setAcademyAction's invalidate predicate so we drop only
// per-academy data on switch (NOT currentUser, userPreferences, etc).
// Keep this list in sync with the QUERY_KEYS objects in src/hooks/.
// ============================================
const ACADEMY_SCOPED_KEY_FRAGMENTS = [
  'student',
  'allStudents',
  'class',
  'plan',
  'payment',
  'financial',
  'monthlySummary',
  'revenueStats',
  'attendance',
  'eligibility',
  'assessment',
  'competition',
  'photo',
  'checkin',
  'billing',
  'guardian',
  'news',
  'event',
  'store',
  'order',
  'retention',
  'academySettings',
  'abacatePayEnabled',
  'asaasEnabled',
  'monitor',
  'belt',
];

function isAcademyScopedKey(key: readonly unknown[]): boolean {
  return key.some((segment) => {
    if (typeof segment !== 'string') return false;
    const lower = segment.toLowerCase();
    return ACADEMY_SCOPED_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
  });
}

// ============================================
// Academy Info Type (for multi-academy display)
// ============================================
export interface AcademyInfo {
  id: string;
  name: string;
  logoUrl?: string;
  studentId?: string;
  role: UserRole;
}

// ============================================
// Academy Context Types
// ============================================
interface AcademyContextType {
  academyId: string | null;
  academy: Academy | null;
  academyUser: AcademyUser | null;
  primaryAcademyId: string | null;
  userAcademies: string[];
  academiesInfo: AcademyInfo[];
  hasMultipleAcademies: boolean;
  userAcademyMapping: UserAcademyMapping | null;
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;
  setAcademy: (academyId: string) => Promise<void>;
  setPrimaryAcademy: (academyId: string) => Promise<void>;
  refreshAcademy: () => Promise<void>;
  refreshAcademiesInfo: () => Promise<void>;
  reloadUserMapping: () => Promise<AcademyUser | null>;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

// ============================================
// Go API wire shapes
// ============================================
interface GoMembership {
  uid: string;
  academy_id: string;
  role: string;
  student_id?: string;
  joined_at: string;
  status: string;
  extra_permissions: string[];
}

interface GoMeUser {
  uid: string;
  email: string;
  display_name?: string;
  photo_url?: string;
  phone?: string;
}

interface GoCurrentUser {
  user: GoMeUser;
  memberships: GoMembership[];
  primary_academy_id?: string;
}

interface GoAddress {
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface GoAcademy {
  id: string;
  name: string;
  slug: string;
  owner_uid: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  pix_key?: string;
  pix_key_type?: string;
  address?: GoAddress;
  abacatepay_enabled: boolean;
  asaas_enabled: boolean;
  asaas_onboarding_status?: string;
  auto_graduation_enabled: boolean;
  auto_graduation_attendances: number;
  use_class_weights: boolean;
  store_enabled: boolean;
  store_published: boolean;
  student_checkin_enabled: boolean;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Mappers
// ============================================
function goAcademyToTS(a: GoAcademy): Academy {
  return {
    id: a.id,
    name: a.name,
    slug: a.slug,
    ownerId: a.owner_uid,
    cnpj: a.cnpj || undefined,
    email: a.email || undefined,
    phone: a.phone || undefined,
    pixKey: a.pix_key || undefined,
    pixKeyType: a.pix_key_type as Academy['pixKeyType'],
    address: a.address?.street || undefined,
    city: a.address?.city || undefined,
    state: a.address?.state || undefined,
    zipCode: a.address?.zip_code || undefined,
    abacatePayEnabled: a.abacatepay_enabled,
    asaasEnabled: a.asaas_enabled,
    asaasOnboardingStatus: a.asaas_onboarding_status as Academy['asaasOnboardingStatus'],
    autoGraduationEnabled: a.auto_graduation_enabled,
    autoGraduationAttendances: a.auto_graduation_attendances,
    useClassWeights: a.use_class_weights,
    storeEnabled: a.store_enabled,
    storePublished: a.store_published,
    studentCheckinEnabled: a.student_checkin_enabled,
    subscription: a.subscription_plan
      ? {
          plan: a.subscription_plan as Academy['subscription'] extends object ? Academy['subscription']['plan'] : never,
          status: (a.subscription_status || 'active') as Academy['subscription'] extends object ? Academy['subscription']['status'] : never,
          expiresAt: a.subscription_expires_at ? new Date(a.subscription_expires_at) : undefined,
        }
      : undefined,
    createdAt: new Date(a.created_at),
    updatedAt: new Date(a.updated_at),
  };
}

function buildAcademyUser(goUser: GoMeUser, m: GoMembership): AcademyUser {
  return {
    id: goUser.uid,
    email: goUser.email,
    displayName: goUser.display_name || goUser.email || '',
    photoUrl: goUser.photo_url || undefined,
    phone: goUser.phone || undefined,
    role: m.role as UserRole,
    studentId: m.student_id,
    extraPermissions: m.extra_permissions as AcademyUser['extraPermissions'],
    status: m.status as AcademyUser['status'],
    joinedAt: new Date(m.joined_at),
    createdAt: new Date(m.joined_at),
    updatedAt: new Date(),
  };
}

// ============================================
// Academy Provider Component
// ============================================
export function AcademyProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [academyId, setAcademyId] = useState<string | null>(null);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [academyUser, setAcademyUser] = useState<AcademyUser | null>(null);
  const [userAcademies, setUserAcademies] = useState<string[]>([]);
  const [academiesInfo, setAcademiesInfo] = useState<AcademyInfo[]>([]);
  const [primaryAcademyId, setPrimaryAcademyIdState] = useState<string | null>(null);
  const [userAcademyMapping, setUserAcademyMapping] = useState<UserAcademyMapping | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache /v1/me data so academy switches don't need another round-trip
  const meUserRef = useRef<GoMeUser | null>(null);
  const membershipsRef = useRef<GoMembership[]>([]);

  // Polling interval that replaces onSnapshot
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Load a single academy from the Go backend
  const loadAcademyData = useCallback(async (id: string): Promise<void> => {
    const goAcademy = await api.get<GoAcademy>(`/v1/academies/${id}`);
    setAcademy(goAcademyToTS(goAcademy));
    setAcademyId(id);
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        await loadAcademyData(id);
      } catch {
        // Silent — polling errors shouldn't interrupt the UI
      }
    }, 60_000);
  }, [stopPolling, loadAcademyData]);

  // Fetch /v1/me and update all membership-derived state.
  // Returns null if the user doesn't exist in tatami yet (404) — callers
  // treat null as "new user, zero academies" and redirect to /criar-academia.
  const loadMe = useCallback(async (): Promise<GoCurrentUser | null> => {
    let me: GoCurrentUser;
    try {
      me = await api.get<GoCurrentUser>('/v1/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setUserAcademies([]);
        return null;
      }
      throw err;
    }
    meUserRef.current = me.user;
    membershipsRef.current = me.memberships;

    const active = me.memberships.filter(m => m.status === 'active');
    const academyIds = active.map(m => m.academy_id);
    setUserAcademies(academyIds);

    const primaryId = me.primary_academy_id || academyIds[0] || null;
    setPrimaryAcademyIdState(primaryId);

    const mapping: UserAcademyMapping = {
      id: me.user.uid,
      academyIds,
      primaryAcademyId: primaryId || undefined,
      academyDetails: Object.fromEntries(
        active.map(m => [
          m.academy_id,
          {
            role: m.role as UserRole,
            studentId: m.student_id,
            joinedAt: new Date(m.joined_at),
            status: m.status as 'active' | 'inactive' | 'pending',
            extraPermissions: m.extra_permissions as AcademyUser['extraPermissions'],
          },
        ])
      ),
    };
    setUserAcademyMapping(mapping);

    return me;
  }, []);

  // Load academy name/role list for the switcher
  const loadAcademiesInfo = useCallback(async (active: GoMembership[]): Promise<void> => {
    if (active.length === 0) {
      setAcademiesInfo([]);
      return;
    }
    const { items } = await api.get<{ items: GoAcademy[] }>('/v1/academies');
    setAcademiesInfo(
      items.map(a => {
        const m = active.find(m => m.academy_id === a.id);
        return {
          id: a.id,
          name: a.name,
          studentId: m?.student_id,
          role: (m?.role as UserRole) || 'student',
        };
      })
    );
  }, []);

  // ============================================
  // Initial load on auth state change
  // ============================================
  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser || !isAuthenticated) {
      setAcademyId(null);
      setAcademy(null);
      setAcademyUser(null);
      setUserAcademies([]);
      setAcademiesInfo([]);
      setUserAcademyMapping(null);
      setPrimaryAcademyIdState(null);
      meUserRef.current = null;
      membershipsRef.current = [];
      setIsLoading(false);
      stopPolling();
      return;
    }

    const init = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const me = await loadMe();
        if (!me) return;

        const active = me.memberships.filter(m => m.status === 'active');
        const primaryId = me.primary_academy_id || active[0]?.academy_id || null;

        const tasks: Promise<void>[] = [loadAcademiesInfo(active)];

        if (primaryId) {
          const membership = active.find(m => m.academy_id === primaryId);
          if (membership) setAcademyUser(buildAcademyUser(me.user, membership));
          tasks.push(loadAcademyData(primaryId));
        }

        await Promise.allSettled(tasks);
        if (primaryId) startPolling(primaryId);
      } catch (err) {
        console.error('[AcademyContext] init error:', err);
        setError('Erro ao carregar dados da academia');
      } finally {
        setIsLoading(false);
      }
    };

    init();
    return stopPolling;
  }, [firebaseUser, isAuthenticated, authLoading, loadMe, loadAcademiesInfo, loadAcademyData, startPolling, stopPolling]);

  // ============================================
  // Switch active academy (without changing primary)
  // ============================================
  const setAcademyAction = useCallback(async (newAcademyId: string) => {
    if (!userAcademies.includes(newAcademyId)) {
      setError('Você não tem acesso a esta academia');
      return;
    }
    if (newAcademyId === academyId) return;

    setIsSwitching(true);
    setError(null);
    stopPolling();

    try {
      await loadAcademyData(newAcademyId);

      const membership = membershipsRef.current.find(
        m => m.academy_id === newAcademyId && m.status === 'active'
      );
      if (membership && meUserRef.current) {
        setAcademyUser(buildAcademyUser(meUserRef.current, membership));
      }

      startPolling(newAcademyId);

      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          return isAcademyScopedKey(key);
        },
      });
    } catch (err) {
      console.error('[AcademyContext] switch error:', err);
      setError('Erro ao trocar de academia');
    } finally {
      setIsSwitching(false);
    }
  }, [userAcademies, academyId, loadAcademyData, startPolling, stopPolling, queryClient]);

  // ============================================
  // Set Primary Academy
  // ============================================
  const setPrimaryAcademyAction = useCallback(async (newPrimaryId: string) => {
    if (!userAcademies.includes(newPrimaryId)) {
      setError('Você não tem acesso a esta academia');
      return;
    }
    try {
      await academyApi.setPrimary(newPrimaryId);
      setPrimaryAcademyIdState(newPrimaryId);
    } catch (err) {
      console.error('[AcademyContext] setPrimary error:', err);
      setError('Erro ao definir academia principal');
    }
  }, [userAcademies]);

  const refreshAcademy = useCallback(async () => {
    if (!academyId) return;
    await loadAcademyData(academyId);
  }, [academyId, loadAcademyData]);

  const refreshAcademiesInfo = useCallback(async () => {
    const active = membershipsRef.current.filter(m => m.status === 'active');
    await loadAcademiesInfo(active);
  }, [loadAcademiesInfo]);

  const reloadUserMapping = useCallback(async (): Promise<AcademyUser | null> => {
    try {
      const me = await loadMe();
      if (!me) return null;

      const active = me.memberships.filter(m => m.status === 'active');
      const targetId = academyId || me.primary_academy_id || active[0]?.academy_id;
      if (!targetId) return null;

      const membership = active.find(m => m.academy_id === targetId);
      if (!membership) return null;

      const academyUserData = buildAcademyUser(me.user, membership);
      setAcademyUser(academyUserData);
      await loadAcademiesInfo(active);

      return academyUserData;
    } catch (err) {
      console.error('[AcademyContext] reloadUserMapping error:', err);
      return null;
    }
  }, [loadMe, loadAcademiesInfo, academyId]);

  const hasMultipleAcademies = useMemo(() => userAcademies.length > 1, [userAcademies]);

  const contextValue = useMemo<AcademyContextType>(() => ({
    academyId,
    academy,
    academyUser,
    primaryAcademyId,
    userAcademies,
    academiesInfo,
    hasMultipleAcademies,
    userAcademyMapping,
    isLoading,
    isSwitching,
    error,
    setAcademy: setAcademyAction,
    setPrimaryAcademy: setPrimaryAcademyAction,
    refreshAcademy,
    refreshAcademiesInfo,
    reloadUserMapping,
  }), [
    academyId,
    academy,
    academyUser,
    primaryAcademyId,
    userAcademies,
    academiesInfo,
    hasMultipleAcademies,
    userAcademyMapping,
    isLoading,
    isSwitching,
    error,
    setAcademyAction,
    setPrimaryAcademyAction,
    refreshAcademy,
    refreshAcademiesInfo,
    reloadUserMapping,
  ]);

  return (
    <AcademyContext.Provider value={contextValue}>
      {children}
    </AcademyContext.Provider>
  );
}

// ============================================
// Custom Hooks
// ============================================
export function useAcademy() {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
}

export function useRequireAcademy() {
  const { academyId, academy, isLoading, error } = useAcademy();

  if (!isLoading && !academyId) {
    throw new Error('No academy selected. User must be assigned to an academy.');
  }

  return { academyId: academyId!, academy: academy!, isLoading, error };
}
