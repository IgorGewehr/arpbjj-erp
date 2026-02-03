'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode
} from 'react';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Academy, UserAcademyMapping, AcademyUser, UserRole } from '@/types';

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
  // Current selected academy
  academyId: string | null;
  academy: Academy | null;
  academyUser: AcademyUser | null;

  // Primary academy (user's default)
  primaryAcademyId: string | null;

  // User's academies (for multi-academy users)
  userAcademies: string[];
  academiesInfo: AcademyInfo[];
  hasMultipleAcademies: boolean;
  userAcademyMapping: UserAcademyMapping | null;

  // Loading state
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;

  // Actions
  setAcademy: (academyId: string) => Promise<void>;
  setPrimaryAcademy: (academyId: string) => Promise<void>;
  refreshAcademy: () => Promise<void>;
  refreshAcademiesInfo: () => Promise<void>;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

// ============================================
// Academy Provider Component
// ============================================
interface AcademyProviderProps {
  children: ReactNode;
}

export function AcademyProvider({ children }: AcademyProviderProps) {
  const { user, firebaseUser, isAuthenticated, loading: authLoading } = useAuth();

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

  // ============================================
  // Load Academy Info for all user's academies
  // ============================================
  const loadAcademiesInfo = useCallback(async (academyIds: string[], mapping: UserAcademyMapping) => {
    const infos: AcademyInfo[] = [];

    for (const id of academyIds) {
      try {
        const academyRef = doc(db, 'academies', id);
        const academySnap = await getDoc(academyRef);

        if (academySnap.exists()) {
          const data = academySnap.data();
          const details = mapping.academyDetails?.[id];

          infos.push({
            id,
            name: data.name || 'Academia',
            logoUrl: data.logoUrl,
            studentId: details?.studentId,
            role: (details?.role as UserRole) || 'student',
          });
        }
      } catch (err) {
        console.error(`Error loading academy info for ${id}:`, err);
      }
    }

    setAcademiesInfo(infos);
    return infos;
  }, []);

  // ============================================
  // Load Academy User Data (defined first - no dependencies on other callbacks)
  // ============================================
  const loadAcademyUser = useCallback(async (academyId: string) => {
    if (!firebaseUser) return;

    try {
      const userRef = doc(db, `academies/${academyId}/users`, firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setAcademyUser({
          id: userSnap.id,
          email: data.email || firebaseUser.email || '',
          displayName: data.displayName || firebaseUser.displayName || '',
          photoUrl: data.photoUrl,
          role: data.role || 'student',
          phone: data.phone,
          studentId: data.studentId,
          linkedStudentIds: data.linkedStudentIds,
          instructorId: data.instructorId,
          pendingStudentLink: data.pendingStudentLink,
          approvedAt: data.approvedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      } else {
        console.log('[AcademyContext] No academy user document found for user:', firebaseUser.uid);
        setAcademyUser(null);
      }
    } catch (err) {
      console.error('Error loading academy user:', err);
    }
  }, [firebaseUser]);

  // ============================================
  // Load Academy Data (depends on loadAcademyUser)
  // ============================================
  const loadAcademy = useCallback(async (id: string) => {
    if (!firebaseUser) return;

    try {
      const academyRef = doc(db, 'academies', id);
      const academySnap = await getDoc(academyRef);

      if (academySnap.exists()) {
        const data = academySnap.data();
        const academyData: Academy = {
          id: academySnap.id,
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
          // Auto-graduation
          autoGraduationEnabled: data.autoGraduationEnabled || false,
          autoGraduationAttendances: data.autoGraduationAttendances,
          // Store
          storeEnabled: data.storeEnabled || false,
          storePublished: data.storePublished || false,
          storeCreditCardEnabled: data.storeCreditCardEnabled || false,
          storeWelcomeMessage: data.storeWelcomeMessage,
          storeMinOrderAmount: data.storeMinOrderAmount,
          // Student Check-in
          studentCheckinEnabled: data.studentCheckinEnabled || false,
          // Monitors
          monitorIds: data.monitorIds || [],
          // Asaas
          asaasEnabled: data.asaasEnabled || false,
          asaasSubAccountId: data.asaasSubAccountId,
          asaasOnboardingStatus: data.asaasOnboardingStatus,
          asaasKycStatus: data.asaasKycStatus,
          // Subscription & Metadata
          subscription: data.subscription,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          ownerId: data.ownerId,
        };

        setAcademy(academyData);
        setAcademyId(id);

        // Load academy user data
        await loadAcademyUser(id);
      } else {
        setError('Academia não encontrada');
      }
    } catch (err) {
      console.error('Error loading academy:', err);
      setError('Erro ao carregar dados da academia');
    }
  }, [firebaseUser, loadAcademyUser]);

  // ============================================
  // Load User's Academy Mapping (depends on loadAcademy)
  // ============================================
  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser || !isAuthenticated) {
      setAcademyId(null);
      setAcademy(null);
      setAcademyUser(null);
      setUserAcademies([]);
      setIsLoading(false);
      return;
    }

    const loadUserAcademyMapping = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Try to get user's academy mapping
        const mappingRef = doc(db, 'userAcademyMapping', firebaseUser.uid);
        const mappingSnap = await getDoc(mappingRef);

        if (mappingSnap.exists()) {
          const mapping = mappingSnap.data() as UserAcademyMapping;
          setUserAcademyMapping(mapping);
          setUserAcademies(mapping.academyIds || []);

          // Set primary academy ID
          const primaryId = mapping.primaryAcademyId || mapping.academyIds[0];
          setPrimaryAcademyIdState(primaryId || null);

          // Load academy info for all academies (for switcher)
          if (mapping.academyIds?.length > 0) {
            await loadAcademiesInfo(mapping.academyIds, mapping);
          }

          // Load primary academy
          if (primaryId) {
            await loadAcademy(primaryId);
          }
        } else {
          // No mapping found - user is not linked to any academy
          console.log('[AcademyContext] No userAcademyMapping found for user:', firebaseUser.uid);
          setUserAcademyMapping(null);
          setUserAcademies([]);
          setAcademiesInfo([]);
          setPrimaryAcademyIdState(null);
          setAcademyId(null);
          setAcademy(null);
        }
      } catch (err) {
        console.error('Error loading user academy mapping:', err);
        setError('Erro ao carregar dados da academia');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAcademyMapping();
  }, [firebaseUser, isAuthenticated, authLoading, loadAcademy]);

  // ============================================
  // Set Active Academy (switch without changing primary)
  // ============================================
  const setAcademyAction = useCallback(async (newAcademyId: string) => {
    if (!userAcademies.includes(newAcademyId)) {
      setError('Você não tem acesso a esta academia');
      return;
    }

    if (newAcademyId === academyId) return;

    setIsSwitching(true);
    setError(null);

    try {
      await loadAcademy(newAcademyId);
    } catch (err) {
      console.error('Error switching academy:', err);
      setError('Erro ao trocar de academia');
    } finally {
      setIsSwitching(false);
    }
  }, [userAcademies, academyId, loadAcademy]);

  // ============================================
  // Set Primary Academy (updates Firestore)
  // ============================================
  const setPrimaryAcademyAction = useCallback(async (newPrimaryId: string) => {
    if (!firebaseUser || !userAcademies.includes(newPrimaryId)) {
      setError('Você não tem acesso a esta academia');
      return;
    }

    try {
      const mappingRef = doc(db, 'userAcademyMapping', firebaseUser.uid);
      await updateDoc(mappingRef, {
        primaryAcademyId: newPrimaryId,
        updatedAt: new Date(),
      });

      setPrimaryAcademyIdState(newPrimaryId);
    } catch (err) {
      console.error('Error setting primary academy:', err);
      setError('Erro ao definir academia principal');
    }
  }, [firebaseUser, userAcademies]);

  // ============================================
  // Refresh Academy Data
  // ============================================
  const refreshAcademy = useCallback(async () => {
    if (!academyId) return;
    await loadAcademy(academyId);
  }, [academyId, loadAcademy]);

  // ============================================
  // Refresh Academies Info (for switcher)
  // ============================================
  const refreshAcademiesInfo = useCallback(async () => {
    if (!firebaseUser || !userAcademyMapping) return;
    await loadAcademiesInfo(userAcademyMapping.academyIds || [], userAcademyMapping);
  }, [firebaseUser, userAcademyMapping, loadAcademiesInfo]);

  // ============================================
  // Real-time Academy Updates
  // ============================================
  useEffect(() => {
    if (!academyId) return;

    const academyRef = doc(db, 'academies', academyId);
    const unsubscribe = onSnapshot(academyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAcademy({
          id: snapshot.id,
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
          // Auto-graduation
          autoGraduationEnabled: data.autoGraduationEnabled || false,
          autoGraduationAttendances: data.autoGraduationAttendances,
          // Store
          storeEnabled: data.storeEnabled || false,
          storePublished: data.storePublished || false,
          storeCreditCardEnabled: data.storeCreditCardEnabled || false,
          storeWelcomeMessage: data.storeWelcomeMessage,
          storeMinOrderAmount: data.storeMinOrderAmount,
          // Student Check-in
          studentCheckinEnabled: data.studentCheckinEnabled || false,
          // Monitors
          monitorIds: data.monitorIds || [],
          // Asaas
          asaasEnabled: data.asaasEnabled || false,
          asaasSubAccountId: data.asaasSubAccountId,
          asaasOnboardingStatus: data.asaasOnboardingStatus,
          asaasKycStatus: data.asaasKycStatus,
          // Subscription & Metadata
          subscription: data.subscription,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          ownerId: data.ownerId,
        });
      }
    }, (err) => {
      console.error('Error listening to academy updates:', err);
    });

    return () => unsubscribe();
  }, [academyId]);

  // ============================================
  // Computed Values
  // ============================================
  const hasMultipleAcademies = useMemo(
    () => userAcademies.length > 1,
    [userAcademies]
  );

  // ============================================
  // Context Value
  // ============================================
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
  ]);

  return (
    <AcademyContext.Provider value={contextValue}>
      {children}
    </AcademyContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================
export function useAcademy() {
  const context = useContext(AcademyContext);
  if (!context) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
}

// ============================================
// Require Academy Hook (throws if no academy)
// ============================================
export function useRequireAcademy() {
  const { academyId, academy, isLoading, error } = useAcademy();

  if (!isLoading && !academyId) {
    throw new Error('No academy selected. User must be assigned to an academy.');
  }

  return { academyId: academyId!, academy: academy!, isLoading, error };
}
