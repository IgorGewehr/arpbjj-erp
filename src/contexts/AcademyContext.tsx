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
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { Academy, UserAcademyMapping, AcademyUser } from '@/types';

// ============================================
// Academy Context Types
// ============================================
interface AcademyContextType {
  // Current academy
  academyId: string | null;
  academy: Academy | null;
  academyUser: AcademyUser | null;

  // User's academies (for multi-academy users)
  userAcademies: string[];
  hasMultipleAcademies: boolean;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  setAcademy: (academyId: string) => Promise<void>;
  refreshAcademy: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Load User's Academy Mapping
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
          setUserAcademies(mapping.academyIds || []);

          // Load primary academy
          const primaryId = mapping.primaryAcademyId || mapping.academyIds[0];
          if (primaryId) {
            await loadAcademy(primaryId);
          }
        } else {
          // No mapping found - user might need to be assigned to an academy
          // For backwards compatibility, check if there's a default academy
          setUserAcademies([]);
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
  }, [firebaseUser, isAuthenticated, authLoading]);

  // ============================================
  // Load Academy Data
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
  }, [firebaseUser]);

  // ============================================
  // Load Academy User Data
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
      }
    } catch (err) {
      console.error('Error loading academy user:', err);
    }
  }, [firebaseUser]);

  // ============================================
  // Set Active Academy
  // ============================================
  const setAcademyAction = useCallback(async (newAcademyId: string) => {
    if (!userAcademies.includes(newAcademyId)) {
      setError('Você não tem acesso a esta academia');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadAcademy(newAcademyId);
    } catch (err) {
      console.error('Error switching academy:', err);
      setError('Erro ao trocar de academia');
    } finally {
      setIsLoading(false);
    }
  }, [userAcademies, loadAcademy]);

  // ============================================
  // Refresh Academy Data
  // ============================================
  const refreshAcademy = useCallback(async () => {
    if (!academyId) return;
    await loadAcademy(academyId);
  }, [academyId, loadAcademy]);

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
          storeWelcomeMessage: data.storeWelcomeMessage,
          storeMinOrderAmount: data.storeMinOrderAmount,
          // Monitors
          monitorIds: data.monitorIds || [],
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
    userAcademies,
    hasMultipleAcademies,
    isLoading,
    error,
    setAcademy: setAcademyAction,
    refreshAcademy,
  }), [
    academyId,
    academy,
    academyUser,
    userAcademies,
    hasMultipleAcademies,
    isLoading,
    error,
    setAcademyAction,
    refreshAcademy,
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
