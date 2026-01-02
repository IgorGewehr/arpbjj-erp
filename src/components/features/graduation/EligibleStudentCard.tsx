'use client';

import {
  Box,
  Typography,
  Paper,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import { Award, ArrowRight } from 'lucide-react';
import { Student, BeltColor, Stripes } from '@/types';
import { getBeltChipColor } from '@/lib/theme';

// ============================================
// Props Interface
// ============================================
interface EligibleStudentCardProps {
  student: Student;
  nextPromotion: { belt: BeltColor; stripes: Stripes };
  totalClasses: number;
  onPromote: () => void;
  getBeltLabel: (belt: BeltColor) => string;
}

// ============================================
// Stripes Display Component
// ============================================
function StripesDisplay({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 4,
            height: 14,
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
// EligibleStudentCard Component
// ============================================
export function EligibleStudentCard({
  student,
  nextPromotion,
  totalClasses,
  onPromote,
  getBeltLabel,
}: EligibleStudentCardProps) {
  const currentBeltColor = getBeltChipColor(student.currentBelt);
  const nextBeltColor = getBeltChipColor(nextPromotion.belt);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isStripePromotion = student.currentBelt === nextPromotion.belt;

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        borderLeft: 4,
        borderColor: 'success.main',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Student Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={student.photoUrl}
            sx={{
              width: 56,
              height: 56,
              bgcolor: currentBeltColor.bg,
              color: currentBeltColor.text,
              fontWeight: 600,
            }}
          >
            {getInitials(student.fullName)}
          </Avatar>

          <Box>
            <Typography variant="h6" fontWeight={600}>
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {student.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {totalClasses} aulas realizadas
            </Typography>
          </Box>
        </Box>

        {/* Belt Transition */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Current */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Atual
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                label={getBeltLabel(student.currentBelt as BeltColor)}
                size="small"
                sx={{
                  bgcolor: currentBeltColor.bg,
                  color: currentBeltColor.text,
                  fontWeight: 600,
                }}
              />
              <StripesDisplay count={student.currentStripes} />
            </Box>
          </Box>

          {/* Arrow */}
          <ArrowRight size={24} style={{ color: '#16a34a' }} />

          {/* Next */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Proxima
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                label={getBeltLabel(nextPromotion.belt)}
                size="small"
                sx={{
                  bgcolor: nextBeltColor.bg,
                  color: nextBeltColor.text,
                  fontWeight: 600,
                }}
              />
              <StripesDisplay count={nextPromotion.stripes} />
            </Box>
          </Box>
        </Box>

        {/* Action */}
        <Button
          variant="contained"
          color="success"
          startIcon={<Award size={18} />}
          onClick={onPromote}
        >
          {isStripePromotion ? 'Adicionar Grau' : 'Promover Faixa'}
        </Button>
      </Box>
    </Paper>
  );
}

export default EligibleStudentCard;
