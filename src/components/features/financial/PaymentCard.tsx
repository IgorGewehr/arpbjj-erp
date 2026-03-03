'use client';

import { useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Check,
  MoreVertical,
  Phone,
  X,
  User,
  Calendar,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Financial, PaymentMethod } from '@/types';
import { createFinancialService } from '@/services';
import { useAcademy } from '@/contexts/AcademyContext';
import { useState } from 'react';

// ============================================
// Props Interface
// ============================================
interface PaymentCardProps {
  payment: Financial;
  onMarkPaid: (payment: Financial) => void;
  onCancel: (payment: Financial) => void;
  onReactivate: (payment: Financial) => void;
  showWhatsApp?: boolean;
}

// ============================================
// Status Config
// ============================================
const statusConfig: Record<
  Financial['status'],
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  paid: { label: 'Pago', color: 'success' },
  pending: { label: 'Pendente', color: 'warning' },
  overdue: { label: 'Atrasado', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'default' },
};

// ============================================
// Payment Method Labels
// ============================================
const methodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartao de Credito',
  debit_card: 'Cartao de Debito',
  bank_transfer: 'Transferencia',
};

// ============================================
// PaymentCard Component
// ============================================
export function PaymentCard({
  payment,
  onMarkPaid,
  onCancel,
  onReactivate,
  showWhatsApp = false,
}: PaymentCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const { academyId } = useAcademy();

  const isOverdue = payment.status === 'overdue' ||
    (payment.status === 'pending' && new Date(payment.dueDate) < new Date());

  const status = statusConfig[isOverdue ? 'overdue' : payment.status];

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleWhatsAppClick = useCallback(() => {
    if (!academyId) return;
    const financialService = createFinancialService(academyId);
    const whatsappLink = financialService.getWhatsAppReminderLink(
      '11999999999',
      payment.studentName || 'Aluno',
      payment.amount,
      payment.dueDate
    );
    window.open(whatsappLink, '_blank');
  }, [payment, academyId]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleCancel = useCallback(() => {
    handleMenuClose();
    onCancel(payment);
  }, [handleMenuClose, onCancel, payment]);

  const handleReactivate = useCallback(() => {
    handleMenuClose();
    onReactivate(payment);
  }, [handleMenuClose, onReactivate, payment]);

  const isPaidOrCancelled = payment.status === 'paid' || payment.status === 'cancelled';

  const borderColor =
    payment.status === 'paid'
      ? 'success.main'
      : isOverdue
      ? 'error.main'
      : payment.status === 'pending'
      ? 'warning.main'
      : 'grey.300';

  // ============================================
  // Mobile Layout
  // ============================================
  if (isMobile) {
    return (
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          opacity: payment.status === 'cancelled' ? 0.6 : 1,
          borderLeft: 4,
          borderColor,
        }}
      >
        {/* Row 1: Avatar + Name + Amount */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User size={18} style={{ color: '#6b7280' }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {payment.studentName || 'Aluno'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {payment.description}
            </Typography>
          </Box>

          <Typography
            variant="subtitle2"
            fontWeight={700}
            flexShrink={0}
            sx={{
              color:
                payment.status === 'paid'
                  ? 'success.main'
                  : isOverdue
                  ? 'error.main'
                  : 'text.primary',
            }}
          >
            {formatCurrency(payment.amount)}
          </Typography>
        </Box>

        {/* Row 2: Date + Status + Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, pl: 0.5 }}>
          <Calendar size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {format(payment.dueDate, 'dd/MM', { locale: ptBR })}
          </Typography>

          <Chip
            label={status.label}
            color={status.color}
            size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
          />

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {!isPaidOrCancelled && (
              <IconButton
                size="small"
                color="success"
                onClick={() => onMarkPaid(payment)}
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'success.light',
                  '&:hover': { bgcolor: 'success.main', color: 'white' },
                }}
              >
                <Check size={14} />
              </IconButton>
            )}

            {showWhatsApp && !isPaidOrCancelled && (
              <IconButton size="small" color="success" onClick={handleWhatsAppClick} sx={{ width: 28, height: 28 }}>
                <Phone size={14} />
              </IconButton>
            )}

            <IconButton size="small" onClick={handleMenuOpen} sx={{ width: 28, height: 28 }}>
              <MoreVertical size={14} />
            </IconButton>

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
              {!isPaidOrCancelled && (
                <MenuItem onClick={() => { handleMenuClose(); onMarkPaid(payment); }}>
                  <Check size={16} style={{ marginRight: 8 }} />
                  Dar Baixa
                </MenuItem>
              )}
              {!isPaidOrCancelled && (
                <MenuItem onClick={handleCancel} sx={{ color: 'error.main' }}>
                  <X size={16} style={{ marginRight: 8 }} />
                  Cancelar
                </MenuItem>
              )}
              {payment.status === 'cancelled' && (
                <MenuItem onClick={handleReactivate} sx={{ color: 'success.main' }}>
                  <RotateCcw size={16} style={{ marginRight: 8 }} />
                  Reativar
                </MenuItem>
              )}
              {payment.status === 'paid' && (
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    Sem acoes disponiveis
                  </Typography>
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>

        {/* Paid info */}
        {payment.status === 'paid' && payment.paymentDate && (
          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CreditCard size={11} style={{ color: '#9ca3af' }} />
            <Typography variant="caption" color="text.secondary">
              Pago em {format(payment.paymentDate, 'dd/MM/yyyy', { locale: ptBR })}
              {payment.method ? ` · ${methodLabels[payment.method]}` : ''}
            </Typography>
          </Box>
        )}
      </Paper>
    );
  }

  // ============================================
  // Desktop Layout
  // ============================================
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2,
        opacity: payment.status === 'cancelled' ? 0.6 : 1,
        borderLeft: 4,
        borderColor,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Student & Payment Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User size={24} style={{ color: '#6b7280' }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {payment.studentName || 'Aluno'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {payment.description}
            </Typography>
          </Box>
        </Box>

        {/* Center: Due Date */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, flexShrink: 0 }}>
          <Calendar size={16} style={{ color: '#6b7280' }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {format(payment.dueDate, "dd 'de' MMM", { locale: ptBR })}
          </Typography>
        </Box>

        {/* Amount */}
        <Box sx={{ minWidth: 110, textAlign: 'right', px: 2, flexShrink: 0 }}>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              color:
                payment.status === 'paid'
                  ? 'success.main'
                  : isOverdue
                  ? 'error.main'
                  : 'text.primary',
            }}
          >
            {formatCurrency(payment.amount)}
          </Typography>
          {payment.status === 'paid' && payment.method && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
              <CreditCard size={12} style={{ color: '#6b7280' }} />
              <Typography variant="caption" color="text.secondary">
                {methodLabels[payment.method]}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Status Chip */}
        <Box sx={{ minWidth: 100, px: 2, flexShrink: 0 }}>
          <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 600 }} />
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {!isPaidOrCancelled && (
            <IconButton
              color="success"
              onClick={() => onMarkPaid(payment)}
              sx={{ bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main', color: 'white' } }}
            >
              <Check size={18} />
            </IconButton>
          )}

          {showWhatsApp && !isPaidOrCancelled && (
            <IconButton color="success" onClick={handleWhatsAppClick}>
              <Phone size={18} />
            </IconButton>
          )}

          <IconButton onClick={handleMenuOpen}>
            <MoreVertical size={18} />
          </IconButton>

          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
            {!isPaidOrCancelled && (
              <MenuItem onClick={() => { handleMenuClose(); onMarkPaid(payment); }}>
                <Check size={16} style={{ marginRight: 8 }} />
                Dar Baixa
              </MenuItem>
            )}
            {!isPaidOrCancelled && (
              <MenuItem onClick={handleCancel} sx={{ color: 'error.main' }}>
                <X size={16} style={{ marginRight: 8 }} />
                Cancelar
              </MenuItem>
            )}
            {payment.status === 'cancelled' && (
              <MenuItem onClick={handleReactivate} sx={{ color: 'success.main' }}>
                <RotateCcw size={16} style={{ marginRight: 8 }} />
                Reativar
              </MenuItem>
            )}
            {payment.status === 'paid' && (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Sem acoes disponiveis
                </Typography>
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Payment date info for paid items */}
      {payment.status === 'paid' && payment.paymentDate && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Pago em {format(payment.paymentDate, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default PaymentCard;
