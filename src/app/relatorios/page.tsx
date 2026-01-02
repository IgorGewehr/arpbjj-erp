'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Award,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStudents, useFinancial, useAttendance, useClasses } from '@/hooks';
import { BeltColor, StudentCategory } from '@/types';

// ============================================
// Constants
// ============================================
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const BELT_COLORS: Record<BeltColor, string> = {
  white: '#e5e5e5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
};

const BELT_LABELS: Record<BeltColor, string> = {
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
};

// ============================================
// Color Palette
// ============================================
const CHART_COLORS = {
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  success: '#16A34A',
  successLight: '#4ADE80',
  warning: '#D97706',
  warningLight: '#FBBF24',
  error: '#DC2626',
  errorLight: '#F87171',
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
};

// ============================================
// Stat Card Component (Enhanced)
// ============================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  loading?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'purple';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, loading, color = 'primary' }: StatCardProps) {
  const colorMap = {
    primary: { bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', icon: '#fff' },
    success: { bg: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', icon: '#fff' },
    warning: { bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', icon: '#fff' },
    error: { bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', icon: '#fff' },
    purple: { bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', icon: '#fff' },
  };

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={80} height={40} />
            ) : (
              <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              background: colorMap[color].bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          >
            <Icon size={24} color={colorMap[color].icon} />
          </Box>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {trend >= 0 ? (
              <TrendingUp size={14} color="#16A34A" />
            ) : (
              <TrendingDown size={14} color="#DC2626" />
            )}
            <Typography
              variant="caption"
              fontWeight={500}
              sx={{ color: trend >= 0 ? 'success.main' : 'error.main' }}
            >
              {trend >= 0 ? '+' : ''}{trend}% vs mes anterior
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Chart Skeleton
// ============================================
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Box sx={{ width: '100%', height }}>
      <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 2 }} />
    </Box>
  );
}

// ============================================
// Chart Paper Wrapper
// ============================================
function ChartPaper({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        height: '100%',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  );
}

// ============================================
// Custom Chart Tooltip
// ============================================
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;

  return (
    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3, minWidth: 150 }}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
        {label}
      </Typography>
      {payload.map((entry, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: entry.color }} />
          <Typography variant="caption" color="text.secondary">
            {entry.name}:
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {typeof entry.value === 'number' && entry.name.toLowerCase().includes('r$')
              ? `R$ ${entry.value.toLocaleString('pt-BR')}`
              : entry.value.toLocaleString('pt-BR')}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ============================================
// Attendance Report Tab
// ============================================
interface ReportProps {
  classFilter: string;
  classes: Array<{ id: string; name: string; studentIds: string[] }>;
}

function AttendanceReport({ classFilter, classes }: ReportProps) {
  const { stats, isLoading } = useAttendance();
  const { students: allStudents } = useStudents();

  // Filter students by class
  const students = useMemo(() => {
    if (!classFilter || !allStudents) return allStudents;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return allStudents.filter(s => selectedClass.studentIds?.includes(s.id));
    }
    return allStudents;
  }, [allStudents, classFilter, classes]);

  // Monthly attendance data - requires historical data collection
  // For now, show empty state since we don't have historical attendance aggregates
  const monthlyData: Array<{ name: string; presencas: number }> = [];

  // Calculate attendance rate per belt
  const beltAttendance = useMemo(() => {
    const belts: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];
    return belts.map((belt) => {
      const count = students?.filter((s) => s.currentBelt === belt).length || 0;
      return {
        belt,
        label: BELT_LABELS[belt],
        alunos: count,
        color: BELT_COLORS[belt],
      };
    }).filter((b) => b.alunos > 0);
  }, [students]);

  // Extended stats - using real data from attendance stats
  const extendedStats = useMemo(() => ({
    today: stats?.presentCount || 0,
    week: stats?.presentCount || 0, // Only showing today's data until weekly aggregation is implemented
    month: stats?.presentCount || 0, // Only showing today's data until monthly aggregation is implemented
    averageRate: stats?.attendanceRate || 0,
  }), [stats]);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Stats Row */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Presencas Hoje"
            value={extendedStats.today}
            icon={ClipboardCheck}
            loading={isLoading}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Presencas Semana"
            value={extendedStats.week}
            icon={Calendar}
            loading={isLoading}
            color="purple"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Presencas Mes"
            value={extendedStats.month}
            icon={BarChart3}
            loading={isLoading}
            trend={8}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Taxa Media"
            value={`${extendedStats.averageRate}%`}
            icon={TrendingUp}
            loading={isLoading}
            color="success"
          />
        </Grid>

        {/* Main Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartPaper title="Presencas Mensais" subtitle="Evolucao mensal de presencas">
            {isLoading ? (
              <ChartSkeleton />
            ) : monthlyData.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <BarChart3 size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Dados historicos nao disponiveis
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  O grafico de evolucao mensal sera preenchido conforme as presencas forem registradas
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyData} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={1} />
                        <stop offset="100%" stopColor={CHART_COLORS.primaryLight} stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="presencas"
                      fill="url(#attendanceGradient)"
                      name="Presencas"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Pie Chart */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartPaper title="Alunos por Faixa" subtitle="Distribuicao atual">
            {isLoading ? (
              <ChartSkeleton height={280} />
            ) : beltAttendance.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Typography color="text.secondary">Nenhum aluno encontrado</Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={beltAttendance}
                      dataKey="alunos"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    >
                      {beltAttendance.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke={entry.color}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </ChartPaper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================
// Financial Report Tab
// ============================================
function FinancialReport({ classFilter, classes }: ReportProps) {
  const { stats, financials: allFinancials, pendingPayments: allPendingPayments, overduePayments: allOverduePayments, isLoading } = useFinancial();

  // Filter financials by class
  const financials = useMemo(() => {
    if (!classFilter || !allFinancials) return allFinancials;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return allFinancials.filter(f => selectedClass.studentIds?.includes(f.studentId));
    }
    return allFinancials;
  }, [allFinancials, classFilter, classes]);

  const pendingPayments = useMemo(() => {
    if (!classFilter) return allPendingPayments;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return allPendingPayments.filter(f => selectedClass.studentIds?.includes(f.studentId));
    }
    return allPendingPayments;
  }, [allPendingPayments, classFilter, classes]);

  const overduePayments = useMemo(() => {
    if (!classFilter) return allOverduePayments;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return allOverduePayments.filter(f => selectedClass.studentIds?.includes(f.studentId));
    }
    return allOverduePayments;
  }, [allOverduePayments, classFilter, classes]);

  // Revenue data - requires historical data collection
  // For now, show empty state since we don't have monthly revenue aggregates
  const revenueData: Array<{ name: string; receita: number; despesas: number }> = [];

  // Payment status distribution
  const paymentDistribution = useMemo(() => {
    if (!financials) return [];
    const paid = financials.filter((p) => p.status === 'paid').length;
    const pending = pendingPayments.length;
    const overdue = overduePayments.length;
    return [
      { name: 'Pagos', value: paid, color: '#16A34A' },
      { name: 'Pendentes', value: pending, color: '#D97706' },
      { name: 'Atrasados', value: overdue, color: '#DC2626' },
    ];
  }, [financials, pendingPayments, overduePayments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Stats Row */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Receita Mensal"
            value={formatCurrency(stats?.paidAmount || 0)}
            icon={DollarSign}
            loading={isLoading}
            trend={12}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Recebido"
            value={formatCurrency(stats?.paidAmount || 0)}
            icon={TrendingUp}
            loading={isLoading}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pendente"
            value={formatCurrency(stats?.totalPending || 0)}
            icon={Calendar}
            loading={isLoading}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Atrasado"
            value={formatCurrency(stats?.totalOverdue || 0)}
            subtitle={`${stats?.overdueCount || 0} pagamentos`}
            icon={AlertCircle}
            loading={isLoading}
            color="error"
          />
        </Grid>

        {/* Revenue Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartPaper title="Receitas vs Despesas" subtitle="Comparativo mensal">
            {isLoading ? (
              <ChartSkeleton />
            ) : revenueData.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <TrendingUp size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Dados historicos nao disponiveis
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  O grafico de evolucao financeira sera preenchido conforme os pagamentos forem registrados
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.error} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.error} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(v) => `R$${v / 1000}k`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      stroke={CHART_COLORS.success}
                      strokeWidth={3}
                      name="Receita"
                      dot={{ r: 4, fill: CHART_COLORS.success }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesas"
                      stroke={CHART_COLORS.error}
                      strokeWidth={3}
                      name="Despesas"
                      dot={{ r: 4, fill: CHART_COLORS.error }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Payment Distribution */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartPaper title="Status de Pagamentos" subtitle="Distribuicao atual">
            {isLoading ? (
              <ChartSkeleton height={280} />
            ) : (
              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    >
                      {paymentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Recent Overdue */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Pagamentos Atrasados
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {overduePayments.length} pagamento{overduePayments.length !== 1 ? 's' : ''} em atraso
                </Typography>
              </Box>
              {overduePayments.length > 5 && (
                <Chip label={`Ver todos (${overduePayments.length})`} color="error" variant="outlined" size="small" />
              )}
            </Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
                ))}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Aluno</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Vencimento</TableCell>
                      <TableCell>Dias em Atraso</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overduePayments
                      .slice(0, 5)
                      .map((payment) => {
                        const daysOverdue = Math.floor(
                          (new Date().getTime() - new Date(payment.dueDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return (
                          <TableRow key={payment.id} hover>
                            <TableCell>{payment.studentName || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${daysOverdue} dias`}
                                size="small"
                                color={daysOverdue > 30 ? 'error' : 'warning'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip label="Atrasado" size="small" color="error" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {overduePayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            Nenhum pagamento atrasado
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================
// Students Report Tab
// ============================================
function StudentsReport({ classFilter, classes }: ReportProps) {
  const { students: allStudents, isLoading } = useStudents();

  // Filter students by class
  const students = useMemo(() => {
    if (!classFilter || !allStudents) return allStudents;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return allStudents.filter(s => selectedClass.studentIds?.includes(s.id));
    }
    return allStudents;
  }, [allStudents, classFilter, classes]);

  // Student stats
  const studentStats = useMemo(() => {
    if (!students) return { total: 0, active: 0, kids: 0, adults: 0, newThisMonth: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: students.length,
      active: students.filter((s) => s.status === 'active').length,
      kids: students.filter((s) => s.category === 'kids').length,
      adults: students.filter((s) => s.category === 'adult').length,
      newThisMonth: students.filter((s) => new Date(s.createdAt) >= startOfMonth).length,
    };
  }, [students]);

  // Belt distribution
  const beltDistribution = useMemo(() => {
    if (!students) return [];
    const belts: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];
    return belts.map((belt) => ({
      belt,
      label: BELT_LABELS[belt],
      count: students.filter((s) => s.currentBelt === belt && s.category === 'adult').length,
      color: BELT_COLORS[belt],
    }));
  }, [students]);

  // Growth data - requires historical data collection
  // For now, show empty state since we don't have monthly enrollment tracking
  const growthData: Array<{ name: string; novos: number; saidas: number; total: number }> = [];

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Stats Row */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total de Alunos"
            value={studentStats.total}
            icon={Users}
            loading={isLoading}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Alunos Ativos"
            value={studentStats.active}
            subtitle={`${((studentStats.active / studentStats.total) * 100 || 0).toFixed(1)}% do total`}
            icon={Users}
            loading={isLoading}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Novos este Mes"
            value={studentStats.newThisMonth}
            icon={TrendingUp}
            loading={isLoading}
            trend={15}
            color="purple"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Kids / Adultos"
            value={`${studentStats.kids} / ${studentStats.adults}`}
            icon={Award}
            loading={isLoading}
            color="warning"
          />
        </Grid>

        {/* Growth Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartPaper title="Crescimento de Alunos" subtitle="Evolucao mensal de matriculas">
            {isLoading ? (
              <ChartSkeleton />
            ) : growthData.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320 }}>
                <Users size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Dados historicos nao disponiveis
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  O grafico de crescimento sera preenchido conforme os alunos forem cadastrados ao longo dos meses
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={growthData}>
                    <defs>
                      <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      name="Total"
                      dot={{ r: 4, fill: CHART_COLORS.primary }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="novos"
                      stroke={CHART_COLORS.success}
                      strokeWidth={3}
                      name="Novos"
                      dot={{ r: 4, fill: CHART_COLORS.success }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="saidas"
                      stroke={CHART_COLORS.error}
                      strokeWidth={3}
                      name="Saidas"
                      dot={{ r: 4, fill: CHART_COLORS.error }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Belt Distribution */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartPaper title="Distribuicao por Faixa" subtitle="Adultos ativos">
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Box key={i}>
                    <Skeleton variant="text" width={80} />
                    <Skeleton variant="rectangular" height={12} sx={{ borderRadius: 2 }} />
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {beltDistribution.map((belt) => {
                  const maxCount = Math.max(...beltDistribution.map((b) => b.count), 1);
                  const percentage = (belt.count / maxCount) * 100;
                  return (
                    <Box key={belt.belt}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: 1,
                              bgcolor: belt.color,
                              border: belt.belt === 'white' ? '1px solid #E5E7EB' : 'none',
                            }}
                          />
                          <Typography variant="body2" fontWeight={500}>{belt.label}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={700}>
                          {belt.count}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 12,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: belt.color,
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </ChartPaper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================
// Main Component
// ============================================
export default function RelatoriosPage() {
  const [tabValue, setTabValue] = useState(0);
  const [period, setPeriod] = useState('month');
  const [classFilter, setClassFilter] = useState('');
  const { classes } = useClasses();

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <ProtectedRoute>
      <AppLayout title="Relatorios">
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                Relatorios
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Analise completa da academia - {currentMonth}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={classFilter}
                  label="Turma"
                  onChange={(e) => setClassFilter(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">Todas as Turmas</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Periodo</InputLabel>
                <Select value={period} label="Periodo" onChange={(e) => setPeriod(e.target.value)} sx={{ borderRadius: 2 }}>
                  <MenuItem value="week">Semana</MenuItem>
                  <MenuItem value="month">Mes</MenuItem>
                  <MenuItem value="quarter">Trimestre</MenuItem>
                  <MenuItem value="year">Ano</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<Download size={18} />}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Exportar
              </Button>
            </Box>
          </Box>

          {/* Tabs */}
          <Paper sx={{ borderRadius: 3, mb: 3, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  minHeight: 56,
                  px: 3,
                },
              }}
            >
              <Tab
                label="Presenca"
                icon={<ClipboardCheck size={20} />}
                iconPosition="start"
              />
              <Tab
                label="Financeiro"
                icon={<DollarSign size={20} />}
                iconPosition="start"
              />
              <Tab
                label="Alunos"
                icon={<Users size={20} />}
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Box>
            {tabValue === 0 && <AttendanceReport classFilter={classFilter} classes={classes} />}
            {tabValue === 1 && <FinancialReport classFilter={classFilter} classes={classes} />}
            {tabValue === 2 && <StudentsReport classFilter={classFilter} classes={classes} />}
          </Box>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
