'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  Skeleton,
  Switch,
  CircularProgress,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Save, History, DollarSign, ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback, usePermissions } from '@/components/providers';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { planService } from '@/services/planService';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { Student, Plan } from '@/types';

const BELT_LABELS: Record<string, string> = {
  white: 'Branca', blue: 'Azul', purple: 'Roxa', brown: 'Marrom', black: 'Preta',
  grey: 'Cinza', yellow: 'Amarela', orange: 'Laranja', green: 'Verde',
};

export default function StudentProfilePage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const { linkedStudentIds } = usePermissions();

  const studentId = linkedStudentIds[0] || user?.studentId;

  const [student, setStudent] = useState<Student | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  // Only consider having a plan if the plan actually exists
  const hasValidPlan = !!student?.planId && !!plan;

  // Form fields
  const [form, setForm] = useState({
    nickname: '',
    phone: '',
    email: '',
    cpf: '',
    rg: '',
    weight: '',
    birthDate: '',
    zipCode: '',
    street: '',
    addressNumber: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    bloodType: '',
    allergies: '',
    healthNotes: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    isProfilePublic: false,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        const data = await studentService.getById(studentId);
        if (data) {
          setStudent(data);
          setForm({
            nickname: data.nickname || '',
            phone: data.phone || '',
            email: data.email || '',
            cpf: data.cpf || '',
            rg: data.rg || '',
            weight: data.weight?.toString() || '',
            birthDate: data.birthDate ? format(new Date(data.birthDate), 'yyyy-MM-dd') : '',
            zipCode: data.address?.zipCode || '',
            street: data.address?.street || '',
            addressNumber: data.address?.number || '',
            complement: data.address?.complement || '',
            neighborhood: data.address?.neighborhood || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            bloodType: data.bloodType || '',
            allergies: data.allergies?.join(', ') || '',
            healthNotes: data.healthNotes || '',
            emergencyName: data.emergencyContact?.name || '',
            emergencyPhone: data.emergencyContact?.phone || '',
            emergencyRelationship: data.emergencyContact?.relationship || '',
            isProfilePublic: data.isProfilePublic ?? false,
          });

          // Validate if plan actually exists
          if (data.planId) {
            const planData = await planService.getById(data.planId);
            setPlan(planData);
          } else {
            setPlan(null);
          }

          const count = await attendanceService.getStudentAttendanceCount(studentId);
          setAttendanceCount(count);
        }
      } catch {
        showError('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, showError]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = useCallback(async () => {
    if (!student || !studentId) return;

    setSaving(true);
    try {
      await studentService.update(studentId, {
        nickname: form.nickname.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        cpf: form.cpf.trim() || undefined,
        rg: form.rg.trim() || undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
        address: form.street.trim() || form.city.trim() ? {
          street: form.street.trim(),
          number: form.addressNumber.trim(),
          complement: form.complement.trim() || undefined,
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zipCode: form.zipCode.trim(),
        } : undefined,
        bloodType: form.bloodType.trim() || undefined,
        allergies: form.allergies.trim() ? form.allergies.split(',').map((a) => a.trim()) : undefined,
        healthNotes: form.healthNotes.trim() || undefined,
        emergencyContact: form.emergencyName.trim() || form.emergencyPhone.trim() ? {
          name: form.emergencyName.trim(),
          phone: form.emergencyPhone.trim(),
          relationship: form.emergencyRelationship.trim(),
        } : undefined,
        isProfilePublic: form.isProfilePublic,
      });
      success('Perfil atualizado');
    } catch {
      showError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [student, studentId, form, success, showError]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={120} height={28} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={80} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">Perfil não encontrado</Typography>
      </Box>
    );
  }

  const trainingMonths = Math.floor(
    (new Date().getTime() - new Date(student.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Mobile navigation links (for "Mais" menu items not in bottom nav)
  const mobileNavLinks = [
    { label: 'Linha do Tempo', path: '/portal/linha-do-tempo', icon: History, show: true },
    { label: 'Financeiro', path: '/portal/financeiro', icon: DollarSign, show: hasValidPlan },
  ].filter(link => link.show);

  return (
    <Box>
      {/* Mobile Navigation Links */}
      {isMobile && mobileNavLinks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {mobileNavLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Box
                key={link.path}
                onClick={() => router.push(link.path)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  mb: 1,
                  bgcolor: '#fff',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                  '&:active': { bgcolor: 'grey.50' },
                }}
              >
                <Icon size={20} color="#666" />
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                  {link.label}
                </Typography>
                <ChevronRight size={18} color="#999" />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Header */}
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}
      >
        Meu Perfil
      </Typography>

      {/* Profile Summary */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          bgcolor: '#fff',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src={student.photoUrl}
            sx={{ width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 }, bgcolor: '#111', fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 600 }}
          >
            {student.fullName.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight={600} noWrap sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              {student.fullName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <BeltDisplay belt={student.currentBelt} stripes={student.currentStripes} size="small" />
              <Typography variant="caption" color="text.secondary">
                {BELT_LABELS[student.currentBelt]} • {student.currentStripes} grau{student.currentStripes !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{attendanceCount}</Typography>
            <Typography variant="caption" color="text.secondary">presenças</Typography>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>{trainingMonths}</Typography>
            <Typography variant="caption" color="text.secondary">meses</Typography>
          </Box>
        </Box>
      </Box>

      {/* Read-only Info */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Gerenciado pela academia
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
            gap: 1.5,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">Início</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {format(student.startDate, "dd/MM/yyyy", { locale: ptBR })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {student.status === 'active' ? 'Ativo' : student.status === 'injured' ? 'Lesionado' : 'Inativo'}
            </Typography>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 2', sm: 'span 1' } }}>
            <Typography variant="caption" color="text.secondary">Plano</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              {hasValidPlan && plan ? `R$ ${plan.monthlyValue?.toLocaleString('pt-BR')}/mês` : 'Projeto Social'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Editable Form */}
      <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid', borderColor: 'grey.200', p: { xs: 2, sm: 3 } }}>
        {/* Basic Info */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Dados pessoais
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 3 }}>
          <TextField label="Apelido" value={form.nickname} onChange={handleChange('nickname')} size="small" fullWidth />
          <TextField
            label="Data de nascimento"
            value={form.birthDate}
            onChange={handleChange('birthDate')}
            size="small"
            fullWidth
            type="date"
            InputLabelProps={{ shrink: true }}
          />
          <TextField label="Telefone" value={form.phone} onChange={handleChange('phone')} size="small" fullWidth />
          <TextField label="Email" value={form.email} onChange={handleChange('email')} size="small" fullWidth />
          <TextField label="CPF" value={form.cpf} onChange={handleChange('cpf')} size="small" fullWidth />
          <TextField label="RG" value={form.rg} onChange={handleChange('rg')} size="small" fullWidth />
          <TextField label="Peso (kg)" value={form.weight} onChange={handleChange('weight')} size="small" fullWidth type="number" />
        </Box>

        {/* Address */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Endereço
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5, mb: 3 }}>
          <TextField label="CEP" value={form.zipCode} onChange={handleChange('zipCode')} size="small" fullWidth />
          <TextField label="Rua" value={form.street} onChange={handleChange('street')} size="small" fullWidth sx={{ gridColumn: { xs: '1', sm: 'span 2' } }} />
          <TextField label="Número" value={form.addressNumber} onChange={handleChange('addressNumber')} size="small" fullWidth />
          <TextField label="Complemento" value={form.complement} onChange={handleChange('complement')} size="small" fullWidth />
          <TextField label="Bairro" value={form.neighborhood} onChange={handleChange('neighborhood')} size="small" fullWidth />
          <TextField label="Cidade" value={form.city} onChange={handleChange('city')} size="small" fullWidth />
          <TextField label="Estado" value={form.state} onChange={handleChange('state')} size="small" fullWidth />
        </Box>

        {/* Health */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Saúde
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 3 }}>
          <TextField label="Tipo sanguíneo" value={form.bloodType} onChange={handleChange('bloodType')} size="small" fullWidth placeholder="Ex: A+, O-" />
          <TextField label="Alergias" value={form.allergies} onChange={handleChange('allergies')} size="small" fullWidth placeholder="Separar por vírgula" />
          <TextField
            label="Observações de saúde"
            value={form.healthNotes}
            onChange={handleChange('healthNotes')}
            size="small"
            fullWidth
            multiline
            rows={2}
            sx={{ gridColumn: { xs: '1', sm: 'span 2' } }}
          />
        </Box>

        {/* Emergency */}
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Contato de emergência
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5, mb: 3 }}>
          <TextField label="Nome" value={form.emergencyName} onChange={handleChange('emergencyName')} size="small" fullWidth />
          <TextField label="Telefone" value={form.emergencyPhone} onChange={handleChange('emergencyPhone')} size="small" fullWidth />
          <TextField label="Parentesco" value={form.emergencyRelationship} onChange={handleChange('emergencyRelationship')} size="small" fullWidth />
        </Box>

        {/* Privacy */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
          <Box>
            <Typography variant="body2" fontWeight={500}>Perfil público</Typography>
            <Typography variant="caption" color="text.secondary">
              Visível para outros alunos
            </Typography>
          </Box>
          <Switch
            checked={form.isProfilePublic}
            onChange={(e) => setForm((prev) => ({ ...prev, isProfilePublic: e.target.checked }))}
          />
        </Box>

        {/* Save */}
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
          sx={{
            bgcolor: '#111',
            '&:hover': { bgcolor: '#333' },
            textTransform: 'none',
            fontWeight: 600,
            py: 1.25,
          }}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </Box>
    </Box>
  );
}
