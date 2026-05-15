'use client';

import { CSSProperties } from 'react';

interface SkeletonCardProps {
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

/**
 * Generic skeleton card with pulse animation.
 * Uses Tailwind's animate-pulse for consistency.
 */
export function SkeletonCard({
  height = 120,
  className = '',
  style,
  rounded = '2xl',
}: SkeletonCardProps) {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  }[rounded];

  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 w-full ${roundedClass} ${className}`}
      style={{ height, ...style }}
      aria-hidden="true"
    />
  );
}

export default SkeletonCard;
