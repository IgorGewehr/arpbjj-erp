'use client';

import { useCallback } from 'react';
import {
  Card,
  CardActionArea,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material';
import { Phone, AlertCircle, ChevronRight } from 'lucide-react';
import { Student } from '@/types';
import { getBeltChipColor } from '@/lib/theme';
import { BeltDisplay } from '@/components/shared/BeltDisplay';

// ============================================
// Props Interface
// ============================================
interface StudentCardProps {
  student: Student;
  onClick?: (student: Student) => void;
  onWhatsApp?: (student: Student) => void;
  compact?: boolean;
}

// ============================================
// Belt Labels
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
// Status Config
// ============================================
const statusConfig: Record<Student['status'], { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  active: { label: 'Ativo', color: 'success' },
  injured: { label: 'Lesionado', color: 'warning' },
  inactive: { label: 'Inativo', color: 'default' },
  suspended: { label: 'Suspenso', color: 'error' },
};

// ============================================
// StudentCard Component
// ============================================
export function StudentCard({
  student,
  onClick,
  onWhatsApp,
  compact = false,
}: StudentCardProps) {
  const beltColor = getBeltChipColor(student.currentBelt);
  const status = statusConfig[student.status];

  const handleClick = useCallback(() => {
    onClick?.(student);
  }, [onClick, student]);

  const handleWhatsApp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWhatsApp) {
      onWhatsApp(student);
    } else if (student.phone) {
      const phone = student.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  }, [onWhatsApp, student]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (compact) {
    return (
      <Card
        sx={{
          borderRadius: 2,
          opacity: student.status === 'inactive' ? 0.6 : 1,
          position: 'relative',
        }}
      >
        <CardActionArea onClick={handleClick} sx={{ p: 2, pr: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Avatar */}
            <Avatar
              src={student.photoUrl}
              sx={{
                width: 48,
                height: 48,
                bgcolor: beltColor.bg,
                color: beltColor.text,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>

            {/* Main Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {student.nickname || student.fullName.split(' ')[0]}
                </Typography>
                {student.status === 'injured' && (
                  <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                )}
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 1 }}
              >
                {student.fullName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <BeltDisplay
                  belt={student.currentBelt}
                  stripes={student.currentStripes}
                  size="small"
                />
                <Chip
                  label={status.label}
                  size="small"
                  color={status.color}
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
                <Chip
                  label={student.category === 'kids' ? 'Kids' : 'Adulto'}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              </Box>
            </Box>

            {/* Phone Info */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, minWidth: 140 }}>
              <Phone size={14} style={{ color: '#9ca3af' }} />
              <Typography variant="body2" color="text.secondary">
                {student.phone}
              </Typography>
            </Box>
          </Box>
        </CardActionArea>

        {/* Actions - positioned outside CardActionArea to avoid nested buttons */}
        <Box
          sx={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={handleWhatsApp}
            sx={{
              bgcolor: 'action.hover',
              '&:hover': { bgcolor: 'success.light' },
            }}
          >
            <Phone size={18} />
          </IconButton>
          <ChevronRight size={18} style={{ color: '#9ca3af' }} />
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        opacity: student.status === 'inactive' ? 0.6 : 1,
        position: 'relative',
        height: { xs: 140, sm: 160 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ p: { xs: 1.5, sm: 2.5 }, pr: { xs: 6, sm: 8 }, height: '100%', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 }, height: '100%', overflow: 'hidden' }}>
          {/* Avatar */}
          <Avatar
            src={student.photoUrl}
            sx={{
              width: { xs: 48, sm: 64 },
              height: { xs: 48, sm: 64 },
              bgcolor: beltColor.bg,
              color: beltColor.text,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(student.fullName)}
          </Avatar>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.9rem', sm: '1.25rem' }
                }}
              >
                {student.nickname || student.fullName.split(' ')[0]}
              </Typography>
              {student.status === 'injured' && (
                <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
              )}
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: { xs: 1, sm: 1.5 },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.7rem', sm: '0.875rem' }
              }}
            >
              {student.fullName}
            </Typography>

            {/* Belt and Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 }, flexWrap: 'wrap' }}>
              <BeltDisplay
                belt={student.currentBelt}
                stripes={student.currentStripes}
                size="small"
              />

              <Chip
                label={status.label}
                size="small"
                color={status.color}
                variant="outlined"
                sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 18, sm: 24 } }}
              />

              <Chip
                label={student.category === 'kids' ? 'Kids' : 'Adulto'}
                size="small"
                variant="outlined"
                sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, height: { xs: 18, sm: 24 } }}
              />
            </Box>
          </Box>
        </Box>
      </CardActionArea>

      {/* Actions - positioned outside CardActionArea to avoid nested buttons */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 8, sm: 20 },
          top: { xs: 8, sm: 20 },
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1,
        }}
      >
        <IconButton
          size="small"
          onClick={handleWhatsApp}
          sx={{
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'success.light' },
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
          }}
        >
          <Phone size={16} />
        </IconButton>
      </Box>
    </Card>
  );
}

export default StudentCard;
