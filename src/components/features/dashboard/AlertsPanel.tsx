'use client';

import { Box, Typography, Paper, Button, Chip, useTheme, useMediaQuery } from '@mui/material';
import { AlertTriangle, Award, ArrowRight, DollarSign } from 'lucide-react';
import { Financial, Student, BeltColor, Stripes } from '@/types';

// ============================================
// Props Interface
// ============================================
interface AlertsPanelProps {
  overduePayments: Financial[];
  eligibleStudents: Array<{
    student: Student;
    nextPromotion: { belt: BeltColor; stripes: Stripes };
    totalClasses: number;
  }>;
  onViewOverdue: () => void;
  onViewEligible: () => void;
}

// ============================================
// Alert Card Component
// ============================================
interface AlertCardProps {
  title: string;
  count: number;
  description: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgColor: string;
  onClick: () => void;
  compact?: boolean;
}

function AlertCard({
  title,
  count,
  description,
  icon: Icon,
  color,
  borderColor,
  bgColor,
  onClick,
  compact,
}: AlertCardProps) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: compact ? 2 : 2.5,
        borderLeft: 4,
        borderColor,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        '&:active': {
          transform: 'scale(0.99)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: compact ? 1.5 : 2 }}>
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{ fontSize: compact ? '0.8rem' : '0.875rem' }}
            >
              {title}
            </Typography>
            <Chip
              label={count}
              size="small"
              sx={{
                height: compact ? 18 : 20,
                fontSize: compact ? '0.65rem' : '0.75rem',
                bgcolor: bgColor,
                color,
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: compact ? '0.75rem' : '0.875rem' }}
          >
            {description}
          </Typography>
        </Box>
        <ArrowRight size={compact ? 16 : 18} style={{ color: '#9ca3af', flexShrink: 0 }} />
      </Box>
    </Paper>
  );
}

// ============================================
// AlertsPanel Component
// ============================================
export function AlertsPanel({
  overduePayments,
  eligibleStudents,
  onViewOverdue,
  onViewEligible,
}: AlertsPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const overdueTotal = overduePayments.reduce((acc, p) => acc + p.amount, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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
        Alertas e Pendencias
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
        {/* Overdue Payments Alert */}
        {overduePayments.length > 0 && (
          <AlertCard
            title="Mensalidades Vencidas"
            count={overduePayments.length}
            description={`Total: ${formatCurrency(overdueTotal)}`}
            icon={AlertTriangle}
            color="#dc2626"
            borderColor="error.main"
            bgColor="#fee2e2"
            onClick={onViewOverdue}
            compact={isMobile}
          />
        )}

        {/* Eligible Students Alert */}
        {eligibleStudents.length > 0 && (
          <AlertCard
            title="Prontos para Graduacao"
            count={eligibleStudents.length}
            description="Alunos completaram requisitos"
            icon={Award}
            color="#16a34a"
            borderColor="success.main"
            bgColor="#dcfce7"
            onClick={onViewEligible}
            compact={isMobile}
          />
        )}

        {/* No Alerts */}
        {overduePayments.length === 0 && eligibleStudents.length === 0 && (
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Box
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                borderRadius: '50%',
                bgcolor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Award size={isMobile ? 20 : 24} />
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Tudo em dia! Nenhum alerta no momento.
            </Typography>
          </Box>
        )}

        {/* Summary Stats */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            gutterBottom
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Resumo do Dia
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Pagamentos pendentes
              </Typography>
              <Chip
                label={overduePayments.length}
                size="small"
                color={overduePayments.length > 0 ? 'error' : 'default'}
                variant="outlined"
                sx={{ fontWeight: 600, height: isMobile ? 22 : 24, fontSize: isMobile ? '0.7rem' : '0.75rem' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Alunos para graduar
              </Typography>
              <Chip
                label={eligibleStudents.length}
                size="small"
                color={eligibleStudents.length > 0 ? 'success' : 'default'}
                variant="outlined"
                sx={{ fontWeight: 600, height: isMobile ? 22 : 24, fontSize: isMobile ? '0.7rem' : '0.75rem' }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default AlertsPanel;
