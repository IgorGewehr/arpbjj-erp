'use client';

import { useState, useRef, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  CircularProgress,
  useTheme,
  Theme,
} from '@mui/material';
import {
  Bell,
  BellOff,
  CheckCheck,
  CreditCard,
  Award,
  UserPlus,
  Trophy,
  AlertCircle,
  Clock,
  ShoppingBag,
  Wallet,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification, NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'payment_received':
      return CreditCard;
    case 'payment_pending':
    case 'payment_overdue':
    case 'payment_due_soon':
      return AlertCircle;
    case 'order_paid':
      return ShoppingBag;
    case 'withdrawal_completed':
    case 'withdrawal_failed':
      return Wallet;
    case 'graduation_eligible':
    case 'graduation_near':
      return Award;
    case 'new_student_linked':
      return UserPlus;
    case 'student_milestone':
      return Trophy;
    case 'competition_reminder':
      return Clock;
    default:
      return Bell;
  }
};

// Get color for notification type
const getNotificationColor = (type: NotificationType, theme: Theme) => {
  switch (type) {
    case 'payment_received':
    case 'withdrawal_completed':
      return theme.palette.success.main;
    case 'payment_pending':
    case 'payment_due_soon':
      return theme.palette.warning.main;
    case 'payment_overdue':
    case 'withdrawal_failed':
      return theme.palette.error.main;
    case 'order_paid':
      return theme.palette.info.main;
    case 'graduation_eligible':
    case 'graduation_near':
      return theme.palette.info.main;
    case 'new_student_linked':
      return theme.palette.primary.main;
    case 'student_milestone':
    case 'competition_reminder':
      return theme.palette.secondary.main;
    default:
      return theme.palette.text.secondary;
  }
};

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onNavigate: () => void;
  onDelete: () => void;
}

function NotificationItem({ notification, onRead, onNavigate, onDelete }: NotificationItemProps) {
  const theme = useTheme();
  const Icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type, theme);

  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [offsetX, setOffsetX] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const DISMISS_THRESHOLD = 80;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = 0;
    isDraggingRef.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const deltaX = e.clientX - startXRef.current;
    // Only allow swipe left (negative)
    if (deltaX < -5) {
      isDraggingRef.current = true;
      const clamped = Math.max(deltaX, -160);
      currentXRef.current = clamped;
      setOffsetX(clamped);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (currentXRef.current < -DISMISS_THRESHOLD) {
      setDismissed(true);
      setOffsetX(-400);
      setTimeout(() => onDelete(), 200);
    } else {
      setOffsetX(0);
    }
    isDraggingRef.current = false;
  }, [onDelete]);

  const handleClick = () => {
    if (isDraggingRef.current) return;
    if (!notification.read) {
      onRead();
    }
    if (notification.actionUrl) {
      onNavigate();
    }
  };

  if (dismissed) return null;

  return (
    <ListItem disablePadding sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Delete background revealed on swipe */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 80,
          bgcolor: theme.palette.error.main + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: offsetX < -20 ? 1 : 0,
          transition: offsetX === 0 ? 'opacity 0.2s' : 'none',
        }}
      >
        <Trash2 size={18} color={theme.palette.error.main} />
      </Box>

      <ListItemButton
        ref={containerRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: notification.read ? 'transparent' : 'action.hover',
          transform: `translateX(${offsetX}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
          '&:hover': {
            bgcolor: 'action.selected',
          },
          '&:hover .notification-delete-btn': {
            opacity: 1,
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color={color} />
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              fontWeight={notification.read ? 400 : 600}
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {notification.title}
            </Typography>
          }
          secondary={
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 0.5,
                }}
              >
                {notification.message}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </Typography>
            </Box>
          }
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5, flexShrink: 0 }}>
          {!notification.read && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: theme.palette.primary.main,
              }}
            />
          )}
          {/* Small delete button on hover (desktop) */}
          <IconButton
            className="notification-delete-btn"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={{
              opacity: 0,
              transition: 'opacity 0.15s',
              p: 0.5,
              color: theme.palette.text.disabled,
              '&:hover': {
                color: theme.palette.error.main,
                bgcolor: theme.palette.error.main + '10',
              },
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        </Box>
      </ListItemButton>
    </ListItem>
  );
}

export function NotificationBell() {
  const theme = useTheme();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleNavigate = (notification: Notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      handleClose();
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          position: 'relative',
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              height: 16,
              minWidth: 16,
            },
          }}
        >
          <Bell size={20} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: '90vw',
              maxHeight: 480,
              borderRadius: 2,
              mt: 1,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notificações
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              startIcon={<CheckCheck size={14} />}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Marcar todas como lidas
            </Button>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ overflow: 'auto', maxHeight: 380 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1.5,
                }}
              >
                <BellOff size={24} color={theme.palette.text.disabled} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Nenhuma notificação no momento
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification, index) => (
                <Box key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onRead={() => handleNotificationRead(notification.id)}
                    onNavigate={() => handleNavigate(notification)}
                    onDelete={() => handleDeleteNotification(notification.id)}
                  />
                  {index < notifications.length - 1 && (
                    <Divider component="li" />
                  )}
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}

export default NotificationBell;
