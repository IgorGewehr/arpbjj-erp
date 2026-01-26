'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { ArrowLeft, Save, User, Phone } from 'lucide-react';
import { useIsMonitor } from '@/hooks';
import { useFeedback } from '@/components/providers';
import { createStudentService } from '@/services';
import { useAcademy } from '@/contexts/AcademyContext';
import { BeltColor, KidsBeltColor, StudentCategory, Stripes } from '@/types';

// Belt options
const adultBeltOptions: { value: BeltColor; label: string }[] = [
  { value: 'white', label: 'Branca' },
  { value: 'blue', label: 'Azul' },
  { value: 'purple', label: 'Roxa' },
  { value: 'brown', label: 'Marrom' },
  { value: 'black', label: 'Preta' },
];

const kidsBeltOptions: { value: KidsBeltColor; label: string }[] = [
  { value: 'white', label: 'Branca' },
  { value: 'grey', label: 'Cinza' },
  { value: 'grey-white', label: 'Cinza/Branca' },
  { value: 'grey-black', label: 'Cinza/Preta' },
  { value: 'yellow', label: 'Amarela' },
  { value: 'yellow-white', label: 'Amarela/Branca' },
  { value: 'yellow-black', label: 'Amarela/Preta' },
  { value: 'orange', label: 'Laranja' },
  { value: 'orange-white', label: 'Laranja/Branca' },
  { value: 'orange-black', label: 'Laranja/Preta' },
  { value: 'green', label: 'Verde' },
  { value: 'green-white', label: 'Verde/Branca' },
  { value: 'green-black', label: 'Verde/Preta' },
];

const stripeOptions: Stripes[] = [0, 1, 2, 3, 4];

export default function MonitorNewStudentPage() {
  const router = useRouter();
  const isMonitor = useIsMonitor();
  const { success, error } = useFeedback();
  const { academyId } = useAcademy();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    phone: '',
    email: '',
    birthDate: '',
    category: 'adult' as StudentCategory,
    currentBelt: 'white' as BeltColor | KidsBeltColor,
    currentStripes: 0 as Stripes,
    startDate: new Date().toISOString().split('T')[0],
    // Guardian for kids
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  const handleBack = useCallback(() => {
    router.push('/portal/alunos');
  }, [router]);

  const handleChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Reset belt when category changes
      if (field === 'category') {
        updated.currentBelt = 'white';
        updated.currentStripes = 0;
      }
      return updated;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!academyId) {
      error('Academia nao encontrada');
      return;
    }

    if (!formData.fullName.trim()) {
      error('Nome completo e obrigatorio');
      return;
    }

    setSaving(true);
    try {
      const studentService = createStudentService(academyId);

      const studentData: Parameters<typeof studentService.create>[0] = {
        fullName: formData.fullName.trim(),
        nickname: formData.nickname.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        category: formData.category,
        currentBelt: formData.currentBelt,
        currentStripes: formData.currentStripes,
        startDate: new Date(formData.startDate),
        status: 'active',
        // NO FINANCIAL FIELDS - monitors can't set these
        tuitionValue: 0,
        tuitionDay: 10,
      };

      // Add guardian for kids
      if (formData.category === 'kids' && formData.guardianName) {
        studentData.guardian = {
          name: formData.guardianName.trim(),
          phone: formData.guardianPhone.trim(),
          email: formData.guardianEmail.trim() || undefined,
          relationship: 'Responsavel',
        };
      }

      await studentService.create(studentData);
      success('Aluno cadastrado com sucesso!');
      router.push('/portal/alunos');
    } catch (err) {
      console.error('Error creating student:', err);
      error('Erro ao cadastrar aluno');
    } finally {
      setSaving(false);
    }
  }, [academyId, formData, router, success, error]);

  const beltOptions = formData.category === 'kids' ? kidsBeltOptions : adultBeltOptions;

  if (!isMonitor) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Voce nao tem permissao para acessar esta pagina.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handleBack} sx={{ bgcolor: 'action.hover' }}>
          <ArrowLeft size={20} />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          Novo Aluno
        </Typography>
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <User size={18} /> Informacoes Basicas
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome Completo *"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Apelido"
              value={formData.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                label="Categoria"
              >
                <MenuItem value="adult">Adulto</MenuItem>
                <MenuItem value="kids">Kids</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Phone size={18} /> Contato
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Telefone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Data de Inicio"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          Graduacao
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Faixa Atual</InputLabel>
              <Select
                value={formData.currentBelt}
                onChange={(e) => handleChange('currentBelt', e.target.value)}
                label="Faixa Atual"
              >
                {beltOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Graus</InputLabel>
              <Select
                value={formData.currentStripes}
                onChange={(e) => handleChange('currentStripes', e.target.value)}
                label="Graus"
              >
                {stripeOptions.map((s) => (
                  <MenuItem key={s} value={s}>{s} grau{s !== 1 ? 's' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Guardian Section for Kids */}
        {formData.category === 'kids' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Responsavel (Obrigatorio para Kids)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nome do Responsavel"
                  value={formData.guardianName}
                  onChange={(e) => handleChange('guardianName', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Telefone do Responsavel"
                  value={formData.guardianPhone}
                  onChange={(e) => handleChange('guardianPhone', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email do Responsavel"
                  type="email"
                  value={formData.guardianEmail}
                  onChange={(e) => handleChange('guardianEmail', e.target.value)}
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Info about financial */}
        <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
          <Typography variant="body2">
            As informacoes financeiras (plano, mensalidade) devem ser configuradas pelo administrador.
          </Typography>
        </Alert>

        {/* Submit Button */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={handleBack} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSubmit}
            disabled={saving || !formData.fullName.trim()}
          >
            {saving ? 'Salvando...' : 'Cadastrar Aluno'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
