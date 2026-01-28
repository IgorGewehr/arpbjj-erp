'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/components/providers';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { useAcademy } from '@/contexts/AcademyContext';

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
  const { user, loading, isAuthenticated } = useAuth();
  const { academyUser, isLoading: academyLoading } = useAcademy();
  const { isAdmin, isInstructor, role } = usePermissions();
  const router = useRouter();

  const isLoading = loading || academyLoading;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Check role permission
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // If user has no academy/role yet, redirect to a page to link account
      if (!role && !academyUser) {
        // User is authenticated but not linked to any academy
        // You may want to redirect to an onboarding page here
        console.log('[ProtectedRoute] User has no academy role, may need to link account');
        router.replace('/login'); // Or redirect to an onboarding/link-account page
        return;
      }

      if (!role) return; // Still loading or no role

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
            hasPermission = role === requiredRole || isAdmin;
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
        const redirectTo = redirectMap[role] || '/login';
        router.replace(redirectTo);
      }
    }
  }, [isLoading, isAuthenticated, requiredRole, isAdmin, isInstructor, role, user, academyUser, router]);

  // Check if user has permission (synchronous check for render blocking)
  const hasPermission = (() => {
    if (!user || !role) return false;

    if (requiredRole) {
      switch (requiredRole) {
        case 'admin':
          return isAdmin;
        case 'instructor':
          return isInstructor;
        case 'student':
        case 'guardian':
          return role === requiredRole || isAdmin;
        default:
          return false;
      }
    }
    // No explicit role - default to staff-only
    return isAdmin || isInstructor;
  })();

  // Loading state
  if (isLoading) {
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
