'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AttendanceQrManager } from '@/components/features/attendance/AttendanceQrManager';

export default function ChamadaQrPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <AttendanceQrManager />
      </AppLayout>
    </ProtectedRoute>
  );
}
