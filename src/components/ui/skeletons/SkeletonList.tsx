'use client';

import { SkeletonCard } from './SkeletonCard';

interface SkeletonListProps {
  count?: number;
  itemHeight?: number | string;
  gap?: number;
  className?: string;
}

/**
 * Vertical list of skeleton cards.
 * Default count = 6.
 */
export function SkeletonList({
  count = 6,
  itemHeight = 80,
  gap = 12,
  className = '',
}: SkeletonListProps) {
  return (
    <div
      className={`flex flex-col w-full ${className}`}
      style={{ gap }}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={itemHeight} />
      ))}
    </div>
  );
}

export default SkeletonList;
