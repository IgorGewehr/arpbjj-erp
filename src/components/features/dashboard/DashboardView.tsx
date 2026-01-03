'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Grid, Paper, Skeleton } from '@mui/material';
import {
  Users,
  CheckCircle,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers';
import { useStudents, useFinancial } from '@/hooks';
import { StatCard } from './StatCard';
import { QuickActions } from './QuickActions';
import { AttendanceChart } from './AttendanceChart';
import { RevenueOverview } from './RevenueOverview';
import { AlertsPanel } from './AlertsPanel';
import { QuickStudentDialog } from './QuickStudentDialog';

// ============================================
// DashboardView Component
// ============================================
export function DashboardView() {
  const router = useRouter();
  const { user } = useAuth();
  const { students, stats: studentStats, isLoading: loadingStudents, refresh: refreshStudents } = useStudents();
  const { pendingPayments, overduePayments, monthlySummary, isLoading: loadingFinancial } = useFinancial();

  // Quick student dialog state
  const [quickStudentOpen, setQuickStudentOpen] = useState(false);

  // ============================================
  // Greeting based on time
  // ============================================
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // ============================================
  // Today's date formatted
  // ============================================
  const todayFormatted = useMemo(() => {
    return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  }, []);

  // ============================================
  // Quick actions handlers
  // ============================================
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'attendance':
        router.push('/chamada');
        break;
      case 'newStudent':
        setQuickStudentOpen(true);
        break;
      case 'financial':
        router.push('/financeiro');
        break;
      case 'reports':
        router.push('/relatorios');
        break;
    }
  }, [router]);

  const handleQuickStudentSuccess = useCallback(() => {
    refreshStudents();
  }, [refreshStudents]);

  // ============================================
  // Loading state
  // ============================================
  const isLoading = loadingStudents || loadingFinancial;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
        >
          {greeting}, {user?.displayName?.split(' ')[0] || 'Professor'}!
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textTransform: 'capitalize', fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          {todayFormatted}
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          {isLoading ? (
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="Alunos Ativos"
              value={studentStats.byStatus.active}
              subtitle={`de ${studentStats.total} total`}
              icon={Users}
              color="#1a1a1a"
              bgColor="#f5f5f5"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          {isLoading ? (
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="Receita do Mes"
              value={`R$ ${(monthlySummary?.paidAmount || 0).toLocaleString('pt-BR')}`}
              subtitle={`${monthlySummary?.paid || 0} pagamentos`}
              icon={DollarSign}
              color="#1a1a1a"
              bgColor="#f5f5f5"
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          {isLoading ? (
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ) : (
            <StatCard
              title="Pendencias"
              value={pendingPayments.length + overduePayments.length}
              subtitle={`${overduePayments.length} vencidas`}
              icon={AlertTriangle}
              color="#1a1a1a"
              bgColor="#f5f5f5"
            />
          )}
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Column: Quick Actions + Attendance Chart */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
            <QuickActions onAction={handleQuickAction} />
            <AttendanceChart />
          </Box>
        </Grid>

        {/* Center Column: Revenue Overview */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <RevenueOverview
            paidAmount={monthlySummary?.paidAmount || 0}
            pendingAmount={monthlySummary?.pendingAmount || 0}
            overdueAmount={monthlySummary?.overdueAmount || 0}
            paidCount={monthlySummary?.paid || 0}
            pendingCount={monthlySummary?.pending || 0}
            overdueCount={monthlySummary?.overdue || 0}
            isLoading={loadingFinancial}
          />
        </Grid>

        {/* Right Column: Alerts */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <AlertsPanel
            overduePayments={overduePayments}
            onViewOverdue={() => router.push('/financeiro')}
          />
        </Grid>
      </Grid>

      {/* Quick Student Dialog */}
      <QuickStudentDialog
        open={quickStudentOpen}
        onClose={() => setQuickStudentOpen(false)}
        onSuccess={handleQuickStudentSuccess}
      />
    </Box>
  );
}

export default DashboardView;
