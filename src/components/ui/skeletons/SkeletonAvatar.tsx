'use client';

interface SkeletonAvatarProps {
  size?: number;
  className?: string;
}

/**
 * Circular avatar skeleton with pulse animation.
 */
export function SkeletonAvatar({ size = 40, className = '' }: SkeletonAvatarProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export default SkeletonAvatar;
