'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { FinancialDashboard } from '@/components/features/financial';

export default function FinanceiroPage() {
  return (
    <ProtectedRoute>
      <AppLayout title="Financeiro">
        <FinancialDashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
