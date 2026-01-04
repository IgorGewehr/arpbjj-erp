import { UserRole, Permission, RolePermissions } from '@/types';

// ============================================
// Role Permissions Configuration
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  // ============================================
  // Admin - Full Access
  // ============================================
  admin: {
    role: 'admin',
    permissions: [
      // Dashboard
      'dashboard:view',
      'dashboard:manage',
      // Students
      'students:view',
      'students:create',
      'students:edit',
      'students:delete',
      // Attendance
      'attendance:view',
      'attendance:create',
      'attendance:edit',
      'attendance:delete',
      // Financial
      'financial:view',
      'financial:create',
      'financial:edit',
      'financial:delete',
      'financial:manage',
      // Classes
      'classes:view',
      'classes:create',
      'classes:edit',
      'classes:delete',
      // Graduation
      'graduation:view',
      'graduation:create',
      'graduation:edit',
      'graduation:manage',
      // Reports
      'reports:view',
      'reports:manage',
      // Settings
      'settings:view',
      'settings:manage',
      // Kids
      'kids:view',
      'kids:create',
      'kids:edit',
      'kids:delete',
      // Instructors
      'instructors:view',
      'instructors:create',
      'instructors:edit',
      'instructors:delete',
      // Competitions
      'competitions:view',
      'competitions:create',
      'competitions:edit',
      'competitions:delete',
      'competitions:manage',
    ],
    allowedRoutes: [
      '/dashboard',
      '/alunos',
      '/alunos/novo',
      '/alunos/[id]',
      '/chamada',
      '/financeiro',
      '/turmas',
      '/graduacao',
      '/relatorios',
      '/configuracoes',
      '/kids',
      '/competicoes',
      '/competicoes/nova',
      '/competicoes/[id]',
    ],
    defaultRoute: '/dashboard',
  },

  // ============================================
  // Instructor - Class & Student Management
  // ============================================
  instructor: {
    role: 'instructor',
    permissions: [
      // Dashboard
      'dashboard:view',
      // Students
      'students:view',
      'students:edit',
      // Attendance
      'attendance:view',
      'attendance:create',
      'attendance:edit',
      // Classes
      'classes:view',
      'classes:edit',
      // Graduation
      'graduation:view',
      'graduation:create',
      // Kids
      'kids:view',
      'kids:edit',
    ],
    allowedRoutes: [
      '/dashboard',
      '/alunos',
      '/alunos/[id]',
      '/chamada',
      '/turmas',
      '/graduacao',
      '/kids',
      '/instrutor',
    ],
    defaultRoute: '/chamada',
  },

  // ============================================
  // Student - Own Data Only
  // ============================================
  student: {
    role: 'student',
    permissions: [
      // Own data
      'dashboard:view_own',
      'students:view_own',
      'students:edit', // Can edit own basic info
      'attendance:view_own',
      'financial:view_own',
      'graduation:view_own',
      'classes:view',
      'competitions:view_own',
    ],
    allowedRoutes: [
      '/portal',
      '/portal/presenca',
      '/portal/financeiro',
      '/portal/graduacao',
      '/portal/perfil',
      '/portal/meu-perfil',
      '/portal/horarios',
      '/portal/competicoes',
      '/portal/linha-do-tempo',
      '/portal/comportamento',
    ],
    defaultRoute: '/portal',
  },

  // ============================================
  // Guardian - Children's Data Only
  // ============================================
  guardian: {
    role: 'guardian',
    permissions: [
      // Children's data
      'dashboard:view_own',
      'students:view_own',
      'attendance:view_own',
      'financial:view_own',
      'graduation:view_own',
      'classes:view',
      'kids:view_own',
    ],
    allowedRoutes: [
      '/responsavel',
      '/responsavel/filhos',
      '/responsavel/presenca',
      '/responsavel/financeiro',
      '/responsavel/avaliacoes',
      '/responsavel/horarios',
    ],
    defaultRoute: '/responsavel',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const roleConfig = ROLE_PERMISSIONS[role];
  if (!roleConfig) return false;
  return roleConfig.permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role]?.permissions || [];
}

/**
 * Get allowed routes for a role
 */
export function getAllowedRoutes(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role]?.allowedRoutes || [];
}

/**
 * Get default route for a role
 */
export function getDefaultRoute(role: UserRole): string {
  return ROLE_PERMISSIONS[role]?.defaultRoute || '/login';
}

/**
 * Check if a route is allowed for a role
 */
export function isRouteAllowed(role: UserRole, route: string): boolean {
  const allowedRoutes = getAllowedRoutes(role);

  // Check exact match
  if (allowedRoutes.includes(route)) return true;

  // Check pattern match (e.g., /alunos/[id] matches /alunos/123)
  return allowedRoutes.some((allowedRoute) => {
    // Convert route pattern to regex
    const pattern = allowedRoute
      .replace(/\[.*?\]/g, '[^/]+') // Replace [param] with regex
      .replace(/\//g, '\\/'); // Escape slashes

    const regex = new RegExp(`^${pattern}$`);
    return regex.test(route);
  });
}

/**
 * Check if user can access own data
 */
export function canAccessOwnData(role: UserRole, resource: string): boolean {
  return hasPermission(role, `${resource}:view_own` as Permission);
}

/**
 * Check if user can access all data
 */
export function canAccessAllData(role: UserRole, resource: string): boolean {
  return hasPermission(role, `${resource}:view` as Permission);
}

// ============================================
// Role Labels (for UI)
// ============================================
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  instructor: 'Professor',
  student: 'Aluno',
  guardian: 'Responsavel',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acesso completo ao sistema',
  instructor: 'Gerenciar aulas e alunos',
  student: 'Visualizar dados pessoais',
  guardian: 'Acompanhar filhos',
};
