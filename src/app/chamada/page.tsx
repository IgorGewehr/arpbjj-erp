'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AttendanceGrid } from '@/components/features/attendance';

export default function ChamadaPage() {
  return (
    <ProtectedRoute>
      <AppLayout title="Chamada">
        <AttendanceGrid />
      </AppLayout>
    </ProtectedRoute>
  );
}
