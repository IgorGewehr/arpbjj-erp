'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { getDefaultRoute } from '@/lib/permissions';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const { academyUser, isLoading: academyLoading } = useAcademy();

  useEffect(() => {
    const isLoading = loading || (isAuthenticated && academyLoading);

    if (!isLoading) {
      if (isAuthenticated && user && academyUser) {
        // Redirect based on academy-specific role
        const defaultRoute = getDefaultRoute(academyUser.role);
        router.replace(defaultRoute);
      } else if (!isAuthenticated) {
        router.replace('/login');
      }
      // If authenticated but no academyUser, user may need to link account
      // The ProtectedRoute will handle this case
    }
  }, [isAuthenticated, loading, user, academyUser, academyLoading, router]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
