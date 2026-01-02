'use client';

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthProvider';
import { Permission, UserRole, Resource, Action } from '@/types';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getAllowedRoutes,
  getDefaultRoute,
  isRouteAllowed,
  ROLE_LABELS,
} from '@/lib/permissions';

// ============================================
// Context Types
// ============================================
interface PermissionContextType {
  // Role info
  role: UserRole | null;
  roleLabel: string;

  // Permission checks
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;

  // Resource-action shorthand
  canView: (resource: Resource) => boolean;
  canViewOwn: (resource: Resource) => boolean;
  canCreate: (resource: Resource) => boolean;
  canEdit: (resource: Resource) => boolean;
  canDelete: (resource: Resource) => boolean;
  canManage: (resource: Resource) => boolean;

  // Route checks
  canAccessRoute: (route: string) => boolean;
  allowedRoutes: string[];
  defaultRoute: string;

  // Data access checks
  canAccessStudentData: (studentId: string) => boolean;
  linkedStudentIds: string[];

  // Admin check
  isAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  isGuardian: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================
interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user, isAuthenticated } = useAuth();

  const role = user?.role || null;

  // ============================================
  // Permission Check Functions
  // ============================================
  const can = useCallback(
    (permission: Permission): boolean => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    [role]
  );

  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      if (!role) return false;
      return hasAnyPermission(role, permissions);
    },
    [role]
  );

  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      if (!role) return false;
      return hasAllPermissions(role, permissions);
    },
    [role]
  );

  // ============================================
  // Resource-Action Shorthand
  // ============================================
  const canView = useCallback(
    (resource: Resource): boolean => can(`${resource}:view`),
    [can]
  );

  const canViewOwn = useCallback(
    (resource: Resource): boolean => can(`${resource}:view_own`),
    [can]
  );

  const canCreate = useCallback(
    (resource: Resource): boolean => can(`${resource}:create`),
    [can]
  );

  const canEdit = useCallback(
    (resource: Resource): boolean => can(`${resource}:edit`),
    [can]
  );

  const canDelete = useCallback(
    (resource: Resource): boolean => can(`${resource}:delete`),
    [can]
  );

  const canManage = useCallback(
    (resource: Resource): boolean => can(`${resource}:manage`),
    [can]
  );

  // ============================================
  // Route Checks
  // ============================================
  const canAccessRoute = useCallback(
    (route: string): boolean => {
      if (!role) return false;
      return isRouteAllowed(role, route);
    },
    [role]
  );

  const allowedRoutes = useMemo(() => {
    if (!role) return [];
    return getAllowedRoutes(role);
  }, [role]);

  const defaultRoute = useMemo(() => {
    if (!role) return '/login';
    return getDefaultRoute(role);
  }, [role]);

  // ============================================
  // Data Access Checks
  // ============================================
  const linkedStudentIds = useMemo(() => {
    if (!user) return [];

    // For students, they can only access their own data
    if (role === 'student' && user.studentId) {
      return [user.studentId];
    }

    // For guardians, they can access their children's data
    if (role === 'guardian' && user.linkedStudentIds) {
      return user.linkedStudentIds;
    }

    return [];
  }, [user, role]);

  const canAccessStudentData = useCallback(
    (studentId: string): boolean => {
      // Admins and instructors can access all student data
      if (role === 'admin' || role === 'instructor') {
        return true;
      }

      // Students and guardians can only access linked data
      return linkedStudentIds.includes(studentId);
    },
    [role, linkedStudentIds]
  );

  // ============================================
  // Role Checks
  // ============================================
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isStudent = role === 'student';
  const isGuardian = role === 'guardian';

  const roleLabel = useMemo(() => {
    if (!role) return '';
    return ROLE_LABELS[role];
  }, [role]);

  // ============================================
  // Context Value
  // ============================================
  const contextValue = useMemo<PermissionContextType>(
    () => ({
      role,
      roleLabel,
      can,
      canAny,
      canAll,
      canView,
      canViewOwn,
      canCreate,
      canEdit,
      canDelete,
      canManage,
      canAccessRoute,
      allowedRoutes,
      defaultRoute,
      canAccessStudentData,
      linkedStudentIds,
      isAdmin,
      isInstructor,
      isStudent,
      isGuardian,
    }),
    [
      role,
      roleLabel,
      can,
      canAny,
      canAll,
      canView,
      canViewOwn,
      canCreate,
      canEdit,
      canDelete,
      canManage,
      canAccessRoute,
      allowedRoutes,
      defaultRoute,
      canAccessStudentData,
      linkedStudentIds,
      isAdmin,
      isInstructor,
      isStudent,
      isGuardian,
    ]
  );

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// ============================================
// HOC for Permission-based rendering
// ============================================
interface RequirePermissionProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequirePermission({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: RequirePermissionProps) {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// HOC for Role-based rendering
// ============================================
interface RequireRoleProps {
  roles: UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequireRole({ roles, fallback = null, children }: RequireRoleProps) {
  const { role } = usePermissions();

  if (!role || !roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// Hook for checking if can edit specific student
// ============================================
export function useCanAccessStudent(studentId: string) {
  const { canAccessStudentData, canView, canEdit, canDelete } = usePermissions();

  return {
    canAccess: canAccessStudentData(studentId),
    canView: canAccessStudentData(studentId) && (canView('students') || canViewOwn('students')),
    canEdit: canAccessStudentData(studentId) && canEdit('students'),
    canDelete: canAccessStudentData(studentId) && canDelete('students'),
  };

  function canViewOwn(resource: 'students'): boolean {
    return usePermissions().canViewOwn(resource);
  }
}
