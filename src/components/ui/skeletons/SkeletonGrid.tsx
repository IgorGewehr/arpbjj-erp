'use client';

interface SkeletonGridProps {
  count?: number;
  columns?: 2 | 3 | 4;
  itemHeight?: number | string;
  className?: string;
}

/**
 * Responsive grid of skeleton cards (2-3 cols).
 */
export function SkeletonGrid({
  count = 8,
  columns = 3,
  itemHeight = 120,
  className = '',
}: SkeletonGridProps) {
  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  }[columns];

  return (
    <div
      className={`grid ${gridColsClass} gap-3 sm:gap-4 w-full ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl"
          style={{ height: itemHeight }}
        />
      ))}
    </div>
  );
}

export default SkeletonGrid;
