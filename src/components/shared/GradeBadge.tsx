'use client';

import { Box, Typography } from '@mui/material';
import { SportId, SPORTS, getGradeColor, getGradeLabel } from '@/lib/constants/sports';
import { BeltBadge } from './BeltDisplay';

// ============================================
// GradeBadge — Compact badge for listings
// Delegates to BeltBadge for belt sports,
// renders a custom compact badge for armband,
// and renders nothing for "none" sports.
// ============================================

interface GradeBadgeProps {
  sportId: SportId;
  grade: string;
  stripes: number;
}

export function GradeBadge({ sportId, grade, stripes }: GradeBadgeProps) {
  const sport = SPORTS[sportId];
  if (!sport) return null;

  switch (sport.gradeSystem) {
    case 'belt':
      // Reuse existing BJJ BeltBadge component
      return <BeltBadge belt={grade} stripes={stripes} />;

    case 'armband': {
      const color = getGradeColor(sportId, grade);
      const label = getGradeLabel(sportId, grade);
      const isWhite = grade === 'white';

      return (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: color,
            border: isWhite ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isWhite ? '#171717' : '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {label.substring(0, 4)}
          </Typography>
          {stripes > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: isWhite ? '#171717' : '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.65rem',
              }}
            >
              {stripes}T
            </Typography>
          )}
        </Box>
      );
    }

    case 'none':
    default:
      return null;
  }
}

export default GradeBadge;
