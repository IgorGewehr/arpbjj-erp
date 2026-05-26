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
import { doc, getDoc, onSnapshot, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Academy, UserAcademyMapping, AcademyUser, UserRole } from '@/types';

// ============================================
// Query keys that depend on the active academy.
// Used by setAcademyAction's invalidate predicate so we drop only
// per-academy data on switch (NOT currentUser, userPreferences, etc).
// Keep this list in sync with the QUERY_KEYS objects in src/hooks/.
// ============================================
const ACADEMY_SCOPED_KEY_FRAGMENTS = [
  'student',          // student, students, studentEligibility, studentPlan, studentPayments, etc.
  'allStudents',
  'class',            // class, classes, allClasses, todayClasses, currentClass, weeklySchedule
  'plan',             // plans, plan, activePlans, studentPlan, studentPlans
  'payment',          // pendingPayments, overduePayments, studentPayments
  'financial',        // financials, financial
  'monthlySummary',
  'revenueStats',
  'attendance',       // attendance, todayAttendance, classesForDate, studentAttendance, presentStudentIds
  'eligibility',      // eligibilitySnapshot, studentEligibility
  'assessment',       // assessments, recentAssessments, latestAssessment, assessmentEvolution
  'competition',      // upcomingCompetitions, studentCompetitionResults, competitionPhotos
  'photo',            // competitionPhotos, studentPhotos, photoCount, highlightPhotos
  'checkin',          // checkinStatus, studentCheckins
  'billing',
  'guardian',         // guardianChildren, guardianChildrenAttendance, guardianChildrenPayments
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
  reloadUserMapping: () => Promise<AcademyUser | null>;
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

  // Ref to the active onSnapshot unsubscribe so we can tear down the
  // previous listener BEFORE attaching a new one (preventing leaks /
  // multiple listeners stacking up across academy switches).
  const academySnapshotUnsubRef = useRef<Unsubscribe | null>(null);

  // ============================================
  // Load Academy Info for all user's academies
  //
  // Parallelizes the fan-out reads via Promise.allSettled so a single
  // failed/missing doc does not block the rest. Replaces the previous
  // for...await that issued N sequential getDoc calls.
  // ============================================
  const loadAcademiesInfo = useCallback(async (academyIds: string[], mapping: UserAcademyMapping) => {
    const settled = await Promise.allSettled(
      academyIds.map(async (id) => {
        const academyRef = doc(db, 'academies', id);
        const academySnap = await getDoc(academyRef);

        if (!academySnap.exists()) return null;

        const data = academySnap.data();
        const details = mapping.academyDetails?.[id];

        const info: AcademyInfo = {
          id,
          name: data.name || 'Academia',
          logoUrl: data.logoUrl,
          studentId: details?.studentId,
          role: (details?.role as UserRole) || 'student',
        };
        return info;
      })
    );

    const infos: AcademyInfo[] = [];
    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        if (result.value) infos.push(result.value);
      } else {
        console.error(`Error loading academy info for ${academyIds[idx]}:`, result.reason);
      }
    });

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
        // Primary source: userAcademyMapping.academyDetails[academyId]
        const mappingRef = doc(db, 'userAcademyMapping', firebaseUser.uid);
        const mappingSnap = await getDoc(mappingRef);

        if (mappingSnap.exists()) {
          const mapping = mappingSnap.data() as UserAcademyMapping;
          const details = mapping.academyDetails?.[academyId];

          if (details?.role) {
            const joinedAt = details.joinedAt instanceof Date
              ? details.joinedAt
              : (details.joinedAt as { toDate?: () => Date })?.toDate?.() || new Date();
            setAcademyUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              role: details.role as UserRole,
              studentId: details.studentId,
              createdAt: joinedAt,
              updatedAt: new Date(),
            });
            return;
          }
        }

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
          // Responsible Person
          responsibleBirthDate: data.responsibleBirthDate,
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
  //
  // Also invalidates the React Query cache. Without this, lists like
  // /alunos and /chamada continue showing the previous academy's data
  // for up to staleTime (5min) after the switcher fires.
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
      // Tear down the previous academy's onSnapshot listener before
      // we change academyId — otherwise the dependency-driven cleanup
      // and the new subscription overlap for a tick.
      academySnapshotUnsubRef.current?.();
      academySnapshotUnsubRef.current = null;

      await loadAcademy(newAcademyId);

      // Drop only per-academy cached queries so the UI refetches with
      // the new academyId in the key. Skips queries like currentUser /
      // userPreferences / userAcademyMapping that are NOT scoped per
      // academy. Doing this after loadAcademy so refetches fire with
      // the right academy already set.
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          return isAcademyScopedKey(key);
        },
      });
    } catch (err) {
      console.error('Error switching academy:', err);
      setError('Erro ao trocar de academia');
    } finally {
      setIsSwitching(false);
    }
  }, [userAcademies, academyId, loadAcademy, queryClient]);

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
  // Reload User Mapping (force re-read from Firestore)
  // Returns the loaded AcademyUser or null
  // ============================================
  const reloadUserMapping = useCallback(async (): Promise<AcademyUser | null> => {
    if (!firebaseUser) return null;

    try {
      const mappingRef = doc(db, 'userAcademyMapping', firebaseUser.uid);
      const mappingSnap = await getDoc(mappingRef);

      if (!mappingSnap.exists()) return null;

      const mapping = mappingSnap.data() as UserAcademyMapping;
      setUserAcademyMapping(mapping);
      setUserAcademies(mapping.academyIds || []);

      const primaryId = mapping.primaryAcademyId || mapping.academyIds?.[0];
      setPrimaryAcademyIdState(primaryId || null);

      if (mapping.academyIds?.length > 0) {
        await loadAcademiesInfo(mapping.academyIds, mapping);
      }

      if (primaryId) {
        // Load academy
        const academyRef = doc(db, 'academies', primaryId);
        const academySnap = await getDoc(academyRef);

        if (academySnap.exists()) {
          const data = academySnap.data();
          setAcademy({
            id: academySnap.id,
            name: data.name || '',
            slug: data.slug || '',
            logoUrl: data.logoUrl,
            portalSlogan: data.portalSlogan,
            sidebarLogoUrl: data.sidebarLogoUrl,
            portalBackgroundUrl: data.portalBackgroundUrl,
            adminBackgroundUrl: data.adminBackgroundUrl,
            sidebarBackgroundUrl: data.sidebarBackgroundUrl,
            cnpj: data.cnpj,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            responsibleBirthDate: data.responsibleBirthDate,
            pixKey: data.pixKey,
            pixKeyType: data.pixKeyType,
            abacatePayEnabled: data.abacatePayEnabled || false,
            autoGraduationEnabled: data.autoGraduationEnabled || false,
            autoGraduationAttendances: data.autoGraduationAttendances,
            storeEnabled: data.storeEnabled || false,
            storePublished: data.storePublished || false,
            storeCreditCardEnabled: data.storeCreditCardEnabled || false,
            storeWelcomeMessage: data.storeWelcomeMessage,
            storeMinOrderAmount: data.storeMinOrderAmount,
            studentCheckinEnabled: data.studentCheckinEnabled || false,
            monitorIds: data.monitorIds || [],
            asaasEnabled: data.asaasEnabled || false,
            asaasSubAccountId: data.asaasSubAccountId,
            asaasOnboardingStatus: data.asaasOnboardingStatus,
            asaasKycStatus: data.asaasKycStatus,
            subscription: data.subscription,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            ownerId: data.ownerId,
          });
          setAcademyId(primaryId);
        }

        // Load academy user
        const userRef = doc(db, `academies/${primaryId}/users`, firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const loadedUser: AcademyUser = {
            id: userSnap.id,
            email: userData.email || firebaseUser.email || '',
            displayName: userData.displayName || firebaseUser.displayName || '',
            photoUrl: userData.photoUrl,
            role: userData.role || 'student',
            phone: userData.phone,
            studentId: userData.studentId,
            linkedStudentIds: userData.linkedStudentIds,
            instructorId: userData.instructorId,
            pendingStudentLink: userData.pendingStudentLink,
            approvedAt: userData.approvedAt?.toDate(),
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          };
          setAcademyUser(loadedUser);
          setIsLoading(false);
          return loadedUser;
        }
      }

      setIsLoading(false);
      return null;
    } catch (err) {
      console.error('Error reloading user mapping:', err);
      setIsLoading(false);
      return null;
    }
  }, [firebaseUser, loadAcademiesInfo]);

  // ============================================
  // Real-time Academy Updates
  //
  // Stores the unsubscribe in a ref so setAcademyAction can tear down
  // the previous listener immediately on switch (instead of waiting
  // for React's effect cleanup to run on the next render).
  // ============================================
  useEffect(() => {
    if (!academyId) return;

    // Defensive: if a previous listener is still attached (e.g. fast
    // remounts under StrictMode), drop it before subscribing again.
    academySnapshotUnsubRef.current?.();

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
          // Responsible Person
          responsibleBirthDate: data.responsibleBirthDate,
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

    academySnapshotUnsubRef.current = unsubscribe;

    return () => {
      unsubscribe();
      // Clear the ref only if it still points to *this* unsubscribe —
      // a fast switch may have already replaced it with the new one.
      if (academySnapshotUnsubRef.current === unsubscribe) {
        academySnapshotUnsubRef.current = null;
      }
    };
  }, [academyId]);

  // Final cleanup on provider unmount (covers signout and route teardown).
  useEffect(() => {
    return () => {
      academySnapshotUnsubRef.current?.();
      academySnapshotUnsubRef.current = null;
    };
  }, []);

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
