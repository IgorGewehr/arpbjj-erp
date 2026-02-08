'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { BillingRemindersDashboard } from '@/components/features/billing/BillingRemindersDashboard';

export default function CobrancaPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <BillingRemindersDashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
