'use client';

import { Box, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';
import { CheckCircle, UserPlus, DollarSign, CreditCard, ChevronRight } from 'lucide-react';

// ============================================
// Props Interface
// ============================================
interface QuickActionsProps {
  onAction: (action: string) => void;
}

// ============================================
// Action Item Component
// ============================================
interface ActionItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  onClick: () => void;
  compact?: boolean;
}

function ActionItem({ title, description, icon: Icon, gradient, onClick, compact }: ActionItemProps) {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: compact ? 1.5 : 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)',
          transform: { xs: 'none', sm: 'translateY(-1px)' },
          '& .action-arrow': {
            transform: 'translateX(4px)',
            opacity: 1,
          },
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1.5 : 2 }}>
        <Box
          sx={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: 2.5,
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px -1px rgb(0 0 0 / 0.1)',
            flexShrink: 0,
          }}
        >
          <Icon size={compact ? 18 : 22} color="#fff" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              fontSize: compact ? '0.8rem' : '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: compact ? '0.65rem' : '0.75rem',
              display: { xs: compact ? 'none' : 'block', sm: 'block' },
            }}
          >
            {description}
          </Typography>
        </Box>
        <Box
          className="action-arrow"
          sx={{
            opacity: 0.5,
            transition: 'all 0.2s ease',
            color: 'text.secondary',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <ChevronRight size={20} />
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================
// QuickActions Component
// ============================================
export function QuickActions({ onAction }: QuickActionsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        Acoes Rapidas
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: '1fr' },
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        <ActionItem
          title="Iniciar Chamada"
          description="Registrar presenca da turma"
          icon={CheckCircle}
          gradient="linear-gradient(135deg, #22C55E 0%, #16A34A 100%)"
          onClick={() => onAction('attendance')}
          compact={isMobile}
        />
        <ActionItem
          title="Novo Aluno"
          description="Cadastro rapido"
          icon={UserPlus}
          gradient="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
          onClick={() => onAction('newStudent')}
          compact={isMobile}
        />
        <ActionItem
          title="Registrar Pagamento"
          description="Baixa de mensalidade"
          icon={DollarSign}
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          onClick={() => onAction('financial')}
          compact={isMobile}
        />
        <ActionItem
          title="Gerenciar Planos"
          description="Planos e mensalidades"
          icon={CreditCard}
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          onClick={() => onAction('financial')}
          compact={isMobile}
        />
      </Box>
    </Paper>
  );
}

export default QuickActions;
