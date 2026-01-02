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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types';

// ============================================
// Auth Context Types
// ============================================
interface AuthContextType {
  // User state
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;

  // Auth state
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInstructor: boolean;

  // Auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;

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
        const userData = await fetchUserData(firebaseUser);
        setUser(userData);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // Fetch user data from Firestore
  // ============================================
  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: data.displayName || firebaseUser.displayName || '',
          photoUrl: data.photoUrl || firebaseUser.photoURL || undefined,
          role: data.role || 'student',
          phone: data.phone,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }

      // Create new user document if doesn't exist
      const newUserData: Record<string, unknown> = {
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        role: 'admin' as UserRole, // First user is admin by default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only add photoUrl if it exists (Firestore doesn't accept undefined)
      if (firebaseUser.photoURL) {
        newUserData.photoUrl = firebaseUser.photoURL;
      }

      await setDoc(userRef, newUserData);

      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || '',
        photoUrl: firebaseUser.photoURL || undefined,
        role: 'admin' as UserRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
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

      // Update display name
      await updateProfile(result.user, { displayName });

      // Create user document
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        email,
        displayName,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
  // Update User Profile
  // ============================================
  const updateUserProfile = useCallback(async (data: Partial<User>) => {
    if (!firebaseUser || !user) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // Update Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Update Firebase Auth profile if display name or photo changed
      if (data.displayName || data.photoUrl) {
        await updateProfile(firebaseUser, {
          displayName: data.displayName || firebaseUser.displayName,
          photoURL: data.photoUrl || firebaseUser.photoURL,
        });
      }

      // Refresh user data
      setUser({ ...user, ...data, updatedAt: new Date() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, user]);

  // ============================================
  // Refresh User Data
  // ============================================
  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser);
      setUser(userData);
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
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isInstructor = useMemo(() => user?.role === 'instructor' || user?.role === 'admin', [user]);

  // ============================================
  // Context Value
  // ============================================
  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      firebaseUser,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      isInstructor,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updateUserProfile,
      refreshUser,
      clearError,
    }),
    [
      user,
      firebaseUser,
      loading,
      error,
      isAuthenticated,
      isAdmin,
      isInstructor,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updateUserProfile,
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
