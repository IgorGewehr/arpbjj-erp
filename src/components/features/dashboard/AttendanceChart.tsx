'use client';

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
import { BarChart3 } from 'lucide-react';

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
// Props Interface
// ============================================
interface AttendanceChartProps {
  data?: Array<{
    day: string;
    fullDate: string;
    count: number;
  }>;
}

// ============================================
// AttendanceChart Component
// ============================================
export function AttendanceChart({ data = [] }: AttendanceChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Calculate average attendance
  const avgAttendance = data.length > 0
    ? Math.round(data.reduce((acc, d) => acc + d.count, 0) / data.length)
    : 0;

  // Empty state
  if (data.length === 0) {
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
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: { xs: 150, sm: 180 },
            bgcolor: 'action.hover',
            borderRadius: 2,
          }}
        >
          <BarChart3 size={32} style={{ color: '#9ca3af', marginBottom: 8 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Registre presencas para visualizar o grafico
          </Typography>
        </Box>
      </Paper>
    );
  }

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
            data={data}
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
              fill="#1a1a1a"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

export default AttendanceChart;
