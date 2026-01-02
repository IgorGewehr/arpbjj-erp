'use client';

import { useMemo } from 'react';
import { Box, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// Custom Tooltip
// ============================================
interface TooltipPayloadItem {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  return (
    <Paper sx={{ p: 1.5, boxShadow: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle2" fontWeight={600}>
        {payload[0].value} alunos
      </Typography>
    </Paper>
  );
}

// ============================================
// AttendanceChart Component
// ============================================
export function AttendanceChart() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Generate mock data for last 7 days
  // In production, this would come from useAttendance hook
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        day: format(date, isMobile ? 'EEEEE' : 'EEE', { locale: ptBR }),
        fullDate: format(date, "dd 'de' MMM", { locale: ptBR }),
        count: Math.floor(Math.random() * 30) + 15, // Mock data
      });
    }
    return data;
  }, [isMobile]);

  const avgAttendance = useMemo(() => {
    const total = chartData.reduce((acc, d) => acc + d.count, 0);
    return Math.round(total / chartData.length);
  }, [chartData]);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1,
          mb: 2
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Presenca - Ultimos 7 Dias
        </Typography>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {avgAttendance}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            media/dia
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: '100%', height: { xs: 150, sm: 180 } }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: isMobile ? 5 : 10,
              left: isMobile ? -25 : -20,
              bottom: 0
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 30 : 40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

export default AttendanceChart;
