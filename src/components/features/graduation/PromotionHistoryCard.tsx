'use client';

import { Box, Typography, Paper, Chip } from '@mui/material';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BeltProgression, BeltColor } from '@/types';
import { getBeltChipColor } from '@/lib/theme';

// ============================================
// Props Interface
// ============================================
interface PromotionHistoryCardProps {
  promotion: BeltProgression;
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
            width: 3,
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
// PromotionHistoryCard Component
// ============================================
export function PromotionHistoryCard({
  promotion,
  getBeltLabel,
}: PromotionHistoryCardProps) {
  const previousBeltColor = getBeltChipColor(promotion.previousBelt);
  const newBeltColor = getBeltChipColor(promotion.newBelt);

  const isBeltChange = promotion.previousBelt !== promotion.newBelt;

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Student Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={20} style={{ color: '#6b7280' }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Aluno ID: {promotion.studentId.slice(0, 8)}...
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar size={14} style={{ color: '#6b7280' }} />
              <Typography variant="body2" color="text.secondary">
                {format(promotion.promotionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Center: Belt Transition */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={getBeltLabel(promotion.previousBelt)}
              size="small"
              sx={{
                bgcolor: previousBeltColor.bg,
                color: previousBeltColor.text,
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
            <StripesDisplay count={promotion.previousStripes} />
          </Box>

          <ArrowRight size={18} style={{ color: '#16a34a' }} />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={getBeltLabel(promotion.newBelt)}
              size="small"
              sx={{
                bgcolor: newBeltColor.bg,
                color: newBeltColor.text,
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
            <StripesDisplay count={promotion.newStripes} />
          </Box>
        </Box>

        {/* Right: Type Badge */}
        <Chip
          label={isBeltChange ? 'Nova Faixa' : 'Grau'}
          size="small"
          color={isBeltChange ? 'success' : 'primary'}
          variant="outlined"
        />
      </Box>

      {/* Notes */}
      {promotion.notes && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {promotion.notes}
          </Typography>
        </Box>
      )}

      {/* Meta info */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {promotion.totalClasses} aulas no momento da promocao
          {promotion.promotedByName && ` | Promovido por ${promotion.promotedByName}`}
        </Typography>
      </Box>
    </Paper>
  );
}

export default PromotionHistoryCard;
