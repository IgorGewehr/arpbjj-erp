'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RetentionDashboard } from '@/components/features/retention/RetentionDashboard';

export default function RetencaoPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RetentionDashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
