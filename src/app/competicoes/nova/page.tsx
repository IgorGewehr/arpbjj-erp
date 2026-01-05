'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { ArrowLeft, Save, Trophy, Bus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useFeedback } from '@/components/providers';
import { useAuth } from '@/components/providers/AuthProvider';
import { competitionService } from '@/services/competitionService';
import { CompetitionStatus, CompetitionTransportStatus, TRANSPORT_STATUS_LABELS } from '@/types';
import { format, parseISO } from 'date-fns';

// ============================================
// Form State Interface
// ============================================
interface FormData {
  name: string;
  date: string; // ISO date string
  location: string;
  description: string;
  status: CompetitionStatus;
  registrationDeadline: string; // ISO date string
  // Transport fields
  transportStatus: CompetitionTransportStatus;
  transportNotes: string;
  transportCapacity: string;
}

const initialFormData: FormData = {
  name: '',
  date: '',
  location: '',
  description: '',
  status: 'upcoming',
  registrationDeadline: '',
  transportStatus: 'pending',
  transportNotes: '',
  transportCapacity: '',
};

// ============================================
// Main Page Component
// ============================================
export default function NewCompetitionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // ============================================
  // Validation
  // ============================================
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Local é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================
  // Handle Submit
  // ============================================
  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) return;

    try {
      setLoading(true);

      const competitionData = {
        name: formData.name.trim(),
        date: parseISO(formData.date),
        location: formData.location.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        registrationDeadline: formData.registrationDeadline
          ? parseISO(formData.registrationDeadline)
          : undefined,
        // Transport fields
        transportStatus: formData.transportStatus,
        transportNotes: formData.transportNotes.trim() || undefined,
        transportCapacity: formData.transportCapacity
          ? parseInt(formData.transportCapacity, 10)
          : undefined,
        createdBy: user.id,
      };

      const newCompetition = await competitionService.create(competitionData, user.id);
      success('Competição criada com sucesso!');
      router.push(`/competicoes/${newCompetition.id}`);
    } catch (err) {
      showError('Erro ao criar competição');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Handle Field Change
  // ============================================
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout title="Nova Competição">
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.back()}>
              <ArrowLeft />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={700}>
                Nova Competição
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cadastre uma nova competição
              </Typography>
            </Box>
          </Box>

          {/* Form */}
          <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 800 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                }}
              >
                <Trophy size={28} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Informações da Competição
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Preencha os dados básicos da competição
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Name */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Nome da Competição"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                  placeholder="Ex: Campeonato Estadual de Jiu-Jitsu 2024"
                />
              </Grid>

              {/* Date */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Data da Competição"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  error={!!errors.date}
                  helperText={errors.date}
                  fullWidth
                  required
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Grid>

              {/* Status */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as CompetitionStatus)}
                    label="Status"
                  >
                    <MenuItem value="upcoming">Próxima</MenuItem>
                    <MenuItem value="ongoing">Em Andamento</MenuItem>
                    <MenuItem value="completed">Concluída</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Location */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Local"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  error={!!errors.location}
                  helperText={errors.location}
                  fullWidth
                  required
                  placeholder="Ex: Ginásio Municipal de São Paulo"
                />
              </Grid>

              {/* Registration Deadline */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Prazo para Inscrição"
                  type="date"
                  value={formData.registrationDeadline}
                  onChange={(e) => handleChange('registrationDeadline', e.target.value)}
                  fullWidth
                  helperText="Opcional - Data limite para os alunos se inscreverem"
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Grid>

              {/* Description */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Descrição"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Informações adicionais sobre a competição..."
                />
              </Grid>
            </Grid>

            {/* Transport Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 4, mb: 3 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'info.light',
                  color: 'info.dark',
                }}
              >
                <Bus size={28} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Transporte
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Informações sobre transporte para a competição
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Transport Status */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status do Transporte</InputLabel>
                  <Select
                    value={formData.transportStatus}
                    onChange={(e) => handleChange('transportStatus', e.target.value as CompetitionTransportStatus)}
                    label="Status do Transporte"
                  >
                    {Object.entries(TRANSPORT_STATUS_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Transport Capacity */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Capacidade de Vagas"
                  type="number"
                  value={formData.transportCapacity}
                  onChange={(e) => handleChange('transportCapacity', e.target.value)}
                  fullWidth
                  helperText="Número de vagas disponíveis no transporte"
                  slotProps={{
                    input: { inputProps: { min: 0 } },
                  }}
                  disabled={formData.transportStatus === 'no_transport'}
                />
              </Grid>

              {/* Transport Notes */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Informações sobre Transporte"
                  value={formData.transportNotes}
                  onChange={(e) => handleChange('transportNotes', e.target.value)}
                  multiline
                  rows={2}
                  fullWidth
                  placeholder="Ex: Saída às 6h da academia, retorno após as lutas..."
                  disabled={formData.transportStatus === 'no_transport'}
                />
              </Grid>
            </Grid>

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={<Save size={20} />}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Criar Competição'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
