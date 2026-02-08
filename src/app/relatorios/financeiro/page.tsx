'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { FinancialReportDashboard } from '@/components/features/financial-reports/FinancialReportDashboard';

export default function RelatorioFinanceiroPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <FinancialReportDashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
