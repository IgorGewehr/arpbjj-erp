'use client';

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Download,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialReport } from '@/hooks/useFinancialReport';

// ============================================
// Helpers
// ============================================
const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercentage = (value: number): string =>
  `${value.toFixed(1)}%`;

const formatMonthLabel = (monthStr: string): string => {
  try {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return format(date, 'MMM/yy', { locale: ptBR });
  } catch {
    return monthStr;
  }
};

const formatMonthFull = (monthStr: string): string => {
  try {
    const date = parse(monthStr, 'yyyy-MM', new Date());
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return monthStr;
  }
};

// Pie chart colors
const STATUS_COLORS = {
  paid: '#4caf50',
  pending: '#ff9800',
  overdue: '#f44336',
};

// ============================================
// KPI Card Component
// ============================================
interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  loading?: boolean;
}

function KPICard({ title, value, icon, color, subtitle, loading }: KPICardProps) {
  if (loading) {
    return (
      <Paper sx={{ p: 2.5, height: '100%' }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="80%" height={36} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        borderLeft: `4px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        <Box sx={{ color, opacity: 0.8 }}>
          {icon}
        </Box>
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

// ============================================
// Main Dashboard Component
// ============================================
export function FinancialReportDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd = useMediaQuery(theme.breakpoints.down('md'));

  const {
    monthlyReport,
    historicalData,
    projections,
    revenueByPlan,
    recommendations,
    selectedMonth,
    goToPreviousMonth,
    goToNextMonth,
    exportCSV,
    isLoadingReport,
    isLoadingHistorical,
    isLoadingProjections,
    isLoadingRevenueByPlan,
    isLoading,
  } = useFinancialReport();

  // ============================================
  // Chart Data: Revenue History + Projections
  // ============================================
  const chartData = useMemo(() => {
    const historical = historicalData.map((r) => ({
      month: formatMonthLabel(r.month),
      receita: r.confirmedRevenue,
      projecao: null as number | null,
    }));

    // Bridge: last historical point also appears in projection line
    const bridgePoint = historical.length > 0
      ? { ...historical[historical.length - 1], projecao: historical[historical.length - 1].receita }
      : null;

    if (bridgePoint) {
      historical[historical.length - 1] = bridgePoint;
    }

    const projected = projections.map((p) => ({
      month: formatMonthLabel(p.month),
      receita: null as number | null,
      projecao: p.projected,
    }));

    return [...historical, ...projected];
  }, [historicalData, projections]);

  // ============================================
  // Chart Data: Status Distribution (Pie)
  // ============================================
  const pieData = useMemo(() => {
    if (!monthlyReport) return [];
    return [
      { name: 'Pago', value: monthlyReport.confirmedRevenue, color: STATUS_COLORS.paid },
      { name: 'Pendente', value: monthlyReport.pendingRevenue, color: STATUS_COLORS.pending },
      { name: 'Vencido', value: monthlyReport.overdueRevenue, color: STATUS_COLORS.overdue },
    ].filter((d) => d.value > 0);
  }, [monthlyReport]);

  // ============================================
  // Next month projection value
  // ============================================
  const nextMonthProjection = projections.length > 0 ? projections[0].projected : 0;

  // ============================================
  // Render
  // ============================================
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* ========== Header ========== */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          mb: 3,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Relatorio Financeiro
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analise detalhada da saude financeira da academia
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Month Navigation */}
          <IconButton onClick={goToPreviousMonth} size="small">
            <ChevronLeft size={20} />
          </IconButton>
          <Chip
            label={formatMonthFull(selectedMonth)}
            variant="outlined"
            sx={{ fontWeight: 600, minWidth: 160, justifyContent: 'center' }}
          />
          <IconButton onClick={goToNextMonth} size="small">
            <ChevronRight size={20} />
          </IconButton>

          {/* Export Button */}
          <Tooltip title="Exportar CSV">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={16} />}
              onClick={exportCSV}
              sx={{ ml: 1 }}
            >
              {!isMobile && 'Exportar'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* ========== KPI Cards ========== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Receita Confirmada"
            value={monthlyReport ? formatCurrency(monthlyReport.confirmedRevenue) : 'R$ 0,00'}
            icon={<DollarSign size={20} />}
            color="#4caf50"
            subtitle={monthlyReport ? `${monthlyReport.paidCount} pagamentos` : undefined}
            loading={isLoadingReport}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Taxa de Cobranca"
            value={monthlyReport ? formatPercentage(monthlyReport.collectionRate) : '0%'}
            icon={<Target size={20} />}
            color="#2196f3"
            subtitle={monthlyReport ? `${monthlyReport.totalPayments} cobranças no total` : undefined}
            loading={isLoadingReport}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Crescimento MoM"
            value={monthlyReport ? formatPercentage(monthlyReport.growthMoM) : '0%'}
            icon={
              monthlyReport && monthlyReport.growthMoM >= 0
                ? <TrendingUp size={20} />
                : <TrendingDown size={20} />
            }
            color={monthlyReport && monthlyReport.growthMoM >= 0 ? '#4caf50' : '#f44336'}
            subtitle="Comparado ao mes anterior"
            loading={isLoadingReport}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard
            title="Projecao Proximo Mes"
            value={formatCurrency(nextMonthProjection)}
            icon={<BarChart3 size={20} />}
            color="#9c27b0"
            subtitle={projections.length > 0 ? `Confianca: ${projections[0].confidence === 'high' ? 'Alta' : projections[0].confidence === 'medium' ? 'Media' : 'Baixa'}` : undefined}
            loading={isLoadingProjections}
          />
        </Grid>
      </Grid>

      {/* ========== Charts Row ========== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Revenue Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Evolucao da Receita
            </Typography>
            {isLoadingHistorical || isLoadingProjections ? (
              <Skeleton variant="rectangular" height={isMobile ? 200 : 300} />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke={theme.palette.text.secondary}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke={theme.palette.text.secondary}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      formatCurrency(value as number),
                      name === 'receita' ? 'Receita' : 'Projecao',
                    ]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#2196f3"
                    fill="#2196f3"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="receita"
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="projecao"
                    stroke="#9c27b0"
                    fill="#9c27b0"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="projecao"
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography color="text.secondary">Nenhum dado disponivel</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Status Distribution Pie */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Distribuicao por Status
            </Typography>
            {isLoadingReport ? (
              <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={isMobile ? 40 : 55}
                    outerRadius={isMobile ? 70 : 90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name) => [formatCurrency(value as number), name]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => (
                      <span style={{ color: theme.palette.text.primary, fontSize: 13 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography color="text.secondary">Nenhum dado para o mes</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ========== Revenue by Plan Table ========== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Receita por Plano
            </Typography>
            {isLoadingRevenueByPlan ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            ) : revenueByPlan.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Plano</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Alunos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Receita</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>% do Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {revenueByPlan.map((plan) => (
                      <TableRow key={plan.planId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {plan.planName}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={plan.studentCount} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(plan.totalRevenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {formatPercentage(plan.percentage)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <Typography color="text.secondary">Nenhum dado para o mes selecionado</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ========== Recommendations Panel ========== */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Lightbulb size={18} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Recomendacoes
              </Typography>
            </Box>
            {isLoading ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </Box>
            ) : recommendations.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {recommendations.map((rec, index) => (
                  <Alert
                    key={index}
                    severity={rec.type}
                    icon={
                      rec.type === 'success' ? <CheckCircle size={18} /> :
                      rec.type === 'warning' ? <AlertTriangle size={18} /> :
                      rec.type === 'error' ? <AlertTriangle size={18} /> :
                      <Info size={18} />
                    }
                    sx={{
                      '& .MuiAlert-message': { width: '100%' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {rec.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {rec.description}
                    </Typography>
                  </Alert>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <Typography color="text.secondary">Sem recomendacoes no momento</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default FinancialReportDashboard;
