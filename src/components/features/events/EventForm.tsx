'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { createAcademyEventService } from '@/services/academyEventService';
import { AcademyEvent } from '@/types';
import { slugify } from '@/utils/slugify';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { CoverImageUploader } from '@/components/features/news/CoverImageUploader';

interface EventFormProps {
  mode: 'create' | 'edit';
  initial?: AcademyEvent | null;
}

interface FormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  ctaUrl: string;
  ctaLabel: string;
  isPublished: boolean;
  coverUrl?: string;
  coverStoragePath?: string;
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  slugTouched: false,
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  ctaUrl: '',
  ctaLabel: '',
  isPublished: false,
  coverUrl: undefined,
  coverStoragePath: undefined,
};

const toLocalInputValue = (date: Date): string => {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export function EventForm({ mode, initial }: EventFormProps) {
  const router = useRouter();
  const { academyId } = useAcademy();
  const { error: showError } = useFeedback();

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          slugTouched: true,
          description: initial.description,
          startDate: toLocalInputValue(new Date(initial.startDate)),
          endDate: initial.endDate ? toLocalInputValue(new Date(initial.endDate)) : '',
          location: initial.location ?? '',
          ctaUrl: initial.ctaUrl ?? '',
          ctaLabel: initial.ctaLabel ?? '',
          isPublished: initial.isPublished,
          coverUrl: initial.coverUrl,
          coverStoragePath: initial.coverStoragePath,
        }
      : emptyForm
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!form.slugTouched && form.title) {
      setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [form.title, form.slugTouched]);

  const eventService = useMemo(
    () => createAcademyEventService(academyId || 'default'),
    [academyId]
  );

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) next.title = 'Titulo e obrigatorio';
    if (!form.slug.trim()) next.slug = 'Slug e obrigatorio';
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      next.slug = 'Use apenas letras minusculas, numeros e hifens';
    if (!form.startDate) next.startDate = 'Data de inicio e obrigatoria';
    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) < new Date(form.startDate)
    ) {
      next.endDate = 'A data de termino deve ser apos o inicio';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const ensureUniqueSlug = async (): Promise<boolean> => {
    try {
      const existing = await eventService.getBySlug(form.slug);
      if (existing && existing.id !== initial?.id) {
        setErrors((prev) => ({ ...prev, slug: 'Ja existe um evento com esse slug' }));
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const submit = async (publish?: boolean) => {
    if (!validate()) return;
    if (!academyId) return;

    const isPublished = publish !== undefined ? publish : form.isPublished;

    setSubmitting(true);
    try {
      const slugOk = await ensureUniqueSlug();
      if (!slugOk) return;

      if (mode === 'create') {
        await createMutation.mutateAsync({
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description,
          startDate: new Date(form.startDate),
          endDate: form.endDate ? new Date(form.endDate) : undefined,
          location: form.location.trim() || undefined,
          ctaUrl: form.ctaUrl.trim() || undefined,
          ctaLabel: form.ctaLabel.trim() || undefined,
          isPublished,
          coverUrl: form.coverUrl,
          coverStoragePath: form.coverStoragePath,
        });
      } else if (initial) {
        await updateMutation.mutateAsync({
          id: initial.id,
          data: {
            title: form.title.trim(),
            slug: form.slug.trim(),
            description: form.description,
            startDate: new Date(form.startDate),
            endDate: form.endDate ? new Date(form.endDate) : undefined,
            location: form.location.trim() || undefined,
            ctaUrl: form.ctaUrl.trim() || undefined,
            ctaLabel: form.ctaLabel.trim() || undefined,
            isPublished,
            coverUrl: form.coverUrl,
            coverStoragePath: form.coverStoragePath,
          },
        });
      }
      router.push('/eventos');
    } catch {
      showError('Erro ao salvar evento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.back()} aria-label="Voltar">
              <ArrowLeft />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                {mode === 'create' ? 'Novo Evento' : 'Editar Evento'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {mode === 'create'
                  ? 'Crie um evento para o site da academia'
                  : 'Atualize os dados do evento'}
              </Typography>
            </Box>
          </Box>

          <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, maxWidth: 960 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Titulo"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                  fullWidth
                  required
                  placeholder="Ex: Seminario com faixa preta convidado"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Slug"
                  value={form.slug}
                  onChange={(e) => {
                    setField('slug', slugify(e.target.value));
                    setForm((prev) => ({ ...prev, slugTouched: true }));
                  }}
                  error={!!errors.slug}
                  helperText={
                    errors.slug || 'Identificador na URL publica. Gerado automaticamente do titulo.'
                  }
                  fullWidth
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Inicio"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setField('startDate', e.target.value)}
                  error={!!errors.startDate}
                  helperText={errors.startDate}
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Termino"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setField('endDate', e.target.value)}
                  error={!!errors.endDate}
                  helperText={errors.endDate || 'Opcional'}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Local"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  fullWidth
                  placeholder="Ex: Sede principal - rua tal"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CoverImageUploader
                  basePath={`academies/${academyId}/events`}
                  coverUrl={form.coverUrl}
                  coverStoragePath={form.coverStoragePath}
                  onChange={(data) =>
                    setForm((prev) => ({
                      ...prev,
                      coverUrl: data.coverUrl,
                      coverStoragePath: data.coverStoragePath,
                    }))
                  }
                  helperText="Imagem destacada exibida na pagina do evento."
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="URL de inscricao (CTA)"
                  value={form.ctaUrl}
                  onChange={(e) => setField('ctaUrl', e.target.value)}
                  fullWidth
                  placeholder="https://..."
                  helperText="Opcional"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Texto do botao (CTA)"
                  value={form.ctaLabel}
                  onChange={(e) => setField('ctaLabel', e.target.value)}
                  fullWidth
                  placeholder="Ex: Inscreva-se"
                  helperText="Opcional"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Descricao"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  fullWidth
                  multiline
                  minRows={6}
                  placeholder="Detalhes do evento (aceita Markdown)..."
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isPublished}
                      onChange={(e) => setField('isPublished', e.target.checked)}
                    />
                  }
                  label="Publicado no site"
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 2,
                mt: 4,
                flexWrap: 'wrap',
              }}
            >
              <Button variant="text" onClick={() => router.back()} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="outlined"
                startIcon={
                  submitting ? <CircularProgress size={16} /> : <Save size={18} />
                }
                onClick={() => submit(false)}
                disabled={submitting}
              >
                Salvar como rascunho
              </Button>
              <Button
                variant="contained"
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Send size={18} />
                  )
                }
                onClick={() => submit(true)}
                disabled={submitting}
              >
                {mode === 'create' ? 'Publicar' : 'Salvar e publicar'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default EventForm;
