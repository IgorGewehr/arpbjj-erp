'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { GraduationDashboard } from '@/components/features/graduation';

export default function GraduacaoPage() {
  return (
    <ProtectedRoute>
      <AppLayout title="Graduacao">
        <GraduationDashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
