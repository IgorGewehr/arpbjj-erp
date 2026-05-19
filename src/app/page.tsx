'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { getDefaultRoute } from '@/lib/permissions';
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeletons';

const CONNECTION_TIMEOUT_MS = 8000;

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const { academyUser, isLoading: academyLoading } = useAcademy();
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  const isLoading = loading || (isAuthenticated && academyLoading);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user && academyUser) {
      router.replace(getDefaultRoute(academyUser.role));
    } else if (!isAuthenticated || (isAuthenticated && user && !academyUser)) {
      // Not logged in OR logged in but not linked to any academy
      router.replace('/login');
    }
  }, [isAuthenticated, loading, user, academyUser, academyLoading, router, isLoading]);

  // Connection timeout — show error screen if loading exceeds 8s
  useEffect(() => {
    if (!isLoading) {
      setShowTimeoutError(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowTimeoutError(true);
    }, CONNECTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Error state — show retry button after 8s
  if (showTimeoutError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          px: 3,
          textAlign: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Não conseguimos conectar.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          Verifique sua conexão com a internet e tente novamente.
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Tentar novamente
        </Button>
      </Box>
    );
  }

  // Loading state — skeletons instead of generic spinner
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
      {/* Header skeletons */}
      <Box sx={{ mb: 3 }}>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-8 w-48 mb-2" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-md h-5 w-64" />
      </Box>

      {/* KPI cards */}
      <Box sx={{ mb: 3 }}>
        <SkeletonStats count={4} />
      </Box>

      {/* Main content card */}
      <SkeletonCard height={280} />
    </Box>
  );
}
