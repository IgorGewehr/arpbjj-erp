'use client';

import { ReactNode } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { LucideIcon, FileX, AlertCircle } from 'lucide-react';

// ============================================
// Responsive Loading Screen
// ============================================
interface ResponsiveLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function ResponsiveLoading({ message = 'Carregando...', fullScreen = true }: ResponsiveLoadingProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: { xs: 1.5, sm: 2 },
        minHeight: fullScreen ? '100vh' : { xs: 200, sm: 300 },
        px: 2,
      }}
    >
      <CircularProgress size={isMobile ? 32 : 48} />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
      >
        {message}
      </Typography>
    </Box>
  );
}

// ============================================
// Responsive Empty State
// ============================================
interface ResponsiveEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ResponsiveEmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
}: ResponsiveEmptyStateProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: { xs: 4, sm: 6 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box
        sx={{
          width: { xs: 56, sm: 72 },
          height: { xs: 56, sm: 72 },
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: { xs: 2, sm: 3 },
        }}
      >
        <Icon size={isMobile ? 28 : 36} color={theme.palette.text.secondary} />
      </Box>
      <Typography
        variant="h6"
        fontWeight={600}
        gutterBottom
        sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.8rem', sm: '0.875rem' },
            maxWidth: 360,
            mb: action ? { xs: 2, sm: 3 } : 0,
          }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="contained"
          size={isMobile ? 'small' : 'medium'}
          onClick={action.onClick}
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}

// ============================================
// Responsive Page Header
// ============================================
interface ResponsivePageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function ResponsivePageHeader({ title, subtitle, action }: ResponsivePageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 4 },
      }}
    >
      <Box>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom={!!subtitle}
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.8rem', sm: '1rem' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
    </Box>
  );
}

// ============================================
// Responsive Stats Card
// ============================================
interface ResponsiveStatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function ResponsiveStatsCard({
  title,
  value,
  icon,
  color,
  bgColor,
  trend,
}: ResponsiveStatsCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
        <Box
          sx={{
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2,
            bgcolor: bgColor,
            color,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ fontSize: { xs: '1.25rem', sm: '2rem' } }}
            >
              {value}
            </Typography>
            {trend && (
              <Typography
                variant="caption"
                sx={{
                  color: trend.isPositive ? 'success.main' : 'error.main',
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                }}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================
// Responsive Card Skeleton
// ============================================
interface ResponsiveCardSkeletonProps {
  height?: number | { xs: number; sm: number };
  count?: number;
}

export function ResponsiveCardSkeleton({ height = { xs: 80, sm: 100 }, count = 1 }: ResponsiveCardSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
      {skeletons.map((i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={typeof height === 'number' ? height : undefined}
          sx={{
            borderRadius: { xs: 2, sm: 3 },
            height: typeof height === 'object' ? height : undefined,
          }}
        />
      ))}
    </Box>
  );
}

// ============================================
// Responsive Error State
// ============================================
interface ResponsiveErrorStateProps {
  title?: string;
  message: string;
  retry?: {
    label?: string;
    onClick: () => void;
  };
}

export function ResponsiveErrorState({
  title = 'Erro',
  message,
  retry,
}: ResponsiveErrorStateProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: { xs: 4, sm: 6 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box
        sx={{
          width: { xs: 56, sm: 72 },
          height: { xs: 56, sm: 72 },
          borderRadius: '50%',
          bgcolor: 'error.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: { xs: 2, sm: 3 },
        }}
      >
        <AlertCircle size={isMobile ? 28 : 36} color={theme.palette.error.main} />
      </Box>
      <Typography
        variant="h6"
        fontWeight={600}
        gutterBottom
        sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          maxWidth: 360,
          mb: retry ? { xs: 2, sm: 3 } : 0,
        }}
      >
        {message}
      </Typography>
      {retry && (
        <Button
          variant="outlined"
          color="error"
          size={isMobile ? 'small' : 'medium'}
          onClick={retry.onClick}
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          {retry.label || 'Tentar novamente'}
        </Button>
      )}
    </Box>
  );
}

// ============================================
// Responsive Section Title
// ============================================
interface ResponsiveSectionTitleProps {
  title: string;
  action?: ReactNode;
}

export function ResponsiveSectionTitle({ title, action }: ResponsiveSectionTitleProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: { xs: 1.5, sm: 2 },
      }}
    >
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        {title}
      </Typography>
      {action}
    </Box>
  );
}

// ============================================
// Responsive useIsMobile Hook (convenience export)
// ============================================
export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}

export function useIsTablet() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}
