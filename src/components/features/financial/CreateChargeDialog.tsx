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
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import { format } from 'date-fns';
import { PaymentType, Student } from '@/types';

// ============================================
// Types
// ============================================
export interface CreateChargeData {
  studentId: string;
  type: PaymentType;
  description: string;
  amount: number;
  dueDate: Date;
}

interface CreateChargeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreateChargeData) => Promise<void>;
  students?: Student[];
  preselectedStudentId?: string;
  preselectedStudentName?: string;
  isLoading?: boolean;
}

// ============================================
// Payment Type Options
// ============================================
const paymentTypeOptions: { value: PaymentType; label: string }[] = [
  { value: 'monthly_tuition', label: 'Mensalidade' },
  { value: 'uniform', label: 'Kimono / Uniforme' },
  { value: 'seminar', label: 'Seminário' },
  { value: 'graduation', label: 'Graduação' },
  { value: 'competition', label: 'Competição' },
  { value: 'other', label: 'Outro' },
];

// ============================================
// CreateChargeDialog Component
// ============================================
export function CreateChargeDialog({
  open,
  onClose,
  onConfirm,
  students,
  preselectedStudentId,
  preselectedStudentName,
  isLoading = false,
}: CreateChargeDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || '');
  const [type, setType] = useState<PaymentType>('monthly_tuition');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (open) {
      setSelectedStudentId(preselectedStudentId || '');
      setType('monthly_tuition');
      setDescription('');
      setAmountStr('');
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [open, preselectedStudentId]);

  const amount = parseFloat(amountStr.replace(',', '.')) || 0;
  const effectiveStudentId = preselectedStudentId || selectedStudentId;
  const isValid = effectiveStudentId && description.trim() && amount > 0 && dueDate;

  const handleConfirm = useCallback(async () => {
    if (!effectiveStudentId) return;
    await onConfirm({
      studentId: effectiveStudentId,
      type,
      description: description.trim(),
      amount,
      dueDate: new Date(`${dueDate}T12:00:00`),
    });
  }, [effectiveStudentId, type, description, amount, dueDate, onConfirm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nova Cobrança</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Student selector — only when no preselected student */}
          {!preselectedStudentId && students && (
            <Autocomplete
              options={students}
              getOptionLabel={(s) => s.fullName}
              value={students.find((s) => s.id === selectedStudentId) || null}
              onChange={(_, value) => setSelectedStudentId(value?.id || '')}
              renderInput={(params) => (
                <TextField {...params} label="Aluno" required />
              )}
              noOptionsText="Nenhum aluno encontrado"
            />
          )}

          {/* Preselected student name (read-only) */}
          {preselectedStudentId && preselectedStudentName && (
            <TextField
              label="Aluno"
              value={preselectedStudentName}
              disabled
              fullWidth
            />
          )}

          {/* Charge type */}
          <FormControl fullWidth required>
            <InputLabel>Tipo de Cobrança</InputLabel>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentType)}
              label="Tipo de Cobrança"
            >
              {paymentTypeOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Description */}
          <TextField
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            required
            placeholder="Ex: Mensalidade Abril/2026"
          />

          {/* Amount */}
          <TextField
            label="Valor"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            fullWidth
            required
            type="number"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              },
            }}
            inputProps={{ min: 0, step: '0.01' }}
          />

          {/* Due date */}
          <TextField
            label="Vencimento"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            fullWidth
            required
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
          onClick={handleConfirm}
          disabled={!isValid || isLoading}
        >
          {isLoading ? 'Criando...' : 'Criar Cobrança'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateChargeDialog;
