'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/components/providers';

// ============================================
// Props Interface
// ============================================
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'instructor' | 'student' | 'guardian';
}

// ============================================
// ProtectedRoute Component
// ============================================
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, isAdmin, isInstructor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Check role permission
  useEffect(() => {
    if (!loading && isAuthenticated && requiredRole) {
      let hasPermission = false;

      switch (requiredRole) {
        case 'admin':
          hasPermission = isAdmin;
          break;
        case 'instructor':
          hasPermission = isInstructor;
          break;
        case 'student':
        case 'guardian':
          hasPermission = user?.role === requiredRole || isAdmin;
          break;
        default:
          hasPermission = true;
      }

      if (!hasPermission) {
        router.push('/dashboard');
      }
    }
  }, [loading, isAuthenticated, requiredRole, isAdmin, isInstructor, user, router]);

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">
          Carregando...
        </Typography>
      </Box>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
