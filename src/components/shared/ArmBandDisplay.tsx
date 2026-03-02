'use client';

import { Box, Typography } from '@mui/material';
import { SPORTS } from '@/lib/constants/sports';

// ============================================
// ArmBandDisplay — Muay Thai Prajied (armband)
// Visual: wider-than-tall horizontal band with
// optional "tip" color on each end (stripes = tips shown).
// Enhanced with fabric-like gradients, stitching,
// and smooth tip transitions.
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
    stitchHeight: 1,
  },
  medium: {
    width: 120,
    height: 20,
    tipWidth: 20,
    fontSize: '0.8rem',
    stitchHeight: 1.5,
  },
  large: {
    width: 160,
    height: 26,
    tipWidth: 28,
    fontSize: '0.9rem',
    stitchHeight: 2,
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
  const isBlack = grade === 'black';

  // Tips are shown on both ends; stripes = how many tips (0, 1 or 2)
  const showLeftTip = stripes >= 1;
  const showRightTip = stripes >= 2;

  // Fabric-like gradient for body
  const bodyGradient = isWhite
    ? `linear-gradient(180deg, #FAFAFA 0%, ${bodyColor} 30%, #E8E8E8 70%, #F0F0F0 100%)`
    : isBlack
    ? `linear-gradient(180deg, #2A2A2A 0%, ${bodyColor} 35%, #0A0A0A 65%, #1A1A1A 100%)`
    : `linear-gradient(180deg, ${bodyColor}CC 0%, ${bodyColor} 35%, ${bodyColor}DD 65%, ${bodyColor}BB 100%)`;

  // Tip gradient — smooth transition into body
  const tipGradient = (side: 'left' | 'right') => {
    const edge = side === 'left' ? 'to right' : 'to left';
    return `linear-gradient(${edge}, ${tipColor} 60%, ${tipColor}DD 100%)`;
  };

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          width: config.width,
          height: config.height,
          borderRadius: `${config.height / 3}px`,
          overflow: 'hidden',
          boxShadow: `0 1px 3px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.15)`,
          border: isWhite ? '1px solid' : 'none',
          borderColor: 'divider',
          position: 'relative',
        }}
      >
        {/* Left tip */}
        {showLeftTip && (
          <Box
            sx={{
              width: config.tipWidth,
              background: tipGradient('left'),
              flexShrink: 0,
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.2), inset 0 -2px 3px rgba(0,0,0,0.15)',
            }}
          />
        )}

        {/* Body */}
        <Box
          sx={{
            flex: 1,
            background: bodyGradient,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.12)',
            position: 'relative',
          }}
        >
          {/* Center stitch / fold line */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: config.stitchHeight,
              transform: 'translateY(-50%)',
              background: isWhite
                ? 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent 100%)'
                : isBlack
                ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 80%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.1) 80%, transparent 100%)',
            }}
          />
        </Box>

        {/* Right tip */}
        {showRightTip && (
          <Box
            sx={{
              width: config.tipWidth,
              background: tipGradient('right'),
              flexShrink: 0,
              boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.2), inset 0 -2px 3px rgba(0,0,0,0.15)',
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
