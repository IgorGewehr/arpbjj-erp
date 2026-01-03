'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardActionArea,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
} from '@mui/material';
import { Check, MoreVertical, User, Phone, AlertCircle, Award } from 'lucide-react';
import { Student } from '@/types';
import { getBeltChipColor } from '@/lib/theme';
import { BeltDisplay } from '@/components/shared/BeltDisplay';

// ============================================
// Props Interface
// ============================================
interface AttendanceCardProps {
  student: Student;
  isPresent: boolean;
  onToggle: (student: Student) => void;
  onViewProfile?: (student: Student) => void;
  onWhatsApp?: (student: Student) => void;
  onReportInjury?: (student: Student) => void;
  onPromote?: (student: Student) => void;
  disabled?: boolean;
  loading?: boolean;
}

// ============================================
// Belt Label Map
// ============================================
const beltLabels: Record<string, string> = {
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
  grey: 'Cinza',
  yellow: 'Amarela',
  orange: 'Laranja',
  green: 'Verde',
};

// ============================================
// Stripes Display
// ============================================
function StripesDisplay({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.3, ml: 1 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 4,
            height: 12,
            bgcolor: 'common.white',
            borderRadius: 0.5,
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      ))}
    </Box>
  );
}

// ============================================
// AttendanceCard Component
// ============================================
export function AttendanceCard({
  student,
  isPresent,
  onToggle,
  onViewProfile,
  onWhatsApp,
  onReportInjury,
  onPromote,
  disabled = false,
  loading = false,
}: AttendanceCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const beltColor = getBeltChipColor(student.currentBelt);

  // Handle card click (toggle attendance)
  const handleClick = useCallback(() => {
    if (!disabled && !loading) {
      onToggle(student);
    }
  }, [disabled, loading, onToggle, student]);

  // Handle menu open (long press simulation with right click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuAnchor(e.currentTarget as HTMLElement);
  }, []);

  // Handle menu button click
  const handleMenuClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  // Handle menu close
  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  // Menu actions
  const handleViewProfile = useCallback(() => {
    handleMenuClose();
    onViewProfile?.(student);
  }, [handleMenuClose, onViewProfile, student]);

  const handleWhatsApp = useCallback(() => {
    handleMenuClose();
    if (onWhatsApp) {
      onWhatsApp(student);
    } else if (student.phone) {
      // Default: open WhatsApp
      const phone = student.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  }, [handleMenuClose, onWhatsApp, student]);

  const handleReportInjury = useCallback(() => {
    handleMenuClose();
    onReportInjury?.(student);
  }, [handleMenuClose, onReportInjury, student]);

  const handlePromote = useCallback(() => {
    handleMenuClose();
    onPromote?.(student);
  }, [handleMenuClose, onPromote, student]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Loading skeleton
  if (loading) {
    return (
      <Card
        sx={{
          height: 120,
          borderRadius: 3,
        }}
      >
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', height: '100%' }}>
          <Skeleton variant="circular" width={56} height={56} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={28} />
            <Skeleton variant="text" width="40%" height={20} />
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <>
      <Card
        onContextMenu={handleContextMenu}
        sx={{
          position: 'relative',
          minHeight: { xs: 100, sm: 120 },
          borderRadius: { xs: 2, sm: 3 },
          transition: 'all 0.15s ease',
          border: '3px solid',
          borderColor: isPresent ? 'success.main' : 'transparent',
          bgcolor: isPresent ? 'success.50' : 'background.paper',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isPresent ? '0 0 0 4px rgba(22, 163, 74, 0.15)' : undefined,
          '&:hover': {
            transform: disabled ? 'none' : 'scale(1.02)',
            boxShadow: disabled ? undefined : isPresent
              ? '0 0 0 4px rgba(22, 163, 74, 0.25), 0 4px 20px rgba(0,0,0,0.12)'
              : '0 4px 20px rgba(0,0,0,0.12)',
          },
          '&:active': {
            transform: disabled ? 'none' : 'scale(0.97)',
          },
        }}
      >
        <CardActionArea
          onClick={handleClick}
          disabled={disabled}
          sx={{
            height: '100%',
            minHeight: { xs: 100, sm: 120 },
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: { xs: 'center', sm: 'flex-start' },
            gap: { xs: 1, sm: 2 },
            // Better touch target
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Avatar with Present Indicator Overlay */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={student.photoUrl}
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                bgcolor: beltColor.bg,
                color: beltColor.text,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
                border: isPresent ? '3px solid' : 'none',
                borderColor: 'success.main',
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>

            {/* Present Checkmark Overlay */}
            {isPresent && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                }}
              >
                <Check size={14} color="white" strokeWidth={3} />
              </Box>
            )}
          </Box>

          {/* Info */}
          <Box sx={{
            flex: 1,
            minWidth: 0,
            textAlign: { xs: 'center', sm: 'left' },
            width: '100%',
          }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                color: isPresent ? 'success.dark' : 'text.primary',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>

            {/* Belt Display - Visual */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'center', sm: 'flex-start' },
              mt: 0.5,
            }}>
              <BeltDisplay
                belt={student.currentBelt}
                stripes={student.currentStripes}
                size="small"
              />
            </Box>
          </Box>
        </CardActionArea>

        {/* Menu Button - Hidden on mobile for cleaner look, use long press */}
        <IconButton
          size="small"
          onClick={handleMenuClick}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: 'background.paper',
            boxShadow: 1,
            width: 28,
            height: 28,
            display: { xs: 'none', sm: 'flex' },
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <MoreVertical size={16} />
        </IconButton>

        {/* Status Badge (if injured) */}
        {student.status === 'injured' && (
          <Chip
            icon={<AlertCircle size={12} />}
            label="Lesao"
            size="small"
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              fontSize: '0.6rem',
              height: 18,
              bgcolor: '#1a1a1a',
              color: '#fff',
              '& .MuiChip-icon': {
                ml: 0.5,
                color: '#fff',
              },
            }}
          />
        )}
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {onViewProfile && (
          <MenuItem onClick={handleViewProfile}>
            <ListItemIcon>
              <User size={18} />
            </ListItemIcon>
            <ListItemText>Ver Perfil</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleWhatsApp}>
          <ListItemIcon>
            <Phone size={18} />
          </ListItemIcon>
          <ListItemText>WhatsApp</ListItemText>
        </MenuItem>

        {onReportInjury && (
          <MenuItem onClick={handleReportInjury}>
            <ListItemIcon>
              <AlertCircle size={18} />
            </ListItemIcon>
            <ListItemText>Reportar Lesão</ListItemText>
          </MenuItem>
        )}

        {onPromote && (
          <MenuItem onClick={handlePromote}>
            <ListItemIcon>
              <Award size={18} />
            </ListItemIcon>
            <ListItemText>Graduar</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// ============================================
// AttendanceCardSkeleton
// ============================================
export function AttendanceCardSkeleton() {
  return (
    <Card
      sx={{
        height: 120,
        borderRadius: 3,
      }}
    >
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', height: '100%' }}>
        <Skeleton variant="circular" width={56} height={56} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="rounded" width={80} height={22} sx={{ mt: 0.5 }} />
        </Box>
      </Box>
    </Card>
  );
}

export default AttendanceCard;
