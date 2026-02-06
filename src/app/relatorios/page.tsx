'use client';

import { useState, useMemo, useCallback } from 'react';
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Award,
  ClipboardCheck,
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAllStudents, useFinancial, useClasses, useStore } from '@/hooks';
import { useAcademy } from '@/contexts/AcademyContext';
import { createAttendanceService } from '@/services';
import { useQuery } from '@tanstack/react-query';
import { BeltColor, KidsBeltColor, StudentCategory } from '@/types';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, subDays, format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// Constants - Adult Belts
// ============================================
const BELT_COLORS: Record<BeltColor, string> = {
  white: '#e5e5e5',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  brown: '#92400e',
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
// Constants - Kids Belts
// ============================================
const KIDS_BELT_COLORS: Record<KidsBeltColor, string> = {
  white: '#e5e5e5',
  grey: '#6b7280',
  'grey-white': '#6b7280',
  'grey-black': '#6b7280',
  yellow: '#eab308',
  'yellow-white': '#eab308',
  'yellow-black': '#eab308',
  orange: '#f97316',
  'orange-white': '#f97316',
  'orange-black': '#f97316',
  green: '#22c55e',
  'green-white': '#22c55e',
  'green-black': '#22c55e',
};

const KIDS_BELT_LABELS: Record<KidsBeltColor, string> = {
  white: 'Branca',
  grey: 'Cinza',
  'grey-white': 'Cinza/Branca',
  'grey-black': 'Cinza/Preta',
  yellow: 'Amarela',
  'yellow-white': 'Amarela/Branca',
  'yellow-black': 'Amarela/Preta',
  orange: 'Laranja',
  'orange-white': 'Laranja/Branca',
  'orange-black': 'Laranja/Preta',
  green: 'Verde',
  'green-white': 'Verde/Branca',
  'green-black': 'Verde/Preta',
};

// ============================================
// Stat Card Component - Minimalist Design
// ============================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, trend, loading }: StatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.200',
        boxShadow: 'none',
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: 'grey.300',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight={500}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mb: 0.5 }}
            >
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={60} height={36} />
            ) : (
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.75rem' },
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {value}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: { xs: 1, sm: 1.25 },
              borderRadius: 1.5,
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={20} color="#374151" />
          </Box>
        </Box>
        {trend !== undefined && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1.5,
              pt: 1.5,
              borderTop: 1,
              borderColor: 'grey.100',
            }}
          >
            {trend >= 0 ? (
              <TrendingUp size={14} color="#22c55e" />
            ) : (
              <TrendingDown size={14} color="#ef4444" />
            )}
            <Typography
              variant="caption"
              fontWeight={500}
              sx={{ color: trend >= 0 ? '#22c55e' : '#ef4444' }}
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
function ChartSkeleton({ height = 280 }: { height?: number }) {
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
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        height: '100%',
        border: '1px solid',
        borderColor: 'grey.200',
        boxShadow: 'none',
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
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
// Custom Tooltip for Charts
// ============================================
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;

  return (
    <Paper sx={{ p: 1.5, borderRadius: 1.5, boxShadow: 2, minWidth: 120 }}>
      <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
        {label}
      </Typography>
      {payload.map((entry, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
          <Typography variant="caption" color="text.secondary">
            {entry.name}: <strong>{entry.value}</strong>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ============================================
// Belt Distribution Donut Chart
// ============================================
interface BeltChartProps {
  title: string;
  data: Array<{ belt: string; label: string; count: number; color: string }>;
  loading?: boolean;
  emptyMessage?: string;
}

function BeltDonutChart({ title, data, loading, emptyMessage = 'Nenhum aluno' }: BeltChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const filteredData = data.filter(d => d.count > 0);

  return (
    <ChartPaper title={title} subtitle={`${total} aluno${total !== 1 ? 's' : ''}`}>
      {loading ? (
        <ChartSkeleton height={220} />
      ) : total === 0 ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
          <Typography color="text.secondary" variant="body2">{emptyMessage}</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: { xs: '100%', sm: 180 }, height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={filteredData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <Paper sx={{ p: 1, borderRadius: 1, boxShadow: 2 }}>
                        <Typography variant="caption" fontWeight={600}>
                          {data.label}: {data.count}
                        </Typography>
                      </Paper>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            {data.map((item) => (
              <Box
                key={item.belt}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  minWidth: 80,
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 0.5,
                    bgcolor: item.color,
                    border: item.belt === 'white' ? '1px solid #d1d5db' : 'none',
                  }}
                />
                <Typography variant="caption" fontWeight={500}>
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </ChartPaper>
  );
}

// ============================================
// Attendance Report Tab
// ============================================
interface ReportProps {
  classFilter: string;
  categoryFilter: StudentCategory | '';
  classes: Array<{ id: string; name: string; studentIds: string[] }>;
  selectedMonth: Date;
}

function AttendanceReport({ classFilter, categoryFilter, classes, selectedMonth }: ReportProps) {
  const { academyId } = useAcademy();
  const { students: allStudents, isLoading: isLoadingStudents } = useAllStudents();

  // Create attendance service
  const attendanceService = useMemo(() =>
    academyId ? createAttendanceService(academyId) : null,
    [academyId]
  );

  // Calculate date ranges
  const dateRanges = useMemo(() => {
    const now = new Date();
    return {
      todayStart: startOfDay(now),
      todayEnd: endOfDay(now),
      weekStart: startOfWeek(now, { weekStartsOn: 1 }), // Monday
      monthStart: startOfMonth(now),
      last30DaysStart: startOfDay(subDays(now, 29)), // 30 days including today
    };
  }, []);

  // Fetch today's attendance
  const { data: todayAttendance = [], isLoading: isLoadingToday } = useQuery({
    queryKey: ['attendanceReport', 'today', academyId, classFilter],
    queryFn: async () => {
      if (!attendanceService) return [];
      const attendance = await attendanceService.getByDateRange(
        dateRanges.todayStart,
        dateRanges.todayEnd,
        classFilter ? { classId: classFilter } : undefined
      );
      return attendance;
    },
    enabled: !!attendanceService,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch this week's attendance
  const { data: weekAttendance = [], isLoading: isLoadingWeek } = useQuery({
    queryKey: ['attendanceReport', 'week', academyId, classFilter],
    queryFn: async () => {
      if (!attendanceService) return [];
      const attendance = await attendanceService.getByDateRange(
        dateRanges.weekStart,
        dateRanges.todayEnd,
        classFilter ? { classId: classFilter } : undefined
      );
      return attendance;
    },
    enabled: !!attendanceService,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch this month's attendance
  const { data: monthAttendance = [], isLoading: isLoadingMonth } = useQuery({
    queryKey: ['attendanceReport', 'month', academyId, classFilter],
    queryFn: async () => {
      if (!attendanceService) return [];
      const attendance = await attendanceService.getByDateRange(
        dateRanges.monthStart,
        dateRanges.todayEnd,
        classFilter ? { classId: classFilter } : undefined
      );
      return attendance;
    },
    enabled: !!attendanceService,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch last 30 days attendance for chart
  const { data: last30DaysAttendance = [], isLoading: isLoadingChart } = useQuery({
    queryKey: ['attendanceReport', 'last30days', academyId, classFilter],
    queryFn: async () => {
      if (!attendanceService) return [];
      const attendance = await attendanceService.getByDateRange(
        dateRanges.last30DaysStart,
        dateRanges.todayEnd,
        classFilter ? { classId: classFilter } : undefined
      );
      return attendance;
    },
    enabled: !!attendanceService,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = isLoadingStudents || isLoadingToday || isLoadingWeek || isLoadingMonth || isLoadingChart;

  // Filter students by class and category
  const students = useMemo(() => {
    let filtered = allStudents || [];

    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        filtered = filtered.filter(s => selectedClass.studentIds?.includes(s.id));
      }
    }

    if (categoryFilter) {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    return filtered;
  }, [allStudents, classFilter, categoryFilter, classes]);

  // Filter attendance by category if needed
  const filterAttendanceByCategory = (attendance: typeof todayAttendance) => {
    if (!categoryFilter) return attendance;

    const studentIdsOfCategory = new Set(
      (allStudents || [])
        .filter(s => s.category === categoryFilter)
        .map(s => s.id)
    );

    return attendance.filter(a => studentIdsOfCategory.has(a.studentId));
  };

  // Separate belt distributions
  const adultBeltData = useMemo(() => {
    const belts: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];
    const adultStudents = students?.filter(s => s.category === 'adult') || [];
    return belts.map((belt) => ({
      belt,
      label: BELT_LABELS[belt],
      count: adultStudents.filter((s) => s.currentBelt === belt).length,
      color: BELT_COLORS[belt],
    }));
  }, [students]);

  const kidsBeltData = useMemo(() => {
    const belts: KidsBeltColor[] = ['white', 'grey', 'yellow', 'orange', 'green'];
    const kidsStudents = students?.filter(s => s.category === 'kids') || [];
    return belts.map((belt) => ({
      belt,
      label: KIDS_BELT_LABELS[belt],
      count: kidsStudents.filter((s) => s.currentBelt === belt).length,
      color: KIDS_BELT_COLORS[belt],
    }));
  }, [students]);

  // Stats - now using real data
  const extendedStats = useMemo(() => {
    const filteredToday = filterAttendanceByCategory(todayAttendance);
    const filteredWeek = filterAttendanceByCategory(weekAttendance);
    const filteredMonth = filterAttendanceByCategory(monthAttendance);

    // Calculate unique students who attended this month
    const uniqueStudentsThisMonth = new Set(filteredMonth.map(a => a.studentId)).size;
    const totalActiveStudents = students.filter(s => s.status === 'active').length;

    // Calculate attendance rate based on unique students who attended
    const attendanceRate = totalActiveStudents > 0
      ? Math.round((uniqueStudentsThisMonth / totalActiveStudents) * 100)
      : 0;

    return {
      today: filteredToday.length,
      week: filteredWeek.length,
      month: filteredMonth.length,
      averageRate: attendanceRate,
    };
  }, [todayAttendance, weekAttendance, monthAttendance, students, categoryFilter, allStudents]);

  // Count by category
  const categoryCount = useMemo(() => ({
    adults: students?.filter(s => s.category === 'adult').length || 0,
    kids: students?.filter(s => s.category === 'kids').length || 0,
  }), [students]);

  // Chart data - group attendance by day for last 30 days
  const chartData = useMemo(() => {
    const filteredAttendance = filterAttendanceByCategory(last30DaysAttendance);

    // Create a map of day -> count
    const attendanceByDay: Record<string, number> = {};

    // Initialize all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const key = format(date, 'yyyy-MM-dd');
      attendanceByDay[key] = 0;
    }

    // Count attendance per day
    filteredAttendance.forEach(a => {
      const key = format(new Date(a.date), 'yyyy-MM-dd');
      if (attendanceByDay[key] !== undefined) {
        attendanceByDay[key]++;
      }
    });

    // Convert to array for chart
    return Object.entries(attendanceByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, count]) => ({
        name: format(new Date(dateStr), 'dd/MM', { locale: ptBR }),
        fullDate: format(new Date(dateStr), "EEEE, d 'de' MMMM", { locale: ptBR }),
        presencas: count,
      }));
  }, [last30DaysAttendance, categoryFilter, allStudents]);

  return (
    <Box>
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        {/* Stats Row */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Presencas Hoje"
            value={extendedStats.today}
            icon={ClipboardCheck}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Presencas Semana"
            value={extendedStats.week}
            icon={Calendar}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Presencas Mes"
            value={extendedStats.month}
            icon={BarChart3}
            loading={isLoading}
            trend={8}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Taxa Media"
            value={`${extendedStats.averageRate}%`}
            icon={TrendingUp}
            loading={isLoading}
          />
        </Grid>

        {/* Main Chart - Attendance Trend */}
        <Grid size={{ xs: 12 }}>
          <ChartPaper title="Evolucao de Presencas" subtitle="Ultimos 30 dias">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <Box sx={{ width: '100%', height: { xs: 200, sm: 280 } }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPresenca" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <Paper sx={{ p: 1.5, borderRadius: 1.5, boxShadow: 2, minWidth: 120 }}>
                            <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'capitalize' }}>
                              {data.fullDate}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                              <Typography variant="caption" color="text.secondary">
                                Presenças: <strong>{data.presencas}</strong>
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="presencas"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorPresenca)"
                      name="Presencas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Belt Distribution - Adults */}
        {(categoryFilter === '' || categoryFilter === 'adult') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <BeltDonutChart
              title="Distribuicao - Adultos"
              data={adultBeltData}
              loading={isLoading}
              emptyMessage="Nenhum aluno adulto"
            />
          </Grid>
        )}

        {/* Belt Distribution - Kids */}
        {(categoryFilter === '' || categoryFilter === 'kids') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <BeltDonutChart
              title="Distribuicao - Kids"
              data={kidsBeltData}
              loading={isLoading}
              emptyMessage="Nenhum aluno kids"
            />
          </Grid>
        )}

        {/* Summary Cards */}
        <Grid size={{ xs: 12 }}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              boxShadow: 'none',
            }}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              Resumo de Alunos
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {(categoryCount.adults + categoryCount.kids)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {categoryCount.adults}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Adultos</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {categoryCount.kids}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Kids</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {extendedStats.averageRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Frequencia</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ============================================
// Financial Report Tab
// ============================================
function FinancialReport({ classFilter, categoryFilter, classes, selectedMonth }: ReportProps) {
  const { stats, financials: allFinancials, pendingPayments: allPendingPayments, overduePayments: allOverduePayments, isLoading } = useFinancial();
  const { students: allStudents } = useAllStudents();
  const { orders: allOrders, isLoadingOrders } = useStore();

  // Get student IDs filtered by category
  const filteredStudentIds = useMemo(() => {
    let filtered = allStudents || [];

    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        filtered = filtered.filter(s => selectedClass.studentIds?.includes(s.id));
      }
    }

    if (categoryFilter) {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    return new Set(filtered.map(s => s.id));
  }, [allStudents, classFilter, categoryFilter, classes]);

  // Filter financials
  const financials = useMemo(() => {
    if (!classFilter && !categoryFilter) return allFinancials;
    return allFinancials.filter(f => filteredStudentIds.has(f.studentId));
  }, [allFinancials, classFilter, categoryFilter, filteredStudentIds]);

  const pendingPayments = useMemo(() => {
    if (!classFilter && !categoryFilter) return allPendingPayments;
    return allPendingPayments.filter(f => filteredStudentIds.has(f.studentId));
  }, [allPendingPayments, classFilter, categoryFilter, filteredStudentIds]);

  const overduePayments = useMemo(() => {
    if (!classFilter && !categoryFilter) return allOverduePayments;
    return allOverduePayments.filter(f => filteredStudentIds.has(f.studentId));
  }, [allOverduePayments, classFilter, categoryFilter, filteredStudentIds]);

  // Store data for selected month
  const storeStats = useMemo(() => {
    if (!allOrders) return { revenue: 0, paidCount: 0, pending: 0, pendingCount: 0 };

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

    const monthOrders = allOrders.filter(o => {
      const date = o.paidAt ? new Date(o.paidAt) : new Date(o.createdAt);
      return date >= monthStart && date <= monthEnd;
    });

    let revenue = 0;
    let paidCount = 0;
    let pending = 0;
    let pendingCount = 0;

    for (const order of monthOrders) {
      const isPaid = order.status === 'paid' || order.status === 'preparing' || order.status === 'ready' || order.status === 'delivered';
      // totalAmount is already in reais (not cents)
      const amount = order.totalAmount || 0;
      if (isPaid) {
        revenue += amount;
        paidCount++;
      } else if (order.status === 'pending_payment') {
        pending += amount;
        pendingCount++;
      }
    }

    return { revenue, paidCount, pending, pendingCount };
  }, [allOrders, selectedMonth]);

  const hasStore = storeStats.revenue > 0 || storeStats.paidCount > 0 || storeStats.pendingCount > 0;
  const combinedRevenue = (stats?.paidAmount || 0) + storeStats.revenue;
  const combinedPending = (stats?.totalPending || 0) + storeStats.pending;

  // Payment distribution
  const paymentDistribution = useMemo(() => {
    if (!financials) return [];
    const paid = financials.filter((p) => p.status === 'paid').length;
    const pending = pendingPayments.length;
    const overdue = overduePayments.length;
    const storeItems = storeStats.paidCount;
    const items = [
      { name: 'Pagos', value: paid, color: '#22c55e' },
      { name: 'Pendentes', value: pending, color: '#f59e0b' },
      { name: 'Atrasados', value: overdue, color: '#ef4444' },
    ];
    if (storeItems > 0) {
      items.push({ name: 'Loja', value: storeItems, color: '#3b82f6' });
    }
    return items;
  }, [financials, pendingPayments, overduePayments, storeStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Box>
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        {/* Stats Row */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Receita Total"
            value={formatCurrency(combinedRevenue)}
            subtitle={hasStore ? 'mensalidades + loja' : undefined}
            icon={DollarSign}
            loading={isLoading || isLoadingOrders}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Mensalidades"
            value={formatCurrency(stats?.paidAmount || 0)}
            subtitle={`${stats?.paid || 0} pagamentos`}
            icon={TrendingUp}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Pendente"
            value={formatCurrency(combinedPending)}
            icon={Calendar}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Atrasado"
            value={formatCurrency(stats?.totalOverdue || 0)}
            subtitle={`${stats?.overdueCount || 0} pagamentos`}
            icon={AlertCircle}
            loading={isLoading}
          />
        </Grid>

        {/* Store revenue card (if store has data) */}
        {hasStore && (
          <Grid size={{ xs: 12 }}>
            <Paper
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: '#eff6ff', display: 'flex' }}>
                  <ShoppingBag size={20} color="#3b82f6" />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={600}>Loja</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {storeStats.paidCount} pedido{storeStats.paidCount !== 1 ? 's' : ''} pago{storeStats.paidCount !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">Recebido</Typography>
                  <Typography variant="body2" fontWeight={700} color="#22c55e">
                    {formatCurrency(storeStats.revenue)}
                  </Typography>
                </Box>
                {storeStats.pendingCount > 0 && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Pendente</Typography>
                    <Typography variant="body2" fontWeight={700} color="#f59e0b">
                      {formatCurrency(storeStats.pending)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Revenue Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <ChartPaper title="Evolucao Financeira" subtitle="Ultimos 6 meses">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <Box sx={{ width: '100%', height: { xs: 200, sm: 280 } }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={[{ name: 'Sem dados', receita: 0 }]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      tickFormatter={(v) => `R$${v / 1000}k`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#colorReceita)"
                      name="Receita"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                O grafico sera preenchido conforme os pagamentos forem registrados
              </Typography>
            </Box>
          </ChartPaper>
        </Grid>

        {/* Payment Distribution */}
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartPaper title="Status de Pagamentos" subtitle="Distribuicao atual">
            {isLoading ? (
              <ChartSkeleton height={200} />
            ) : (
              <Box>
                <Box sx={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={paymentDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {paymentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {paymentDistribution.map((item) => (
                    <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="caption">
                        {item.name}: <strong>{item.value}</strong>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </ChartPaper>
        </Grid>

        {/* Overdue Payments Table */}
        <Grid size={{ xs: 12 }}>
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              boxShadow: 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                  Pagamentos Atrasados
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {overduePayments.length} pagamento{overduePayments.length !== 1 ? 's' : ''} em atraso
                </Typography>
              </Box>
              {overduePayments.length > 5 && (
                <Chip label={`Ver todos (${overduePayments.length})`} size="small" variant="outlined" />
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
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Vencimento</TableCell>
                      <TableCell>Dias</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overduePayments.slice(0, 5).map((payment) => {
                      const daysOverdue = Math.floor(
                        (new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <TableRow key={payment.id} hover>
                          <TableCell>{payment.studentName || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${daysOverdue}d`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                bgcolor: daysOverdue > 30 ? '#fef2f2' : '#fffbeb',
                                color: daysOverdue > 30 ? '#dc2626' : '#d97706',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {overduePayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
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
function StudentsReport({ classFilter, categoryFilter, classes, selectedMonth }: ReportProps) {
  const { students: allStudents, isLoading } = useAllStudents();

  // Filter students
  const students = useMemo(() => {
    let filtered = allStudents || [];

    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        filtered = filtered.filter(s => selectedClass.studentIds?.includes(s.id));
      }
    }

    if (categoryFilter) {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    return filtered;
  }, [allStudents, classFilter, categoryFilter, classes]);

  // Stats
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

  // Belt distributions
  const adultBeltData = useMemo(() => {
    const belts: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];
    const adultStudents = students?.filter(s => s.category === 'adult') || [];
    return belts.map((belt) => ({
      belt,
      label: BELT_LABELS[belt],
      count: adultStudents.filter((s) => s.currentBelt === belt).length,
      color: BELT_COLORS[belt],
    }));
  }, [students]);

  const kidsBeltData = useMemo(() => {
    const belts: KidsBeltColor[] = ['white', 'grey', 'yellow', 'orange', 'green'];
    const kidsStudents = students?.filter(s => s.category === 'kids') || [];
    return belts.map((belt) => ({
      belt,
      label: KIDS_BELT_LABELS[belt],
      count: kidsStudents.filter((s) => s.currentBelt === belt).length,
      color: KIDS_BELT_COLORS[belt],
    }));
  }, [students]);

  return (
    <Box>
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        {/* Stats Row */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Total de Alunos"
            value={studentStats.total}
            icon={Users}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Alunos Ativos"
            value={studentStats.active}
            subtitle={`${((studentStats.active / studentStats.total) * 100 || 0).toFixed(0)}% do total`}
            icon={Users}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Novos este Mes"
            value={studentStats.newThisMonth}
            icon={TrendingUp}
            loading={isLoading}
            trend={15}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <StatCard
            title="Kids / Adultos"
            value={`${studentStats.kids} / ${studentStats.adults}`}
            icon={Award}
            loading={isLoading}
          />
        </Grid>

        {/* Growth Chart */}
        <Grid size={{ xs: 12 }}>
          <ChartPaper title="Evolucao de Matriculas" subtitle="Crescimento mensal">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <Box sx={{ width: '100%', height: { xs: 200, sm: 280 } }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={[{ name: 'Sem dados', total: 0 }]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#colorTotal)"
                      name="Alunos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                O grafico sera preenchido conforme os alunos forem cadastrados
              </Typography>
            </Box>
          </ChartPaper>
        </Grid>

        {/* Belt Distribution - Adults */}
        {(categoryFilter === '' || categoryFilter === 'adult') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <BeltDonutChart
              title="Faixas - Adultos"
              data={adultBeltData}
              loading={isLoading}
              emptyMessage="Nenhum aluno adulto"
            />
          </Grid>
        )}

        {/* Belt Distribution - Kids */}
        {(categoryFilter === '' || categoryFilter === 'kids') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <BeltDonutChart
              title="Faixas - Kids"
              data={kidsBeltData}
              loading={isLoading}
              emptyMessage="Nenhum aluno kids"
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ============================================
// Main Component
// ============================================
export default function RelatoriosPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [classFilter, setClassFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StudentCategory | ''>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { classes } = useClasses();

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const displayMonth = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    if (!isCurrentMonth) {
      setSelectedMonth(prev => addMonths(prev, 1));
    }
  }, [isCurrentMonth]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: { xs: 2, sm: 3 },
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Relatorios
              </Typography>
              {/* Month navigation */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={handlePrevMonth} sx={{ p: 0.5 }}>
                  <ChevronLeft size={18} />
                </IconButton>
                <Chip
                  icon={<Calendar size={14} />}
                  label={displayMonth}
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'capitalize',
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    cursor: 'default',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  sx={{ p: 0.5 }}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </Box>
            </Box>

            {/* Filters */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <FormControl size="small" sx={{ minWidth: { xs: 'calc(50% - 4px)', sm: 150 } }}>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={classFilter}
                  label="Turma"
                  onChange={(e) => setClassFilter(e.target.value)}
                  sx={{ borderRadius: 1.5, bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: { xs: 'calc(50% - 4px)', sm: 130 } }}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Categoria"
                  onChange={(e) => setCategoryFilter(e.target.value as StudentCategory | '')}
                  sx={{ borderRadius: 1.5, bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="adult">Adultos</MenuItem>
                  <MenuItem value="kids">Kids</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Tabs */}
          <Paper
            sx={{
              borderRadius: 2,
              mb: { xs: 2, sm: 3 },
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'grey.200',
              boxShadow: 'none',
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              variant={isMobile ? 'scrollable' : 'standard'}
              scrollButtons={isMobile ? 'auto' : false}
              allowScrollButtonsMobile
              sx={{
                '& .MuiTabs-indicator': {
                  height: 2,
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.8rem', sm: '0.9rem' },
                  minHeight: 48,
                  px: { xs: 2, sm: 3 },
                },
              }}
            >
              <Tab label="Presenca" icon={<ClipboardCheck size={18} />} iconPosition="start" />
              <Tab label="Financeiro" icon={<DollarSign size={18} />} iconPosition="start" />
              <Tab label="Alunos" icon={<Users size={18} />} iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          <Box>
            {tabValue === 0 && (
              <AttendanceReport classFilter={classFilter} categoryFilter={categoryFilter} classes={classes} selectedMonth={selectedMonth} />
            )}
            {tabValue === 1 && (
              <FinancialReport classFilter={classFilter} categoryFilter={categoryFilter} classes={classes} selectedMonth={selectedMonth} />
            )}
            {tabValue === 2 && (
              <StudentsReport classFilter={classFilter} categoryFilter={categoryFilter} classes={classes} selectedMonth={selectedMonth} />
            )}
          </Box>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
