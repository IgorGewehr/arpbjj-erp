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
  /** If true, allows both admin and instructor. Default behavior when no requiredRole is specified. */
  allowStaff?: boolean;
}

// ============================================
// ProtectedRoute Component
// ============================================
export function ProtectedRoute({ children, requiredRole, allowStaff = true }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, isAdmin, isInstructor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Check role permission
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      let hasPermission = false;

      if (requiredRole) {
        // Explicit role requirement
        switch (requiredRole) {
          case 'admin':
            hasPermission = isAdmin;
            break;
          case 'instructor':
            hasPermission = isInstructor;
            break;
          case 'student':
          case 'guardian':
            hasPermission = user.role === requiredRole || isAdmin;
            break;
          default:
            hasPermission = false;
        }
      } else {
        // No explicit role - default to staff-only (admin/instructor)
        hasPermission = isAdmin || isInstructor;
      }

      if (!hasPermission) {
        // Redirect to appropriate portal based on role
        const redirectMap: Record<string, string> = {
          student: '/portal',
          guardian: '/responsavel',
        };
        const redirectTo = redirectMap[user.role] || '/login';
        router.replace(redirectTo);
      }
    }
  }, [loading, isAuthenticated, requiredRole, isAdmin, isInstructor, user, router]);

  // Check if user has permission (synchronous check for render blocking)
  const hasPermission = (() => {
    if (!user) return false;

    if (requiredRole) {
      switch (requiredRole) {
        case 'admin':
          return isAdmin;
        case 'instructor':
          return isInstructor;
        case 'student':
        case 'guardian':
          return user.role === requiredRole || isAdmin;
        default:
          return false;
      }
    }
    // No explicit role - default to staff-only
    return isAdmin || isInstructor;
  })();

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

  // Not authenticated or no permission - don't render children
  if (!isAuthenticated || !hasPermission) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
