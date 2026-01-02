'use client';

import { useMemo } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { BeltColor } from '@/types';
import { beltColors } from '@/lib/theme';

// ============================================
// Props Interface
// ============================================
interface BeltDistributionChartProps {
  distribution: Record<BeltColor, number>;
  getBeltLabel: (belt: BeltColor) => string;
}

// ============================================
// Belt Colors for Chart
// ============================================
const CHART_COLORS: Record<BeltColor, string> = {
  white: '#e5e5e5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
};

// ============================================
// Belt Card Component
// ============================================
interface BeltCardProps {
  belt: BeltColor;
  count: number;
  total: number;
  label: string;
}

function BeltCard({ belt, count, total, label }: BeltCardProps) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  const color = CHART_COLORS[belt];
  const textColor = belt === 'white' ? '#171717' : '#ffffff';

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: color,
        color: textColor,
        textAlign: 'center',
      }}
    >
      <Typography variant="h3" fontWeight={700}>
        {count}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        {percentage}%
      </Typography>
    </Paper>
  );
}

// ============================================
// Custom Tooltip
// ============================================
interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    belt: BeltColor;
    label: string;
    count: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;

  return (
    <Paper sx={{ p: 2, boxShadow: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Faixa {data.label}
      </Typography>
      <Typography variant="body2">
        {data.count} aluno{data.count !== 1 ? 's' : ''}
      </Typography>
    </Paper>
  );
}

// ============================================
// BeltDistributionChart Component
// ============================================
export function BeltDistributionChart({
  distribution,
  getBeltLabel,
}: BeltDistributionChartProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    const belts: BeltColor[] = ['white', 'blue', 'purple', 'brown', 'black'];
    return belts.map((belt) => ({
      belt,
      label: getBeltLabel(belt),
      count: distribution[belt] || 0,
      color: CHART_COLORS[belt],
    }));
  }, [distribution, getBeltLabel]);

  const total = useMemo(() => {
    return Object.values(distribution).reduce((a, b) => a + b, 0);
  }, [distribution]);

  // Filter out zero values for the chart
  const filteredChartData = chartData.filter((d) => d.count > 0);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Pie Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Distribuicao por Faixa
            </Typography>

            {total === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  Nenhum aluno cadastrado
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={filteredChartData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {filteredChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: '#374151' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Belt Cards */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Alunos por Faixa
          </Typography>

          <Grid container spacing={2}>
            {chartData.map(({ belt, label, count }) => (
              <Grid key={belt} size={{ xs: 6, sm: 4 }}>
                <BeltCard
                  belt={belt}
                  count={count}
                  total={total}
                  label={label}
                />
              </Grid>
            ))}
          </Grid>

          {/* Total */}
          <Paper
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" fontWeight={700}>
              {total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de Alunos
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BeltDistributionChart;
