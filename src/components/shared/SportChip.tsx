'use client';

import { Box, Typography } from '@mui/material';
import { SportId, SPORTS } from '@/lib/constants/sports';

// ============================================
// Sport color map — subtle background per sport
// ============================================
const SPORT_CHIP_COLORS: Record<SportId, { bg: string; text: string }> = {
  bjj: { bg: '#1E40AF22', text: '#1E40AF' },
  muaythai: { bg: '#DC262622', text: '#DC2626' },
  karate: { bg: '#7C3AED22', text: '#7C3AED' },
  judo: { bg: '#EA580C22', text: '#EA580C' },
  kickboxing: { bg: '#16A34A22', text: '#16A34A' },
  boxing: { bg: '#17171722', text: '#374151' },
  mma: { bg: '#B4530022', text: '#B45300' },
};

// ============================================
// SportChip — small badge showing sport label
// ============================================

interface SportChipProps {
  sportId: SportId;
  /** 'short' = sigla (BJJ), 'full' = label completo */
  variant?: 'short' | 'full';
  size?: 'xs' | 'sm';
}

export function SportChip({
  sportId,
  variant = 'short',
  size = 'sm',
}: SportChipProps) {
  const sport = SPORTS[sportId];
  if (!sport) return null;

  const colors = SPORT_CHIP_COLORS[sportId];
  const label = variant === 'short' ? sport.labelShort : sport.label;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: size === 'xs' ? 0.5 : 0.75,
        py: size === 'xs' ? 0.1 : 0.25,
        borderRadius: 1,
        bgcolor: colors.bg,
        border: `1px solid ${colors.text}44`,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: colors.text,
          fontWeight: 700,
          fontSize: size === 'xs' ? '0.6rem' : '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default SportChip;
