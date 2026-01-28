'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User, UserRole, GlobalUser, AccountType } from '@/types';
import { globalUserService } from '@/services';

// ============================================
// Auth Context Types
// ============================================
interface AuthContextType {
  // User state
  user: User | null;
  globalUser: GlobalUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;

  // Auth state
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInstructor: boolean;
  isFreeUser: boolean;

  // Auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateGlobalUserProfile: (data: Partial<Omit<GlobalUser, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;

  // Utility
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Auth Provider Component
// ============================================
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [globalUser, setGlobalUser] = useState<GlobalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Google Provider
  const googleProvider = new GoogleAuthProvider();

  // ============================================
  // Auth State Listener
  // ============================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        const { userData, globalUserData } = await fetchUserData(firebaseUser);
        setUser(userData);
        setGlobalUser(globalUserData);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setGlobalUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // Fetch user data from Firestore (Global User)
  // ============================================
  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<{
    userData: User | null;
    globalUserData: GlobalUser | null;
  }> => {
    try {
      // Get or create global user using globalUserService
      let globalUserData = await globalUserService.getGlobalUser(firebaseUser.uid);

      if (!globalUserData) {
        // Create new global user if doesn't exist
        globalUserData = await globalUserService.createGlobalUser(firebaseUser.uid, {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoUrl: firebaseUser.photoURL || undefined,
          accountType: 'free', // New users start as free
        });
      }

      // Convert GlobalUser to User for backwards compatibility
      // Note: role, studentId, linkedStudentIds, instructorId will come from AcademyContext
      const userData: User = {
        id: globalUserData.id,
        email: globalUserData.email,
        displayName: globalUserData.displayName,
        photoUrl: globalUserData.photoUrl,
        role: 'student' as UserRole, // Default role, will be overridden by AcademyContext
        phone: globalUserData.phone,
        accountType: globalUserData.accountType,
        createdAt: globalUserData.createdAt,
        updatedAt: globalUserData.updatedAt,
      };

      return { userData, globalUserData };
    } catch (err) {
      console.error('Error fetching user data:', err);
      return { userData: null, globalUserData: null };
    }
  }, []);

  // ============================================
  // Sign In with Email/Password
  // ============================================
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // Sign In with Google
  // ============================================
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login com Google';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [googleProvider]);

  // ============================================
  // Sign Up
  // ============================================
  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name in Firebase Auth
      await updateProfile(result.user, { displayName });

      // Create global user document using globalUserService
      // This also creates the empty userAcademyMapping
      await globalUserService.createGlobalUser(result.user.uid, {
        email,
        displayName,
        accountType: 'free', // New users start as free
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // Sign Out
  // ============================================
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
      setGlobalUser(null);
      setFirebaseUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao sair';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // Reset Password
  // ============================================
  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar email de recuperação';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // Update User Profile (backwards compatible)
  // ============================================
  const updateUserProfile = useCallback(async (data: Partial<User>) => {
    if (!firebaseUser || !user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // Update global user in Firestore
      await globalUserService.updateGlobalUser(firebaseUser.uid, {
        displayName: data.displayName,
        photoUrl: data.photoUrl,
        phone: data.phone,
      });

      // Update Firebase Auth profile if display name or photo changed
      if (data.displayName || data.photoUrl) {
        await updateProfile(firebaseUser, {
          displayName: data.displayName || firebaseUser.displayName,
          photoURL: data.photoUrl || firebaseUser.photoURL,
        });
      }

      // Refresh user data
      setUser({ ...user, ...data, updatedAt: new Date() });
      if (globalUser) {
        setGlobalUser({
          ...globalUser,
          displayName: data.displayName || globalUser.displayName,
          photoUrl: data.photoUrl || globalUser.photoUrl,
          phone: data.phone || globalUser.phone,
          updatedAt: new Date(),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user, globalUser]);

  // ============================================
  // Update Global User Profile (new - for fighter profile)
  // ============================================
  const updateGlobalUserProfile = useCallback(async (
    data: Partial<Omit<GlobalUser, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!firebaseUser || !globalUser) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // Update global user in Firestore
      await globalUserService.updateGlobalUser(firebaseUser.uid, data);

      // Update Firebase Auth profile if display name or photo changed
      if (data.displayName || data.photoUrl) {
        await updateProfile(firebaseUser, {
          displayName: data.displayName || firebaseUser.displayName,
          photoURL: data.photoUrl || firebaseUser.photoURL,
        });
      }

      // Refresh global user state
      setGlobalUser({
        ...globalUser,
        ...data,
        updatedAt: new Date(),
      });

      // Also update user for backwards compatibility
      if (user) {
        setUser({
          ...user,
          displayName: data.displayName || user.displayName,
          photoUrl: data.photoUrl || user.photoUrl,
          phone: data.phone || user.phone,
          updatedAt: new Date(),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user, globalUser]);

  // ============================================
  // Refresh User Data
  // ============================================
  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const { userData, globalUserData } = await fetchUserData(firebaseUser);
      setUser(userData);
      setGlobalUser(globalUserData);
    }
  }, [firebaseUser, fetchUserData]);

  // ============================================
  // Clear Error
  // ============================================
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // Computed Values
  // ============================================
  const isAuthenticated = useMemo(() => !!user, [user]);
  // DEPRECATED: These values are always false because user.role is not loaded from academy context
  // Use usePermissions() from PermissionProvider instead for role-based checks
  // These are kept for backwards compatibility but should not be relied upon
  const isAdmin = useMemo(() => false, []); // user.role is always 'student' here
  const isInstructor = useMemo(() => false, []); // user.role is always 'student' here
  const isFreeUser = useMemo(() => globalUser?.accountType === 'free', [globalUser]);

  // ============================================
  // Context Value
  // ============================================
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      globalUser,
      firebaseUser,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      isInstructor,
      isFreeUser,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updateUserProfile,
      updateGlobalUserProfile,
      refreshUser,
      clearError,
    }),
    [
      user,
      globalUser,
      firebaseUser,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      isInstructor,
      isFreeUser,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updateUserProfile,
      updateGlobalUserProfile,
      refreshUser,
      clearError,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
