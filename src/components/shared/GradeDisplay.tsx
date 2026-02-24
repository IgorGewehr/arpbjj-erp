'use client';

import { BeltDisplay } from './BeltDisplay';
import { ArmBandDisplay } from './ArmBandDisplay';
import { SPORTS, SportId } from '@/lib/constants/sports';

// ============================================
// GradeDisplay — Unified wrapper
// Renders the correct visual for any sport:
//   belt    → BeltDisplay
//   armband → ArmBandDisplay
//   none    → null (e.g. Boxing)
// ============================================

interface GradeDisplayProps {
  sportId: SportId;
  grade: string;
  stripes: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function GradeDisplay({
  sportId,
  grade,
  stripes,
  size = 'medium',
  showLabel = false,
}: GradeDisplayProps) {
  const sport = SPORTS[sportId];

  if (!sport) return null;

  switch (sport.gradeSystem) {
    case 'belt':
      return (
        <BeltDisplay
          belt={grade}
          stripes={stripes}
          size={size}
          showLabel={showLabel}
        />
      );
    case 'armband':
      return (
        <ArmBandDisplay
          grade={grade}
          stripes={stripes}
          size={size}
          showLabel={showLabel}
        />
      );
    case 'none':
    default:
      return null;
  }
}

export default GradeDisplay;
