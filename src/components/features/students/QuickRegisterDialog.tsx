'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Checkbox,
} from '@mui/material';
import { User, Phone, X, GraduationCap, CreditCard, CheckSquare } from 'lucide-react';
import { useStudents, useClasses, usePlans } from '@/hooks';
import { Class, Plan } from '@/types';

// ============================================
// Props Interface
// ============================================
interface QuickRegisterDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (studentId: string) => void;
}

// ============================================
// QuickRegisterDialog Component
// ============================================
export function QuickRegisterDialog({
  open,
  onClose,
  onSuccess,
}: QuickRegisterDialogProps) {
  const { quickCreateStudent, isCreating } = useStudents({ autoLoad: false });
  const { classes } = useClasses();
  const { activePlans, toggleStudent } = usePlans();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    selectedClasses: [] as string[],
    selectedPlanId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Format phone number
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;

      if (cleaned.length > 0) {
        if (cleaned.length <= 2) {
          formatted = `(${cleaned}`;
        } else if (cleaned.length <= 7) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        } else {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
        }
      }

      setFormData((prev) => ({ ...prev, phone: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome é obrigatório';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'WhatsApp é obrigatório';
    } else {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        newErrors.phone = 'Número de telefone inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const student = await quickCreateStudent({
        fullName: formData.fullName.trim(),
        phone: formData.phone.replace(/\D/g, ''),
      });

      // Add student to selected classes
      if (formData.selectedClasses.length > 0) {
        const { classService } = await import('@/services/classService');
        for (const classId of formData.selectedClasses) {
          await classService.addStudent(classId, student.id);
        }
      }

      // Add student to selected plan
      if (formData.selectedPlanId) {
        await toggleStudent({ planId: formData.selectedPlanId, studentId: student.id });
      }

      // Reset form
      setFormData({ fullName: '', phone: '', selectedClasses: [], selectedPlanId: '' });
      setErrors({});

      // Close dialog
      onClose();

      // Call success callback
      if (onSuccess) {
        onSuccess(student.id);
      }
    } catch {
      // Error handled by hook
    }
  }, [formData, validate, quickCreateStudent, toggleStudent, onClose, onSuccess]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isCreating) {
      setFormData({ fullName: '', phone: '', selectedClasses: [], selectedPlanId: '' });
      setErrors({});
      onClose();
    }
  }, [isCreating, onClose]);

  // Handle class toggle
  const handleClassToggle = useCallback((classId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter((id) => id !== classId)
        : [...prev.selectedClasses, classId],
    }));
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Cadastro Rápido
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Apenas nome e WhatsApp para começar
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          disabled={isCreating}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              name="fullName"
              label="Nome Completo"
              placeholder="Ex: João Silva"
              value={formData.fullName}
              onChange={handleChange}
              error={!!errors.fullName}
              helperText={errors.fullName}
              disabled={isCreating}
              autoFocus
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <User size={20} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              name="phone"
              label="WhatsApp"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              disabled={isCreating}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone size={20} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Class Selection */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GraduationCap size={16} />
                Turmas (opcional)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {classes.map((cls) => (
                  <Chip
                    key={cls.id}
                    label={cls.name}
                    onClick={() => handleClassToggle(cls.id)}
                    color={formData.selectedClasses.includes(cls.id) ? 'primary' : 'default'}
                    variant={formData.selectedClasses.includes(cls.id) ? 'filled' : 'outlined'}
                    size="small"
                    disabled={isCreating}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
                {classes.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Nenhuma turma cadastrada
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Plan Selection */}
            <FormControl fullWidth size="small" disabled={isCreating}>
              <InputLabel>Plano (opcional)</InputLabel>
              <Select
                value={formData.selectedPlanId}
                label="Plano (opcional)"
                onChange={(e) => setFormData((prev) => ({ ...prev, selectedPlanId: e.target.value }))}
                startAdornment={
                  <InputAdornment position="start">
                    <CreditCard size={18} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">
                  <em>Sem plano</em>
                </MenuItem>
                {activePlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>{plan.name}</span>
                      <Typography variant="caption" color="text.secondary">
                        R$ {plan.monthlyValue}/mes
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            disabled={isCreating}
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isCreating}
            sx={{ minWidth: 120 }}
          >
            {isCreating ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Cadastrar'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default QuickRegisterDialog;
