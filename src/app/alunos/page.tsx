'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { StudentList } from '@/components/features/students';

export default function AlunosPage() {
  return (
    <ProtectedRoute>
      <AppLayout title="Alunos">
        <StudentList />
      </AppLayout>
    </ProtectedRoute>
  );
}
