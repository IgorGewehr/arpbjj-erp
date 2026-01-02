'use client';

import { useMemo } from 'react';
import { Box, Typography, Paper, Grid, useTheme, useMediaQuery } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';

// ============================================
// Props Interface
// ============================================
interface RevenueChartProps {
  data: {
    totalRevenue: number;
    expectedRevenue: number;
    collectionRate: number;
    byMonth: Array<{ month: string; paid: number; expected: number }>;
  };
}

// ============================================
// Format Currency
// ============================================
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ============================================
// Custom Tooltip
// ============================================
interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  const monthLabel = label
    ? format(parseISO(`${label}-01`), 'MMMM yyyy', { locale: ptBR })
    : '';

  return (
    <Paper sx={{ p: 2, boxShadow: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {monthLabel}
      </Typography>
      {payload.map((entry) => (
        <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              bgcolor: entry.color,
            }}
          />
          <Typography variant="body2">
            {entry.dataKey === 'paid' ? 'Recebido' : 'Esperado'}:{' '}
            {formatCurrency(entry.value)}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ============================================
// Summary Card Component
// ============================================
interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.7rem', sm: '0.875rem' },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{
            fontSize: { xs: '0.9rem', sm: '1.25rem' },
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================
// RevenueChart Component
// ============================================
export function RevenueChart({ data }: RevenueChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Format chart data with month labels
  const chartData = useMemo(() => {
    return data.byMonth.map((item) => ({
      ...item,
      monthLabel: format(parseISO(`${item.month}-01`), isMobile ? 'MMM' : 'MMM', { locale: ptBR }),
    }));
  }, [data.byMonth, isMobile]);

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 4 } }}>
        <Grid size={{ xs: 4, md: 4 }}>
          <SummaryCard
            title={isMobile ? "Recebido" : "Total Recebido (6 meses)"}
            value={formatCurrency(data.totalRevenue)}
            icon={<DollarSign size={isMobile ? 18 : 24} />}
            color="#16a34a"
          />
        </Grid>
        <Grid size={{ xs: 4, md: 4 }}>
          <SummaryCard
            title={isMobile ? "Esperado" : "Total Esperado"}
            value={formatCurrency(data.expectedRevenue)}
            icon={<TrendingUp size={isMobile ? 18 : 24} />}
            color="#2563eb"
          />
        </Grid>
        <Grid size={{ xs: 4, md: 4 }}>
          <SummaryCard
            title={isMobile ? "Taxa" : "Taxa de Recebimento"}
            value={`${data.collectionRate.toFixed(1)}%`}
            icon={<Percent size={isMobile ? 18 : 24} />}
            color="#ca8a04"
          />
        </Grid>
      </Grid>

      {/* Chart */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ fontSize: { xs: '0.9rem', sm: '1.25rem' } }}
        >
          Evolucao Financeira - Ultimos 6 Meses
        </Typography>

        <Box sx={{ width: '100%', height: { xs: 250, sm: 300, md: 350 } }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: isMobile ? 10 : 30,
                left: isMobile ? -10 : 20,
                bottom: 5
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: isMobile ? 9 : 12 }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                }
                width={isMobile ? 35 : 50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (value === 'paid' ? 'Recebido' : 'Esperado')}
                wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
              />
              <Bar
                dataKey="expected"
                name="expected"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="paid"
                name="paid"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Legend Note */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
            {isMobile
              ? "Comparacao: esperado vs recebido por mes."
              : "O grafico mostra a comparacao entre o valor esperado (todas as mensalidades geradas) e o valor efetivamente recebido em cada mes."
            }
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default RevenueChart;
