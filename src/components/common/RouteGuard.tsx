'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Box, CircularProgress, Typography, Paper, Button, useTheme, useMediaQuery } from '@mui/material';
import { ShieldAlert, Home, LogIn } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { usePermissions } from '@/components/providers/PermissionProvider';
import { Permission, UserRole } from '@/types';

// ============================================
// Loading Screen
// ============================================
function LoadingScreen() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: { xs: 1.5, sm: 2 },
        px: 2,
      }}
    >
      <CircularProgress size={isMobile ? 36 : 48} />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
      >
        Verificando permissoes...
      </Typography>
    </Box>
  );
}

// ============================================
// Access Denied Screen
// ============================================
interface AccessDeniedProps {
  message?: string;
  showLoginButton?: boolean;
}

function AccessDenied({ message, showLoginButton }: AccessDeniedProps) {
  const router = useRouter();
  const { defaultRoute } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          maxWidth: { xs: '100%', sm: 400 },
          width: '100%',
          borderRadius: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            width: { xs: 64, sm: 80 },
            height: { xs: 64, sm: 80 },
            borderRadius: '50%',
            bgcolor: 'error.50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: { xs: 2, sm: 3 },
          }}
        >
          <ShieldAlert size={isMobile ? 32 : 40} color="#DC2626" />
        </Box>

        <Typography
          variant="h5"
          fontWeight={700}
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Acesso Negado
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '0.85rem', sm: '1rem' } }}
        >
          {message || 'Voce nao tem permissao para acessar esta pagina.'}
        </Typography>

        <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, justifyContent: 'center' }}>
          {showLoginButton ? (
            <Button
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<LogIn size={isMobile ? 16 : 18} />}
              onClick={() => router.push('/login')}
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Fazer Login
            </Button>
          ) : (
            <Button
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<Home size={isMobile ? 16 : 18} />}
              onClick={() => router.push(defaultRoute)}
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Ir para Inicio
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

// ============================================
// Route Guard Component
// ============================================
interface RouteGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  requireAll?: boolean;
  allowUnauthenticated?: boolean;
  fallback?: ReactNode;
}

export function RouteGuard({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRoles,
  requireAll = false,
  allowUnauthenticated = false,
  fallback,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { can, canAny, canAll, canAccessRoute, defaultRoute, role } = usePermissions();

  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Public routes
    if (allowUnauthenticated) {
      setHasAccess(true);
      setIsChecking(false);
      return;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check role requirement
    if (requiredRoles && requiredRoles.length > 0) {
      if (!role || !requiredRoles.includes(role)) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }
    }

    // Check permission requirement
    if (requiredPermission) {
      if (!can(requiredPermission)) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }
    }

    // Check multiple permissions requirement
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = requireAll
        ? canAll(requiredPermissions)
        : canAny(requiredPermissions);

      if (!hasPermissions) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }
    }

    // Check route access
    if (!canAccessRoute(pathname)) {
      // Redirect to default route for the user's role
      router.replace(defaultRoute);
      return;
    }

    // All checks passed
    setHasAccess(true);
    setIsChecking(false);
  }, [
    authLoading,
    isAuthenticated,
    pathname,
    router,
    role,
    requiredRoles,
    requiredPermission,
    requiredPermissions,
    requireAll,
    can,
    canAny,
    canAll,
    canAccessRoute,
    defaultRoute,
    allowUnauthenticated,
  ]);

  // Still loading
  if (authLoading || isChecking) {
    return <LoadingScreen />;
  }

  // No access
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AccessDenied showLoginButton={!isAuthenticated} />;
  }

  // Has access
  return <>{children}</>;
}

// ============================================
// Admin Route Guard
// ============================================
interface AdminRouteGuardProps {
  children: ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  return (
    <RouteGuard requiredRoles={['admin']}>
      {children}
    </RouteGuard>
  );
}

// ============================================
// Staff Route Guard (Admin + Instructor)
// ============================================
interface StaffRouteGuardProps {
  children: ReactNode;
}

export function StaffRouteGuard({ children }: StaffRouteGuardProps) {
  return (
    <RouteGuard requiredRoles={['admin', 'instructor']}>
      {children}
    </RouteGuard>
  );
}

// ============================================
// Student/Guardian Route Guard
// ============================================
interface PortalRouteGuardProps {
  children: ReactNode;
}

export function StudentPortalGuard({ children }: PortalRouteGuardProps) {
  return (
    <RouteGuard requiredRoles={['student']}>
      {children}
    </RouteGuard>
  );
}

export function GuardianPortalGuard({ children }: PortalRouteGuardProps) {
  return (
    <RouteGuard requiredRoles={['guardian']}>
      {children}
    </RouteGuard>
  );
}

export default RouteGuard;
