'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Autocomplete, TextField } from '@mui/material';
import { Calendar, Medal, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Competition,
  CompetitionResult,
  CompetitionPosition,
  CompetitionModality,
  CompetitionDivisionType,
  CompetitionEnrollment,
  AgeCategory,
  WEIGHT_CATEGORIES_CBJJ,
  AGE_CATEGORY_LABELS,
} from '@/types';

const positionOptions: { value: CompetitionPosition; label: string; icon: string }[] = [
  { value: 'gold', label: 'Ouro', icon: '🥇' },
  { value: 'silver', label: 'Prata', icon: '🥈' },
  { value: 'bronze', label: 'Bronze', icon: '🥉' },
  { value: 'participant', label: 'Participante', icon: '🎖️' },
];

interface StudentResultDialogProps {
  open: boolean;
  onClose: () => void;
  competition: Competition | null;
  existingResult: CompetitionResult | null;
  enrollment: CompetitionEnrollment | null;
  onSave: (data: {
    position: CompetitionPosition;
    ageCategory: AgeCategory;
    weightCategory: string;
    modality?: CompetitionModality;
    divisionType?: CompetitionDivisionType;
    notes?: string;
  }) => void;
  loading: boolean;
}

export function StudentResultDialog({
  open,
  onClose,
  competition,
  existingResult,
  enrollment,
  onSave,
  loading,
}: StudentResultDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [position, setPosition] = useState<CompetitionPosition>(existingResult?.position || 'participant');
  const [ageCategory, setAgeCategory] = useState<AgeCategory>(
    existingResult?.ageCategory || enrollment?.ageCategory || 'adult'
  );
  const [weightCategory, setWeightCategory] = useState(
    existingResult?.weightCategory || enrollment?.weightCategory || ''
  );
  const [modality, setModality] = useState<CompetitionModality>(
    existingResult?.modality || 'gi'
  );
  const [divisionType, setDivisionType] = useState<CompetitionDivisionType>(
    existingResult?.divisionType || 'weight'
  );
  const [notes, setNotes] = useState(existingResult?.notes || '');

  useEffect(() => {
    if (open) {
      setPosition(existingResult?.position || 'participant');
      setAgeCategory(existingResult?.ageCategory || enrollment?.ageCategory || 'adult');
      setWeightCategory(existingResult?.weightCategory || enrollment?.weightCategory || '');
      setModality(existingResult?.modality || 'gi');
      setDivisionType(existingResult?.divisionType || 'weight');
      setNotes(existingResult?.notes || '');
    }
  }, [open, existingResult, enrollment]);

  const weightCategories = [
    ...WEIGHT_CATEGORIES_CBJJ,
    ...(competition?.customWeightCategories || []),
  ];

  const handleSubmit = () => {
    onSave({
      position,
      ageCategory,
      weightCategory,
      modality,
      divisionType,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          {existingResult ? 'Editar Resultado' : 'Registrar Resultado'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {competition && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {competition.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar size={14} color="#666" />
              <Typography variant="body2" color="text.secondary">
                {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Resultado</InputLabel>
            <Select
              value={position}
              label="Resultado"
              onChange={(e) => setPosition(e.target.value as CompetitionPosition)}
              startAdornment={<Medal size={16} style={{ marginRight: 8, marginLeft: 8 }} />}
            >
              {positionOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{opt.icon}</span>
                    {opt.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Modality: Gi / No-Gi */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Modalidade
            </Typography>
            <ToggleButtonGroup
              value={modality}
              exclusive
              onChange={(_, val) => val && setModality(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="gi">Gi</ToggleButton>
              <ToggleButton value="nogi">No-Gi</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Division Type: Weight / Absolute */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Divisao
            </Typography>
            <ToggleButtonGroup
              value={divisionType}
              exclusive
              onChange={(_, val) => val && setDivisionType(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="weight">Peso</ToggleButton>
              <ToggleButton value="absolute">Absoluto</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControl fullWidth size="small">
            <InputLabel>Categoria de Idade</InputLabel>
            <Select
              value={ageCategory}
              label="Categoria de Idade"
              onChange={(e) => setAgeCategory(e.target.value as AgeCategory)}
              startAdornment={<Users size={16} style={{ marginRight: 8, marginLeft: 8 }} />}
            >
              {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            freeSolo
            options={weightCategories}
            value={weightCategory}
            onChange={(_, value) => setWeightCategory(value || '')}
            onInputChange={(_, value) => setWeightCategory(value)}
            renderInput={(params) => (
              <TextField {...params} label="Categoria de Peso" size="small" required />
            )}
          />

          <TextField
            label="Observacoes (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={2}
            size="small"
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !weightCategory}
          sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
        >
          {loading ? 'Salvando...' : existingResult ? 'Atualizar Resultado' : 'Salvar Resultado'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
