'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Stack,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { ArrowLeft, Save, Send, X, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { createNewsService } from '@/services/newsService';
import { News } from '@/types';
import { slugify } from '@/utils/slugify';
import { useCreateNews, useUpdateNews } from '@/hooks/useNews';
import { CoverImageUploader } from './CoverImageUploader';

const EXCERPT_MAX = 200;

interface NewsFormProps {
  mode: 'create' | 'edit';
  initial?: News | null;
}

interface FormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  content: string;
  tags: string[];
  coverUrl?: string;
  coverStoragePath?: string;
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  slugTouched: false,
  excerpt: '',
  content: '',
  tags: [],
  coverUrl: undefined,
  coverStoragePath: undefined,
};

export function NewsForm({ mode, initial }: NewsFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { academyId } = useAcademy();
  const { error: showError } = useFeedback();

  const createMutation = useCreateNews();
  const updateMutation = useUpdateNews();

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          slugTouched: true,
          excerpt: initial.excerpt,
          content: initial.content,
          tags: initial.tags ?? [],
          coverUrl: initial.coverUrl,
          coverStoragePath: initial.coverStoragePath,
        }
      : emptyForm
  );
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewTab, setPreviewTab] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!form.slugTouched && form.title) {
      setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [form.title, form.slugTouched]);

  const newsService = useMemo(
    () => createNewsService(academyId || 'default'),
    [academyId]
  );

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (form.tags.includes(value)) {
      setTagInput('');
      return;
    }
    setForm((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) next.title = 'Titulo e obrigatorio';
    if (!form.slug.trim()) next.slug = 'Slug e obrigatorio';
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      next.slug = 'Use apenas letras minusculas, numeros e hifens';
    if (!form.excerpt.trim()) next.excerpt = 'Resumo e obrigatorio';
    else if (form.excerpt.length > EXCERPT_MAX)
      next.excerpt = `Resumo deve ter no maximo ${EXCERPT_MAX} caracteres`;
    if (!form.content.trim()) next.content = 'Conteudo e obrigatorio';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const ensureUniqueSlug = async (): Promise<boolean> => {
    try {
      const existing = await newsService.getBySlug(form.slug);
      if (existing && existing.id !== initial?.id) {
        setErrors((prev) => ({ ...prev, slug: 'Ja existe uma noticia com esse slug' }));
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  const submit = async (publish: boolean) => {
    if (!validate()) return;
    if (!user || !academyId) return;

    setSubmitting(true);
    try {
      const slugOk = await ensureUniqueSlug();
      if (!slugOk) return;

      if (mode === 'create') {
        await createMutation.mutateAsync({
          title: form.title.trim(),
          slug: form.slug.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content,
          tags: form.tags.length ? form.tags : undefined,
          coverUrl: form.coverUrl,
          coverStoragePath: form.coverStoragePath,
          isPublished: publish,
          publishedAt: publish ? new Date() : undefined,
          authorUid: user.id,
          authorName: user.displayName,
        });
      } else if (initial) {
        const wasPublished = initial.isPublished;
        await updateMutation.mutateAsync({
          id: initial.id,
          data: {
            title: form.title.trim(),
            slug: form.slug.trim(),
            excerpt: form.excerpt.trim(),
            content: form.content,
            tags: form.tags,
            coverUrl: form.coverUrl,
            coverStoragePath: form.coverStoragePath,
            isPublished: publish,
            publishedAt: publish && !wasPublished ? new Date() : initial.publishedAt,
          },
        });
      }
      router.push('/noticias');
    } catch {
      showError('Erro ao salvar noticia');
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
              <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {mode === 'create' ? 'Nova Noticia' : 'Editar Noticia'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {mode === 'create'
                  ? 'Crie uma noticia para o site da academia'
                  : 'Atualize os dados da noticia'}
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
                  placeholder="Ex: Festival da academia em junho"
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

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Resumo"
                  value={form.excerpt}
                  onChange={(e) => setField('excerpt', e.target.value.slice(0, EXCERPT_MAX))}
                  error={!!errors.excerpt}
                  helperText={
                    errors.excerpt || `${form.excerpt.length}/${EXCERPT_MAX} caracteres`
                  }
                  fullWidth
                  required
                  multiline
                  rows={2}
                  placeholder="Resumo curto exibido na listagem"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CoverImageUploader
                  basePath={`academies/${academyId}/news`}
                  coverUrl={form.coverUrl}
                  coverStoragePath={form.coverStoragePath}
                  onChange={(data) =>
                    setForm((prev) => ({
                      ...prev,
                      coverUrl: data.coverUrl,
                      coverStoragePath: data.coverStoragePath,
                    }))
                  }
                  helperText="Imagem destacada exibida no topo da noticia."
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Tags
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {form.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      deleteIcon={<X size={14} />}
                    />
                  ))}
                </Stack>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Adicionar tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    sx={{ maxWidth: 280 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Plus size={16} />}
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    Adicionar
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={previewTab} onChange={(_, v) => setPreviewTab(v)}>
                    <Tab label="Conteudo (Markdown)" />
                    <Tab label="Visualizacao" />
                  </Tabs>
                </Box>
                {previewTab === 0 ? (
                  <TextField
                    label="Conteudo"
                    value={form.content}
                    onChange={(e) => setField('content', e.target.value)}
                    error={!!errors.content}
                    helperText={errors.content || 'Aceita Markdown'}
                    fullWidth
                    required
                    multiline
                    minRows={10}
                    placeholder={'## Subtitulo\n\nTexto do paragrafo...'}
                  />
                ) : (
                  <Paper variant="outlined" sx={{ p: 2, minHeight: 240, whiteSpace: 'pre-wrap' }}>
                    {form.content ? (
                      <Typography variant="body2" component="div">
                        {form.content}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum conteudo para exibir
                      </Typography>
                    )}
                  </Paper>
                )}
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
                  submitting ? <CircularProgress size={16} color="inherit" /> : <Send size={18} />
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

export default NewsForm;
