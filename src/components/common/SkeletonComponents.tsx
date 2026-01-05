'use client';

import { Box, Skeleton } from '@mui/material';
import { keyframes } from '@mui/system';

// ============================================
// Shimmer Animation
// ============================================
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

// ============================================
// Base Shimmer Skeleton
// ============================================
interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  sx?: object;
}

export function ShimmerSkeleton({
  width,
  height,
  variant = 'rounded',
  sx = {},
}: ShimmerSkeletonProps) {
  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      sx={{
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%)'
            : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: `${shimmer} 1.5s infinite`,
        ...sx,
      }}
    />
  );
}

// ============================================
// Card Skeleton
// ============================================
interface CardSkeletonProps {
  hasImage?: boolean;
  hasActions?: boolean;
}

export function CardSkeleton({ hasImage = false, hasActions = false }: CardSkeletonProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 1,
      }}
    >
      {hasImage && (
        <ShimmerSkeleton
          height={140}
          sx={{ mb: 2, borderRadius: 1 }}
        />
      )}
      <ShimmerSkeleton width="60%" height={24} sx={{ mb: 1 }} />
      <ShimmerSkeleton width="80%" height={16} sx={{ mb: 0.5 }} />
      <ShimmerSkeleton width="40%" height={16} />
      {hasActions && (
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <ShimmerSkeleton width={80} height={32} />
          <ShimmerSkeleton width={80} height={32} />
        </Box>
      )}
    </Box>
  );
}

// ============================================
// Stats Card Skeleton
// ============================================
export function StatsCardSkeleton() {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ShimmerSkeleton width={48} height={48} variant="rounded" />
        <Box sx={{ flex: 1 }}>
          <ShimmerSkeleton width="50%" height={14} sx={{ mb: 1 }} />
          <ShimmerSkeleton width="30%" height={28} />
        </Box>
      </Box>
    </Box>
  );
}

// ============================================
// Table Row Skeleton
// ============================================
interface TableRowSkeletonProps {
  columns?: number;
  hasAvatar?: boolean;
}

export function TableRowSkeleton({ columns = 5, hasAvatar = true }: TableRowSkeletonProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        py: 1.5,
        px: 2,
        alignItems: 'center',
      }}
    >
      {hasAvatar && (
        <ShimmerSkeleton width={40} height={40} variant="circular" />
      )}
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          width={`${100 / columns}%`}
          height={20}
        />
      ))}
    </Box>
  );
}

// ============================================
// List Item Skeleton
// ============================================
interface ListItemSkeletonProps {
  hasSecondaryAction?: boolean;
}

export function ListItemSkeleton({ hasSecondaryAction = false }: ListItemSkeletonProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
      }}
    >
      <ShimmerSkeleton width={48} height={48} variant="circular" />
      <Box sx={{ flex: 1 }}>
        <ShimmerSkeleton width="60%" height={20} sx={{ mb: 0.5 }} />
        <ShimmerSkeleton width="40%" height={16} />
      </Box>
      {hasSecondaryAction && (
        <ShimmerSkeleton width={32} height={32} variant="circular" />
      )}
    </Box>
  );
}

// ============================================
// Chart Skeleton
// ============================================
interface ChartSkeletonProps {
  height?: number;
  type?: 'bar' | 'line' | 'pie';
}

export function ChartSkeleton({ height = 300, type = 'bar' }: ChartSkeletonProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 1,
      }}
    >
      <ShimmerSkeleton width="40%" height={20} sx={{ mb: 2 }} />
      {type === 'pie' ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <ShimmerSkeleton width={200} height={200} variant="circular" />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <ShimmerSkeleton
              key={i}
              width={`${100 / 7}%`}
              height={`${30 + Math.random() * 70}%`}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================
// Timeline Skeleton
// ============================================
interface TimelineSkeletonProps {
  count?: number;
}

export function TimelineSkeleton({ count = 3 }: TimelineSkeletonProps) {
  return (
    <Box>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            position: 'relative',
            '&:not(:last-child)::before': {
              content: '""',
              position: 'absolute',
              left: 24,
              top: 48,
              bottom: -12,
              width: 2,
              bgcolor: 'divider',
            },
          }}
        >
          <ShimmerSkeleton width={48} height={48} variant="circular" />
          <Box sx={{ flex: 1 }}>
            <ShimmerSkeleton width="70%" height={20} sx={{ mb: 1 }} />
            <ShimmerSkeleton width="50%" height={14} sx={{ mb: 0.5 }} />
            <ShimmerSkeleton width="30%" height={12} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ============================================
// Profile Header Skeleton
// ============================================
export function ProfileHeaderSkeleton() {
  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', p: 3 }}>
      <ShimmerSkeleton width={80} height={80} variant="circular" />
      <Box sx={{ flex: 1 }}>
        <ShimmerSkeleton width="40%" height={28} sx={{ mb: 1 }} />
        <ShimmerSkeleton width="60%" height={16} sx={{ mb: 0.5 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <ShimmerSkeleton width={60} height={24} />
          <ShimmerSkeleton width={60} height={24} />
          <ShimmerSkeleton width={60} height={24} />
        </Box>
      </Box>
    </Box>
  );
}

// ============================================
// Form Skeleton
// ============================================
interface FormSkeletonProps {
  fields?: number;
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: fields }).map((_, i) => (
        <Box key={i}>
          <ShimmerSkeleton width={100} height={14} sx={{ mb: 0.5 }} />
          <ShimmerSkeleton width="100%" height={40} />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
        <ShimmerSkeleton width={80} height={36} />
        <ShimmerSkeleton width={100} height={36} />
      </Box>
    </Box>
  );
}

// ============================================
// Grid Skeleton
// ============================================
interface GridSkeletonProps {
  count?: number;
  columns?: { xs: number; sm?: number; md?: number; lg?: number };
}

export function GridSkeleton({
  count = 6,
  columns = { xs: 1, sm: 2, md: 3 },
}: GridSkeletonProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: `repeat(${columns.xs}, 1fr)`,
          sm: `repeat(${columns.sm || columns.xs}, 1fr)`,
          md: `repeat(${columns.md || columns.sm || columns.xs}, 1fr)`,
          lg: `repeat(${columns.lg || columns.md || columns.sm || columns.xs}, 1fr)`,
        },
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </Box>
  );
}

// ============================================
// Dashboard Skeleton (combines multiple skeletons)
// ============================================
export function DashboardSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Stats Row */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </Box>
      {/* Chart */}
      <ChartSkeleton height={250} />
      {/* List */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
        <ShimmerSkeleton width="30%" height={24} sx={{ mb: 2 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </Box>
    </Box>
  );
}
