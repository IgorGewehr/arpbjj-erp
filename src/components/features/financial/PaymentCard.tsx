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
} from '@mui/material';
import {
  Check,
  MoreVertical,
  Phone,
  X,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Financial, PaymentMethod } from '@/types';
import { financialService } from '@/services';
import { useState } from 'react';

// ============================================
// Props Interface
// ============================================
interface PaymentCardProps {
  payment: Financial;
  onMarkPaid: (payment: Financial) => void;
  onCancel: (payment: Financial) => void;
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
  showWhatsApp = false,
}: PaymentCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const status = statusConfig[payment.status];

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Handle WhatsApp click
  const handleWhatsAppClick = useCallback(() => {
    // Get student phone from payment (assuming it's stored or we need to fetch)
    // For now, we'll use a placeholder
    const whatsappLink = financialService.getWhatsAppReminderLink(
      '11999999999', // This should come from student data
      payment.studentName || 'Aluno',
      payment.amount,
      payment.dueDate
    );
    window.open(whatsappLink, '_blank');
  }, [payment]);

  // Handle menu open
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  }, []);

  // Handle menu close
  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    handleMenuClose();
    onCancel(payment);
  }, [handleMenuClose, onCancel, payment]);

  const isPaidOrCancelled = payment.status === 'paid' || payment.status === 'cancelled';

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2,
        opacity: payment.status === 'cancelled' ? 0.6 : 1,
        borderLeft: 4,
        borderColor:
          payment.status === 'paid'
            ? 'success.main'
            : payment.status === 'overdue'
            ? 'error.main'
            : payment.status === 'pending'
            ? 'warning.main'
            : 'grey.300',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: Student & Payment Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
          <Calendar size={16} style={{ color: '#6b7280' }} />
          <Typography variant="body2" color="text.secondary">
            {format(payment.dueDate, "dd 'de' MMM", { locale: ptBR })}
          </Typography>
        </Box>

        {/* Amount */}
        <Box sx={{ minWidth: 100, textAlign: 'right', px: 2 }}>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              color:
                payment.status === 'paid'
                  ? 'success.main'
                  : payment.status === 'overdue'
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
        <Box sx={{ minWidth: 100, px: 2 }}>
          <Chip
            label={status.label}
            color={status.color}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            <IconButton
              color="success"
              onClick={handleWhatsAppClick}
            >
              <Phone size={18} />
            </IconButton>
          )}

          <IconButton onClick={handleMenuOpen}>
            <MoreVertical size={18} />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
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
            {isPaidOrCancelled && (
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
