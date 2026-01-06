'use client';

import { Box, Typography } from '@mui/material';
import { BeltColor, Stripes } from '@/types';

// ============================================
// Belt Colors
// ============================================
const BELT_COLORS: Record<string, string> = {
  // Adult belts
  white: '#F5F5F5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
  // Kids belts
  grey: '#6B7280',
  'grey-white': '#6B7280',
  yellow: '#EAB308',
  'yellow-white': '#EAB308',
  orange: '#EA580C',
  'orange-white': '#EA580C',
  green: '#16A34A',
  'green-white': '#16A34A',
};

const BELT_LABELS: Record<string, string> = {
  // Adult belts
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
  // Kids belts
  grey: 'Cinza',
  'grey-white': 'Cinza/Branca',
  yellow: 'Amarela',
  'yellow-white': 'Amarela/Branca',
  orange: 'Laranja',
  'orange-white': 'Laranja/Branca',
  green: 'Verde',
  'green-white': 'Verde/Branca',
};

// Check if belt has white stripe in the middle
const hasWhiteStripe = (belt: string): boolean => {
  return belt.endsWith('-white');
};

// ============================================
// Props Interface
// ============================================
interface BeltDisplayProps {
  belt: string;
  stripes: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

// ============================================
// Size Configurations
// ============================================
const sizeConfig = {
  small: {
    width: 70,
    height: 16,
    tipWidth: 20,
    stripeWidth: 2.5,
    stripeHeight: 10,
    stripeGap: 1.5,
    fontSize: '0.7rem',
  },
  medium: {
    width: 100,
    height: 22,
    tipWidth: 28,
    stripeWidth: 3.5,
    stripeHeight: 14,
    stripeGap: 2,
    fontSize: '0.8rem',
  },
  large: {
    width: 140,
    height: 28,
    tipWidth: 38,
    stripeWidth: 5,
    stripeHeight: 18,
    stripeGap: 2.5,
    fontSize: '0.9rem',
  },
};

// ============================================
// BeltDisplay Component
// ============================================
export function BeltDisplay({
  belt,
  stripes,
  size = 'medium',
  showLabel = false,
}: BeltDisplayProps) {
  const config = sizeConfig[size];
  const beltColor = BELT_COLORS[belt] || BELT_COLORS.white;
  const beltLabel = BELT_LABELS[belt] || belt;
  const isWhiteBelt = belt === 'white';
  const isBlackBelt = belt === 'black';
  const showMiddleStripe = hasWhiteStripe(belt);

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          width: config.width,
          height: config.height,
          borderRadius: 0.5,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          border: isWhiteBelt ? '1px solid' : 'none',
          borderColor: 'divider',
        }}
      >
        {/* Belt body - with optional white stripe in middle */}
        {showMiddleStripe ? (
          <>
            {/* First half of belt */}
            <Box
              sx={{
                flex: 1,
                bgcolor: beltColor,
              }}
            />
            {/* White stripe in middle */}
            <Box
              sx={{
                width: config.height * 0.25,
                bgcolor: '#FFFFFF',
                borderLeft: '0.5px solid rgba(0,0,0,0.1)',
                borderRight: '0.5px solid rgba(0,0,0,0.1)',
              }}
            />
            {/* Second half of belt */}
            <Box
              sx={{
                flex: 1,
                bgcolor: beltColor,
              }}
            />
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              bgcolor: beltColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        )}

        {/* Black tip with stripes */}
        <Box
          sx={{
            width: config.tipWidth,
            bgcolor: isBlackBelt ? '#2D2D2D' : '#171717',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${config.stripeGap}px`,
            borderLeft: isBlackBelt ? '1px solid #3D3D3D' : 'none',
          }}
        >
          {stripes > 0 && Array.from({ length: stripes }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: config.stripeWidth,
                height: config.stripeHeight,
                bgcolor: isBlackBelt ? '#DC2626' : '#FFFFFF',
                borderRadius: 0.3,
              }}
            />
          ))}
        </Box>
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
          {beltLabel}
          {stripes > 0 && ` ${stripes}°`}
        </Typography>
      )}
    </Box>
  );
}

// ============================================
// Compact Belt Badge (for lists)
// ============================================
interface BeltBadgeProps {
  belt: string;
  stripes: number;
}

export function BeltBadge({ belt, stripes }: BeltBadgeProps) {
  const beltColor = BELT_COLORS[belt] || BELT_COLORS.white;
  const beltLabel = BELT_LABELS[belt] || belt;
  const isWhiteBelt = belt === 'white';
  const isBlackBelt = belt === 'black';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: beltColor,
        border: isWhiteBelt ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: isWhiteBelt || belt === 'yellow' ? '#171717' : '#FFFFFF',
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {beltLabel.substring(0, 3)}
      </Typography>

      {stripes > 0 && (
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {Array.from({ length: stripes }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 3,
                height: 8,
                bgcolor: isBlackBelt ? '#DC2626' : '#FFFFFF',
                borderRadius: 0.3,
                boxShadow: isWhiteBelt ? '0 0 1px rgba(0,0,0,0.3)' : 'none',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default BeltDisplay;
