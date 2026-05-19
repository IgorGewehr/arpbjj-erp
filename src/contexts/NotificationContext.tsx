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
import { useAuth } from '@/components/providers/AuthProvider';
import { useAcademy } from './AcademyContext';
import { api } from '@/lib/api/client';
import { Notification, NotificationType, NotificationPriority } from '@/types';

// ============================================
// Notification Context Types
// ============================================
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Go API wire shape
interface GoNotification {
  id: string;
  academy_id?: string;
  recipient_uid: string;
  type: string;
  title: string;
  body?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
}

function goNotificationToTS(n: GoNotification, fallbackAcademyId: string): Notification {
  return {
    id: n.id,
    academyId: n.academy_id || fallbackAcademyId,
    userId: n.recipient_uid,
    type: (n.type as NotificationType) || 'custom',
    priority: 'normal' as NotificationPriority,
    title: n.title,
    message: n.body || '',
    channels: ((n.channels || ['in_app']) as Notification['channels']),
    read: n.read_at != null,
    readAt: n.read_at ? new Date(n.read_at) : undefined,
    studentId: n.metadata?.student_id as string | undefined,
    financialId: n.metadata?.financial_id as string | undefined,
    competitionId: n.metadata?.competition_id as string | undefined,
    actionUrl: n.metadata?.action_url as string | undefined,
    actionLabel: n.metadata?.action_label as string | undefined,
    createdAt: new Date(n.created_at),
  };
}

// ============================================
// Notification Provider Component
// ============================================
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { academyId } = useAcademy();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const academyIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const currentAcademyId = academyIdRef.current;
    if (!currentAcademyId) return;

    try {
      const data = await api.get<{ items: GoNotification[]; has_more: boolean }>(
        '/v1/me/notifications?limit=50'
      );
      setNotifications(
        (data.items || []).map(n => goNotificationToTS(n, currentAcademyId))
      );
    } catch (err) {
      console.error('[NotificationContext] fetch error:', err);
      setError('Erro ao carregar notificações');
    }
  }, []);

  // ============================================
  // Subscribe / unsubscribe on auth + academy changes
  // ============================================
  useEffect(() => {
    academyIdRef.current = academyId;

    if (!isAuthenticated || !academyId) {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchNotifications().finally(() => setIsLoading(false));

    // Poll every 30 seconds for new notifications
    pollIntervalRef.current = setInterval(fetchNotifications, 30_000);

    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, academyId, fetchNotifications]);

  // ============================================
  // Mark Single Notification as Read
  // ============================================
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.patch(`/v1/me/notifications/${notificationId}`, { read: true });
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
    } catch (err) {
      console.error('[NotificationContext] markAsRead error:', err);
      throw err;
    }
  }, []);

  // ============================================
  // Mark All Notifications as Read
  // ============================================
  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/v1/me/notifications/mark-all-read');
      const now = new Date();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: now }))
      );
    } catch (err) {
      console.error('[NotificationContext] markAllAsRead error:', err);
      throw err;
    }
  }, []);

  // ============================================
  // Delete Notification
  // ============================================
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await api.delete(`/v1/me/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('[NotificationContext] delete error:', err);
      throw err;
    }
  }, []);

  // ============================================
  // Refresh (for manual reload)
  // ============================================
  const refreshNotifications = useCallback(() => {
    setIsLoading(true);
    fetchNotifications().finally(() => setIsLoading(false));
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

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
