'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { Financial, PaymentMethod } from '@/types';

// ============================================
// Props Interface
// ============================================
interface MarkPaidDialogProps {
  open: boolean;
  payment: Financial | null;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, paymentDate?: Date) => void;
  isLoading?: boolean;
}

// ============================================
// Payment Method Options
// ============================================
const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartao de Credito' },
  { value: 'debit_card', label: 'Cartao de Debito' },
  { value: 'bank_transfer', label: 'Transferencia Bancaria' },
];

// ============================================
// MarkPaidDialog Component
// ============================================
export function MarkPaidDialog({
  open,
  payment,
  onClose,
  onConfirm,
  isLoading = false,
}: MarkPaidDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setMethod('pix');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onConfirm(method, new Date(paymentDate));
  }, [method, paymentDate, onConfirm]);

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Pagamento</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Payment Info */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Aluno
            </Typography>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {payment.studentName}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Descricao
            </Typography>
            <Typography variant="body1" gutterBottom>
              {payment.description}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Valor
            </Typography>
            <Typography variant="h5" fontWeight={700} color="success.main">
              {formatCurrency(payment.amount)}
            </Typography>
          </Box>

          {/* Payment Method */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Forma de Pagamento</InputLabel>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              label="Forma de Pagamento"
            >
              {paymentMethodOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Payment Date */}
          <TextField
            label="Data do Pagamento"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : 'Confirmar Pagamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MarkPaidDialog;
