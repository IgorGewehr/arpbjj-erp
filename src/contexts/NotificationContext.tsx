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
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAcademy } from './AcademyContext';
import { Notification, NotificationType, NotificationPriority } from '@/types';

// ============================================
// Notification Context Types
// ============================================
interface NotificationContextType {
  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ============================================
// Notification Provider Component
// ============================================
interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { firebaseUser, isAuthenticated } = useAuth();
  const { academyId } = useAcademy();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  // Active onSnapshot unsubscribe (kept in a ref so the online/offline
  // listeners can tear it down without re-running the effect).
  const unsubRef = useRef<Unsubscribe | null>(null);

  // ============================================
  // Track browser online/offline status
  // ============================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // Real-time Notification Listener
  //
  // Only attaches the onSnapshot when the browser reports online —
  // when offline we tear down the listener (keeps last-known data on
  // screen) and re-subscribe automatically when connectivity returns.
  // ============================================
  useEffect(() => {
    if (!firebaseUser || !academyId || !isAuthenticated) {
      // Tear down any prior subscription on signout / academy switch.
      unsubRef.current?.();
      unsubRef.current = null;
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    if (!isOnline) {
      // Drop the live listener while offline. UI keeps the last list
      // it had; no need to wipe it (would flicker on quick blips).
      unsubRef.current?.();
      unsubRef.current = null;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const notificationsRef = collection(
      db,
      `academies/${academyId}/notifications`
    );

    // Query for user's notifications, ordered by creation date
    const q = query(
      notificationsRef,
      where('userId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationList: Notification[] = [];
        const now = new Date();

        snapshot.forEach((doc) => {
          const data = doc.data();

          // Skip expired notifications
          const expiresAt = data.expiresAt?.toDate();
          if (expiresAt && expiresAt < now) {
            return;
          }

          notificationList.push({
            id: doc.id,
            academyId: data.academyId || academyId,
            userId: data.userId,
            type: data.type as NotificationType,
            priority: data.priority as NotificationPriority || 'normal',
            title: data.title || '',
            message: data.message || '',
            imageUrl: data.imageUrl,
            actionUrl: data.actionUrl,
            actionLabel: data.actionLabel,
            studentId: data.studentId,
            financialId: data.financialId,
            competitionId: data.competitionId,
            read: data.read || false,
            readAt: data.readAt?.toDate(),
            channels: data.channels || ['in_app'],
            sentVia: data.sentVia,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: expiresAt,
          });
        });

        setNotifications(notificationList);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to notifications:', err);
        setError('Erro ao carregar notificações');
        setIsLoading(false);
      }
    );

    unsubRef.current = unsubscribe;

    return () => {
      unsubscribe();
      if (unsubRef.current === unsubscribe) {
        unsubRef.current = null;
      }
    };
  }, [firebaseUser, academyId, isAuthenticated, isOnline]);

  // ============================================
  // Mark Single Notification as Read
  // ============================================
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!academyId) return;

    try {
      const notificationRef = doc(
        db,
        `academies/${academyId}/notifications`,
        notificationId
      );

      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, [academyId]);

  // ============================================
  // Mark All Notifications as Read
  // ============================================
  const markAllAsRead = useCallback(async () => {
    if (!academyId) return;

    const unreadNotifications = notifications.filter((n) => !n.read);

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          updateDoc(
            doc(db, `academies/${academyId}/notifications`, notification.id),
            {
              read: true,
              readAt: serverTimestamp(),
            }
          )
        )
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, [academyId, notifications]);

  // ============================================
  // Delete Notification
  // ============================================
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!academyId) return;

    try {
      const notificationRef = doc(
        db,
        `academies/${academyId}/notifications`,
        notificationId
      );

      await deleteDoc(notificationRef);
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [academyId]);

  // ============================================
  // Refresh (for manual reload)
  // ============================================
  const refreshNotifications = useCallback(() => {
    // The onSnapshot listener handles real-time updates
    // This is just for UI feedback
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  // ============================================
  // Computed Values
  // ============================================
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // ============================================
  // Context Value
  // ============================================
  const contextValue = useMemo<NotificationContextType>(() => ({
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  }), [
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
