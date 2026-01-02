'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DashboardView } from '@/components/features/dashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout title="Dashboard">
        <DashboardView />
      </AppLayout>
    </ProtectedRoute>
  );
}
