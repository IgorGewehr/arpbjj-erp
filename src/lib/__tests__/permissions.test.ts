import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasEffectivePermission,
  GRANTABLE_EXTRA_PERMISSIONS,
} from '../permissions';

// Tests for the permission helpers — the gate between role-defaults and the
// ad-hoc extras an owner grants to a specific instructor. Catches regressions
// in either direction (extras leaking to wrong roles, or core role perms
// silently breaking).

describe('hasPermission', () => {
  it('admin gets everything in the role bundle', () => {
    expect(hasPermission('admin', 'financial:view')).toBe(true);
    expect(hasPermission('admin', 'settings:manage')).toBe(true);
    expect(hasPermission('admin', 'students:delete')).toBe(true);
  });

  it('instructor does NOT get financial:view by default', () => {
    expect(hasPermission('instructor', 'financial:view')).toBe(false);
  });

  it('instructor has the base classroom permissions', () => {
    expect(hasPermission('instructor', 'attendance:view')).toBe(true);
    expect(hasPermission('instructor', 'attendance:create')).toBe(true);
    expect(hasPermission('instructor', 'classes:view')).toBe(true);
  });

  it('student gets _own variants but not the cross-academy ones', () => {
    expect(hasPermission('student', 'financial:view_own')).toBe(true);
    expect(hasPermission('student', 'financial:view')).toBe(false);
    expect(hasPermission('student', 'students:view')).toBe(false);
  });
});

describe('hasEffectivePermission (role + extras)', () => {
  it('grants role-default permissions without needing extras', () => {
    expect(
      hasEffectivePermission('instructor', undefined, 'attendance:view')
    ).toBe(true);
    expect(hasEffectivePermission('instructor', [], 'attendance:view')).toBe(
      true
    );
  });

  it('grants a permission listed in extras even if not in role defaults', () => {
    expect(
      hasEffectivePermission(
        'instructor',
        ['financial:view'],
        'financial:view'
      )
    ).toBe(true);
  });

  it("does NOT grant permissions that are neither in role nor in extras", () => {
    expect(
      hasEffectivePermission(
        'instructor',
        ['financial:view'],
        'settings:manage'
      )
    ).toBe(false);
  });

  it('treats undefined extras the same as empty array', () => {
    expect(
      hasEffectivePermission('instructor', undefined, 'financial:view')
    ).toBe(false);
  });

  it('admin extras (if any) never broaden anything because admin has all', () => {
    expect(
      hasEffectivePermission('admin', ['financial:view'], 'financial:view')
    ).toBe(true);
    expect(
      hasEffectivePermission('admin', undefined, 'settings:manage')
    ).toBe(true);
  });
});

describe('GRANTABLE_EXTRA_PERMISSIONS', () => {
  it('does not expose settings management as a grantable extra', () => {
    const perms = GRANTABLE_EXTRA_PERMISSIONS.map((g) => g.permission);
    expect(perms).not.toContain('settings:manage');
    expect(perms).not.toContain('settings:view');
  });

  it('exposes the core financial + students extras the UI relies on', () => {
    const perms = GRANTABLE_EXTRA_PERMISSIONS.map((g) => g.permission);
    expect(perms).toContain('financial:view');
    expect(perms).toContain('financial:create');
    expect(perms).toContain('students:create');
    expect(perms).toContain('students:delete');
  });

  it('every grantable item has a human-readable label and description', () => {
    for (const g of GRANTABLE_EXTRA_PERMISSIONS) {
      expect(g.label.length).toBeGreaterThan(0);
      expect(g.description.length).toBeGreaterThan(0);
    }
  });
});
