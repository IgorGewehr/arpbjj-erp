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
import { User, Phone, X, GraduationCap, CreditCard, Award } from 'lucide-react';
import { useStudents, useClasses, usePlans } from '@/hooks';
import { Class, Plan, BeltColor, KidsBeltColor, Stripes, StudentCategory } from '@/types';

const adultBelts: { value: BeltColor; label: string; color: string }[] = [
  { value: 'white', label: 'Branca', color: '#FFFFFF' },
  { value: 'blue', label: 'Azul', color: '#1E40AF' },
  { value: 'purple', label: 'Roxa', color: '#7C3AED' },
  { value: 'brown', label: 'Marrom', color: '#78350F' },
  { value: 'black', label: 'Preta', color: '#000000' },
];

const kidsBelts: { value: KidsBeltColor; label: string; color: string }[] = [
  { value: 'white', label: 'Branca', color: '#FFFFFF' },
  { value: 'grey', label: 'Cinza', color: '#6B7280' },
  { value: 'yellow', label: 'Amarela', color: '#EAB308' },
  { value: 'orange', label: 'Laranja', color: '#EA580C' },
  { value: 'green', label: 'Verde', color: '#16A34A' },
];

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
    category: 'adult' as StudentCategory,
    currentBelt: 'white' as BeltColor | KidsBeltColor,
    currentStripes: 0 as Stripes,
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

    // Phone is optional, but if provided, validate format
    if (formData.phone.trim()) {
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
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const student = await quickCreateStudent({
        fullName: formData.fullName.trim(),
        phone: phoneDigits || undefined,
        category: formData.category,
        currentBelt: formData.currentBelt,
        currentStripes: formData.currentStripes,
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
      setFormData({ fullName: '', phone: '', category: 'adult', currentBelt: 'white', currentStripes: 0, selectedClasses: [], selectedPlanId: '' });
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
      setFormData({ fullName: '', phone: '', category: 'adult', currentBelt: 'white', currentStripes: 0, selectedClasses: [], selectedPlanId: '' });
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
            Apenas o nome é obrigatório
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
              label="WhatsApp (opcional)"
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

            {/* Category, Belt and Stripes */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 100 }} disabled={isCreating}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  label="Categoria"
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    category: e.target.value as StudentCategory,
                    currentBelt: 'white' as BeltColor
                  }))}
                >
                  <MenuItem value="adult">Adulto</MenuItem>
                  <MenuItem value="kids">Kids</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ flex: 1 }} disabled={isCreating}>
                <InputLabel>Faixa</InputLabel>
                <Select
                  value={formData.currentBelt}
                  label="Faixa"
                  onChange={(e) => setFormData((prev) => ({ ...prev, currentBelt: e.target.value as BeltColor | KidsBeltColor }))}
                  startAdornment={
                    <InputAdornment position="start">
                      <Award size={18} />
                    </InputAdornment>
                  }
                >
                  {(formData.category === 'kids' ? kidsBelts : adultBelts).map((belt) => (
                    <MenuItem key={belt.value} value={belt.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            bgcolor: belt.color,
                            border: belt.value === 'white' ? '1px solid #ccc' : 'none',
                          }}
                        />
                        {belt.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 80 }} disabled={isCreating}>
                <InputLabel>Graus</InputLabel>
                <Select
                  value={formData.currentStripes}
                  label="Graus"
                  onChange={(e) => setFormData((prev) => ({ ...prev, currentStripes: e.target.value as Stripes }))}
                >
                  {[0, 1, 2, 3, 4].map((stripe) => (
                    <MenuItem key={stripe} value={stripe}>
                      {stripe}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

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
