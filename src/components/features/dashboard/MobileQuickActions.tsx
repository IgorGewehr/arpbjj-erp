'use client';

import { Box, Paper, Typography, useTheme } from '@mui/material';
import { ClipboardCheck, UserPlus, DollarSign } from 'lucide-react';

// ============================================
// Types
// ============================================
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  primary?: boolean;
}

interface MobileQuickActionsProps {
  onAction: (action: string) => void;
}

// ============================================
// MobileQuickActions Component
// ============================================
export function MobileQuickActions({ onAction }: MobileQuickActionsProps) {
  const theme = useTheme();

  const actions: QuickAction[] = [
    {
      id: 'attendance',
      label: 'Chamada',
      icon: ClipboardCheck,
      color: '#fff',
      bgColor: theme.palette.primary.main,
      primary: true,
    },
    {
      id: 'newStudent',
      label: 'Novo Aluno',
      icon: UserPlus,
      color: theme.palette.text.primary,
      bgColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
    },
    {
      id: 'financial',
      label: 'Financeiro',
      icon: DollarSign,
      color: theme.palette.text.primary,
      bgColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f5f5f5',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        mb: 2,
      }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Paper
            key={action.id}
            elevation={0}
            onClick={() => onAction(action.id)}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 2,
              px: 1,
              borderRadius: 3,
              bgcolor: action.bgColor,
              border: action.primary ? 'none' : '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              transition: 'transform 0.1s, box-shadow 0.2s',
              '&:active': {
                transform: 'scale(0.95)',
              },
              '&:hover': {
                boxShadow: action.primary ? 4 : 2,
              },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: action.primary ? 'rgba(255,255,255,0.2)' : action.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <Icon size={24} color={action.color} />
            </Box>
            <Typography
              variant="caption"
              fontWeight={action.primary ? 600 : 500}
              sx={{
                color: action.color,
                fontSize: '0.75rem',
                textAlign: 'center',
              }}
            >
              {action.label}
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
}

export default MobileQuickActions;
