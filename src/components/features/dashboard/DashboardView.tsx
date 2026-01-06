'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Grid, Paper, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import {
  Users,
  CheckCircle,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers';
import { useFinancial } from '@/hooks';
import { studentService } from '@/services';
import { StatCard } from './StatCard';
import { QuickActions } from './QuickActions';
import { AttendanceChart } from './AttendanceChart';
import { RevenueOverview } from './RevenueOverview';
import { AlertsPanel } from './AlertsPanel';
import { QuickStudentDialog } from './QuickStudentDialog';
import { FadeIn, SlideIn } from '@/components/common/AnimatedComponents';
import { StatsCardSkeleton } from '@/components/common/SkeletonComponents';
import { MobileStatsCarousel } from './MobileStatsCarousel';
import { MobileQuickActions } from './MobileQuickActions';

// ============================================
// DashboardView Component
// ============================================
export function DashboardView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { user } = useAuth();

  // Fetch student stats directly (not paginated)
  const { data: studentStats, isLoading: loadingStudents, refetch: refreshStudents } = useQuery({
    queryKey: ['dashboard-student-stats'],
    queryFn: () => studentService.getDashboardStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
    <FadeIn>
      <Box>
        {/* Header */}
        <SlideIn direction="down">
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
        </SlideIn>

        {/* Mobile Layout */}
        {isMobile ? (
          <>
            {/* Mobile Quick Actions */}
            <MobileQuickActions onAction={handleQuickAction} />

            {/* Mobile Stats Carousel */}
            {isLoading ? (
              <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Skeleton variant="rounded" width="85%" height={140} sx={{ borderRadius: 3 }} />
              </Box>
            ) : (
              <MobileStatsCarousel
                activeStudents={studentStats?.byStatus.active || 0}
                totalStudents={studentStats?.total || 0}
                monthlyRevenue={monthlySummary?.paidAmount || 0}
                paidCount={monthlySummary?.paid || 0}
                pendingCount={pendingPayments.length}
                overdueCount={overduePayments.length}
              />
            )}

            {/* Mobile Content */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Revenue Overview - Compact */}
              <RevenueOverview
                paidAmount={monthlySummary?.paidAmount || 0}
                pendingAmount={monthlySummary?.pendingAmount || 0}
                overdueAmount={monthlySummary?.overdueAmount || 0}
                paidCount={monthlySummary?.paid || 0}
                pendingCount={monthlySummary?.pending || 0}
                overdueCount={monthlySummary?.overdue || 0}
                isLoading={loadingFinancial}
              />

              {/* Alerts - Compact */}
              <AlertsPanel
                overduePayments={overduePayments}
                onViewOverdue={() => router.push('/financeiro')}
              />

              {/* Attendance Chart */}
              <AttendanceChart />
            </Box>
          </>
        ) : (
          <>
            {/* Desktop Stats Grid */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                {isLoading ? (
                  <StatsCardSkeleton />
                ) : (
                  <SlideIn direction="up" delay={0.1}>
                    <StatCard
                      title="Alunos Ativos"
                      value={studentStats?.byStatus.active || 0}
                      subtitle={`de ${studentStats?.total || 0} total`}
                      icon={Users}
                      color="#1a1a1a"
                      bgColor="#f5f5f5"
                    />
                  </SlideIn>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                {isLoading ? (
                  <StatsCardSkeleton />
                ) : (
                  <SlideIn direction="up" delay={0.2}>
                    <StatCard
                      title="Receita do Mes"
                      value={`R$ ${(monthlySummary?.paidAmount || 0).toLocaleString('pt-BR')}`}
                      subtitle={`${monthlySummary?.paid || 0} pagamentos`}
                      icon={DollarSign}
                      color="#1a1a1a"
                      bgColor="#f5f5f5"
                    />
                  </SlideIn>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
                {isLoading ? (
                  <StatsCardSkeleton />
                ) : (
                  <SlideIn direction="up" delay={0.3}>
                    <StatCard
                      title="Pendencias"
                      value={pendingPayments.length + overduePayments.length}
                      subtitle={`${overduePayments.length} vencidas`}
                      icon={AlertTriangle}
                      color="#1a1a1a"
                      bgColor="#f5f5f5"
                    />
                  </SlideIn>
                )}
              </Grid>
            </Grid>

            {/* Desktop Main Content Grid */}
            <SlideIn direction="up" delay={0.4}>
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
            </SlideIn>
          </>
        )}

        {/* Quick Student Dialog */}
        <QuickStudentDialog
          open={quickStudentOpen}
          onClose={() => setQuickStudentOpen(false)}
          onSuccess={handleQuickStudentSuccess}
        />
      </Box>
    </FadeIn>
  );
}

export default DashboardView;
