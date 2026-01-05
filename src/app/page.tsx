'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/components/providers';
import { getDefaultRoute } from '@/lib/permissions';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        // Redirect based on user role
        const defaultRoute = getDefaultRoute(user.role);
        router.replace(defaultRoute);
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, loading, user, router]);

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
