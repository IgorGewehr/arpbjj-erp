'use client';

import { Box, Typography, Paper, LinearProgress, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import { DollarSign, Clock, AlertTriangle } from 'lucide-react';

// ============================================
// Props Interface
// ============================================
interface RevenueOverviewProps {
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  isLoading?: boolean;
}

// ============================================
// Revenue Item Component
// ============================================
interface RevenueItemProps {
  label: string;
  amount: number;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  compact?: boolean;
}

function RevenueItem({ label, amount, count, icon: Icon, color, bgColor, compact }: RevenueItemProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1 : 2, minWidth: 0 }}>
        <Box
          sx={{
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            borderRadius: 2,
            bgcolor: bgColor,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={compact ? 16 : 20} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: compact ? '0.75rem' : '0.875rem' }}
          >
            {label}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: compact ? '0.65rem' : '0.75rem' }}
          >
            {count} pag.
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{
          color,
          fontSize: compact ? '0.9rem' : '1.25rem',
          whiteSpace: 'nowrap',
        }}
      >
        {formatCurrency(amount)}
      </Typography>
    </Box>
  );
}

// ============================================
// RevenueOverview Component
// ============================================
export function RevenueOverview({
  paidAmount,
  pendingAmount,
  overdueAmount,
  paidCount,
  pendingCount,
  overdueCount,
  isLoading = false,
}: RevenueOverviewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const totalExpected = paidAmount + pendingAmount + overdueAmount;
  const collectionRate = totalExpected > 0 ? (paidAmount / totalExpected) * 100 : 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Skeleton variant="text" width={150} height={32} />
        <Box sx={{ my: 3 }}>
          <Skeleton variant="rounded" height={80} />
        </Box>
        <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={60} />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}
    >
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{ mb: { xs: 1.5, sm: 2.5 }, fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        Financeiro do Mes
      </Typography>

      {/* Main Stats */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          color: 'white',
          textAlign: 'center',
          mb: { xs: 2, sm: 3 },
          boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Typography
          variant="h3"
          fontWeight={700}
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}
        >
          {formatCurrency(paidAmount)}
        </Typography>
        <Typography
          variant="body2"
          sx={{ opacity: 0.9, mt: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
        >
          recebido de {formatCurrency(totalExpected)}
        </Typography>

        <Box sx={{ mt: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" fontWeight={500} sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              Taxa de recebimento
            </Typography>
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              {collectionRate.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={collectionRate}
            sx={{
              height: { xs: 8, sm: 10 },
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.25)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white',
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </Box>

      {/* Breakdown */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 } }}>
        <RevenueItem
          label="Recebido"
          amount={paidAmount}
          count={paidCount}
          icon={DollarSign}
          color="#1a1a1a"
          bgColor="#f5f5f5"
          compact={isMobile}
        />
        <RevenueItem
          label="Pendente"
          amount={pendingAmount}
          count={pendingCount}
          icon={Clock}
          color="#525252"
          bgColor="#f5f5f5"
          compact={isMobile}
        />
        <RevenueItem
          label="Vencido"
          amount={overdueAmount}
          count={overdueCount}
          icon={AlertTriangle}
          color="#525252"
          bgColor="#f5f5f5"
          compact={isMobile}
        />
      </Box>
    </Paper>
  );
}

export default RevenueOverview;
