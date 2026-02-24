'use client';

import { Box, Typography } from '@mui/material';
import { SPORTS } from '@/lib/constants/sports';

// ============================================
// ArmBandDisplay — Muay Thai Prajied (armband)
// Visual: wider-than-tall horizontal band with
// optional "tip" color on each end (stripes = tips shown).
// ============================================

interface ArmBandDisplayProps {
  grade: string;    // grade id (e.g. 'white', 'light-blue')
  stripes: number;  // number of tips to show (0, 1, or 2)
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const sizeConfig = {
  small: {
    width: 80,
    height: 14,
    tipWidth: 14,
    fontSize: '0.7rem',
  },
  medium: {
    width: 120,
    height: 20,
    tipWidth: 20,
    fontSize: '0.8rem',
  },
  large: {
    width: 160,
    height: 26,
    tipWidth: 28,
    fontSize: '0.9rem',
  },
};

export function ArmBandDisplay({
  grade,
  stripes,
  size = 'medium',
  showLabel = false,
}: ArmBandDisplayProps) {
  const config = sizeConfig[size];

  // Look up grade from Muay Thai sport definition
  const sport = SPORTS.muaythai;
  const gradeDef = sport.adultGrades.find(g => g.id === grade);
  const bodyColor = gradeDef?.color ?? '#F5F5F5';
  const tipColor = gradeDef?.tipColor ?? '#DC2626'; // default red tips
  const gradeLabel = gradeDef?.label ?? grade;
  const isWhite = grade === 'white';

  // Tips are shown on both ends; stripes = how many tips (0, 1 or 2)
  const showLeftTip = stripes >= 1;
  const showRightTip = stripes >= 2;

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          width: config.width,
          height: config.height,
          borderRadius: 0.75,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          border: isWhite ? '1px solid' : 'none',
          borderColor: 'divider',
        }}
      >
        {/* Left tip */}
        {showLeftTip && (
          <Box
            sx={{
              width: config.tipWidth,
              bgcolor: tipColor,
              flexShrink: 0,
            }}
          />
        )}

        {/* Body */}
        <Box
          sx={{
            flex: 1,
            bgcolor: bodyColor,
          }}
        />

        {/* Right tip */}
        {showRightTip && (
          <Box
            sx={{
              width: config.tipWidth,
              bgcolor: tipColor,
              flexShrink: 0,
            }}
          />
        )}
      </Box>

      {showLabel && (
        <Typography
          variant="caption"
          sx={{
            fontSize: config.fontSize,
            color: 'text.secondary',
            fontWeight: 500,
          }}
        >
          {gradeLabel}
          {stripes > 0 && ` ${stripes} ponta${stripes > 1 ? 's' : ''}`}
        </Typography>
      )}
    </Box>
  );
}

export default ArmBandDisplay;
