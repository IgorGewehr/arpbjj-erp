'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { User, Phone, Mail, Calendar, X, UserPlus, Check, Award } from 'lucide-react';
import { studentService } from '@/services';
import { StudentCategory, BeltColor, KidsBeltColor, Stripes } from '@/types';

interface QuickStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface QuickStudentForm {
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  category: StudentCategory;
  currentBelt: BeltColor | KidsBeltColor;
  currentStripes: Stripes;
}

const initialForm: QuickStudentForm = {
  fullName: '',
  phone: '',
  email: '',
  birthDate: '',
  category: 'adult',
  currentBelt: 'white',
  currentStripes: 0,
};

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

export function QuickStudentDialog({ open, onClose, onSuccess }: QuickStudentDialogProps) {
  const [form, setForm] = useState<QuickStudentForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = useCallback(<K extends keyof QuickStudentForm>(field: K, value: QuickStudentForm[K]) => {
    setForm((prev) => {
      // If category changes, reset belt to white
      if (field === 'category') {
        return { ...prev, [field]: value, currentBelt: 'white' as BeltColor | KidsBeltColor };
      }
      return { ...prev, [field]: value };
    });
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (!saving) {
      setForm(initialForm);
      setError(null);
      setSuccess(false);
      onClose();
    }
  }, [saving, onClose]);

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    if (!form.fullName.trim()) {
      setError('Nome completo e obrigatorio');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create minimal student record
      await studentService.create({
        fullName: form.fullName.trim(),
        phone: form.phone || undefined,
        email: form.email || undefined,
        birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
        category: form.category,
        currentBelt: form.currentBelt,
        currentStripes: form.currentStripes,
        status: 'active',
        startDate: new Date(),
        tuitionValue: 0,
        tuitionDay: 10,
      });

      setSuccess(true);

      // Close after brief success message
      setTimeout(() => {
        setForm(initialForm);
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error creating student:', err);
      setError('Erro ao cadastrar aluno. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [form, onClose, onSuccess]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={20} color="#fff" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Cadastro Rapido
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cadastre um novo aluno rapidamente
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} disabled={saving} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {success ? (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Check size={32} color="#16a34a" />
            </Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Aluno cadastrado!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {form.fullName} foi adicionado com sucesso.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Nome Completo"
              value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <User size={18} />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={form.category}
                  label="Categoria"
                  onChange={(e) => handleChange('category', e.target.value as StudentCategory)}
                >
                  <MenuItem value="adult">Adulto</MenuItem>
                  <MenuItem value="kids">Kids</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Faixa</InputLabel>
                <Select
                  value={form.currentBelt}
                  label="Faixa"
                  onChange={(e) => handleChange('currentBelt', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Award size={18} />
                    </InputAdornment>
                  }
                >
                  {(form.category === 'kids' ? kidsBelts : adultBelts).map((belt) => (
                    <MenuItem key={belt.value} value={belt.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
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
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Graus</InputLabel>
                <Select
                  value={form.currentStripes}
                  label="Graus"
                  onChange={(e) => handleChange('currentStripes', e.target.value as Stripes)}
                >
                  {[0, 1, 2, 3, 4].map((stripe) => (
                    <MenuItem key={stripe} value={stripe}>
                      {stripe}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Telefone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone size={18} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              fullWidth
              label="Data de Nascimento"
              type="date"
              value={form.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Calendar size={18} />
                  </InputAdornment>
                ),
              }}
            />

            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="caption">
                Para informacoes completas (endereco, responsavel, plano de mensalidade, etc),
                acesse o perfil do aluno apos o cadastro.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={18} />}
          >
            {saving ? 'Cadastrando...' : 'Cadastrar Aluno'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export default QuickStudentDialog;
