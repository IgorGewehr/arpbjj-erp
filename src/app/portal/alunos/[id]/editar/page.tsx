'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Skeleton,
} from '@mui/material';
import { ArrowLeft, Save, User, Phone } from 'lucide-react';
import { useIsMonitor, useStudent } from '@/hooks';
import { useFeedback } from '@/components/providers';
import { createStudentService } from '@/services';
import { useAcademy } from '@/contexts/AcademyContext';
import { StudentCategory } from '@/types';

export default function MonitorEditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const isMonitor = useIsMonitor();
  const { success, error } = useFeedback();
  const { academyId } = useAcademy();
  const { student, isLoading } = useStudent(studentId);

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    email: '',
    birthDate: '',
    healthNotes: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
  });

  // Populate form when student loads
  useEffect(() => {
    if (student) {
      setFormData({
        nickname: student.nickname || '',
        phone: student.phone || '',
        email: student.email || '',
        birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
        healthNotes: student.healthNotes || '',
        guardianName: student.guardian?.name || '',
        guardianPhone: student.guardian?.phone || '',
        guardianEmail: student.guardian?.email || '',
      });
    }
  }, [student]);

  const handleBack = useCallback(() => {
    router.push(`/portal/alunos/${studentId}`);
  }, [router, studentId]);

  const handleChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!academyId || !student) {
      error('Dados invalidos');
      return;
    }

    setSaving(true);
    try {
      const studentService = createStudentService(academyId);

      // Only update fields monitors are allowed to change
      // NOT: currentBelt, currentStripes, status, tuitionValue, tuitionDay, planId
      const updateData: Record<string, unknown> = {
        nickname: formData.nickname.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : null,
        healthNotes: formData.healthNotes.trim() || null,
      };

      // Update guardian for kids
      if (student.category === 'kids') {
        updateData.guardian = formData.guardianName ? {
          name: formData.guardianName.trim(),
          phone: formData.guardianPhone.trim(),
          email: formData.guardianEmail.trim() || undefined,
          relationship: student.guardian?.relationship || 'Responsavel',
        } : null;
      }

      await studentService.update(studentId, updateData);
      success('Aluno atualizado com sucesso!');
      router.push(`/portal/alunos/${studentId}`);
    } catch (err) {
      console.error('Error updating student:', err);
      error('Erro ao atualizar aluno');
    } finally {
      setSaving(false);
    }
  }, [academyId, student, studentId, formData, router, success, error]);

  if (!isMonitor) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Voce nao tem permissao para acessar esta pagina.
        </Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={200} height={32} />
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Aluno nao encontrado.
        </Alert>
        <Button startIcon={<ArrowLeft size={18} />} onClick={() => router.push('/portal/alunos')} sx={{ mt: 2 }}>
          Voltar
        </Button>
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
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Editar Aluno
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {student.fullName}
          </Typography>
        </Box>
      </Box>

      {/* Form */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <User size={18} /> Informacoes Basicas
        </Typography>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2">
            Como monitor, voce pode editar informacoes de contato e dados pessoais.
            Para alterar faixa, status ou dados financeiros, solicite ao administrador.
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome Completo"
              value={student.fullName}
              disabled
              helperText="Alteracao de nome requer autorizacao do admin"
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
            <TextField
              fullWidth
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
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
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Informacoes Medicas
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Observacoes de Saude"
              value={formData.healthNotes}
              onChange={(e) => handleChange('healthNotes', e.target.value)}
              multiline
              rows={3}
              placeholder="Alergias, condicoes medicas, etc."
            />
          </Grid>
        </Grid>

        {/* Guardian Section for Kids */}
        {student.category === 'kids' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Responsavel
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

        {/* Submit Button */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={handleBack} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alteracoes'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
