'use client';

import { useState } from 'react';
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
} from '@mui/material';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CreditCard,
  Award,
  UserPlus,
  Trophy,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification, NotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MotionBox = motion.create(Box);

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'payment_received':
      return CreditCard;
    case 'payment_pending':
    case 'payment_overdue':
      return AlertCircle;
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
const getNotificationColor = (type: NotificationType, theme: ReturnType<typeof useTheme>) => {
  switch (type) {
    case 'payment_received':
      return theme.palette.success.main;
    case 'payment_pending':
      return theme.palette.warning.main;
    case 'payment_overdue':
      return theme.palette.error.main;
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
}

function NotificationItem({ notification, onRead, onNavigate }: NotificationItemProps) {
  const theme = useTheme();
  const Icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type, theme);

  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }
    if (notification.actionUrl) {
      onNavigate();
    }
  };

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={handleClick}
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: notification.read ? 'transparent' : 'action.hover',
          '&:hover': {
            bgcolor: 'action.selected',
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
        {!notification.read && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: theme.palette.primary.main,
              ml: 1,
            }}
          />
        )}
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
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <MotionBox
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <NotificationItem
                      notification={notification}
                      onRead={() => handleNotificationRead(notification.id)}
                      onNavigate={() => handleNavigate(notification)}
                    />
                    {index < notifications.length - 1 && (
                      <Divider component="li" />
                    )}
                  </MotionBox>
                ))}
              </AnimatePresence>
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}

export default NotificationBell;
