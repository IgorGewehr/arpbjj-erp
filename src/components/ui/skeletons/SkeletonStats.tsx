'use client';

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

/**
 * KPI stat cards row (responsive grid).
 * Default 4 cards. Responsive: 2 cols on mobile, 4 cols on desktop.
 */
export function SkeletonStats({ count = 4, className = '' }: SkeletonStatsProps) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-24 sm:h-28"
        />
      ))}
    </div>
  );
}

export default SkeletonStats;
