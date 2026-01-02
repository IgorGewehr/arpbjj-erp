'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Skeleton,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  User,
  Calendar,
  Phone,
  Mail,
  Award,
  Clock,
  Shield,
  Heart,
  AlertCircle,
  Save,
  CheckCircle,
  Lock,
  Unlock,
  Trophy,
  Target,
} from 'lucide-react';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { competitionService } from '@/services/competitionService';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { getBeltChipColor } from '@/lib/theme';
import { Student } from '@/types';

// ============================================
// Belt Labels
// ============================================
const beltLabels: Record<string, string> = {
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
  grey: 'Cinza',
  yellow: 'Amarela',
  orange: 'Laranja',
  green: 'Verde',
};

// ============================================
// Main Component
// ============================================
export default function StudentProfilePage() {
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [cpf, setCpf] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isProfilePublic, setIsProfilePublic] = useState(false);

  // Stats
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [medalCount, setMedalCount] = useState({ gold: 0, silver: 0, bronze: 0 });

  // Load student data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.studentId) {
        setLoading(false);
        return;
      }

      try {
        const studentData = await studentService.getById(user.studentId);
        if (studentData) {
          setStudent(studentData);
          setCpf(studentData.cpf || '');
          setBloodType(studentData.bloodType || '');
          setAllergies(studentData.allergies?.join(', ') || '');
          // Format emergency contact as string for display
          if (studentData.emergencyContact) {
            const ec = studentData.emergencyContact;
            setEmergencyContact(`${ec.name} - ${ec.phone}${ec.relationship ? ` (${ec.relationship})` : ''}`);
          }
          setIsProfilePublic(studentData.isProfilePublic ?? false);

          // Load attendance count
          const count = await attendanceService.getStudentAttendanceCount(user.studentId);
          setAttendanceCount(count);

          // Load medal count
          const medals = await competitionService.getMedalCount(user.studentId);
          setMedalCount(medals);
        }
      } catch (err) {
        showError('Erro ao carregar dados do perfil');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.studentId, showError]);

  // Calculate stats
  const trainingTime = student ? (() => {
    const months = differenceInMonths(new Date(), student.startDate);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) {
      return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mês${remainingMonths !== 1 ? 'es' : ''}`;
    }
    return `${months} mês${months !== 1 ? 'es' : ''}`;
  })() : '';

  const age = student && student.birthDate ? differenceInYears(new Date(), student.birthDate) : null;

  // Handle save
  const handleSave = useCallback(async () => {
    if (!student || !user?.studentId) return;

    setSaving(true);
    try {
      await studentService.update(user.studentId, {
        cpf: cpf.trim() || undefined,
        bloodType: bloodType.trim() || undefined,
        allergies: allergies.trim() ? allergies.split(',').map(a => a.trim()) : undefined,
        isProfilePublic,
      });
      success('Perfil atualizado com sucesso!');
    } catch (err) {
      showError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  }, [student, user?.studentId, cpf, bloodType, allergies, isProfilePublic, success, showError]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={200} sx={{ mb: 3, borderRadius: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!student) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
        <User size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
        <Typography variant="h6" gutterBottom>
          Perfil não encontrado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Não foi possível carregar seus dados. Entre em contato com a academia.
        </Typography>
      </Paper>
    );
  }

  const beltColor = getBeltChipColor(student.currentBelt);

  return (
    <Box>
      {/* Hero Header */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${beltColor.bg} 0%, ${beltColor.bg}88 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -50,
            top: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: 50,
            bottom: -80,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
          <Avatar
            src={student.photoUrl}
            sx={{
              width: 120,
              height: 120,
              bgcolor: beltColor.text,
              color: beltColor.bg,
              fontSize: '2.5rem',
              fontWeight: 700,
              border: '4px solid white',
              boxShadow: 3,
            }}
          >
            {student.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={700} color={beltColor.text}>
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>
            <Typography variant="body1" color={beltColor.text} sx={{ opacity: 0.8, mb: 2 }}>
              {student.fullName}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BeltDisplay belt={student.currentBelt} stripes={student.currentStripes} size="medium" />
                <Typography variant="body2" fontWeight={600} color={beltColor.text}>
                  Faixa {beltLabels[student.currentBelt]} - {student.currentStripes} grau{student.currentStripes !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Stats Badges */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 1 }}>
            <Chip
              icon={<Clock size={16} />}
              label={trainingTime}
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
            />
            <Chip
              icon={<Target size={16} />}
              label={`${attendanceCount} presenças`}
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
            />
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {attendanceCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Presenças
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#FFD700' }}>
                    {medalCount.gold}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ouros
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#C0C0C0' }}>
                    {medalCount.silver}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pratas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#CD7F32' }}>
                    {medalCount.bronze}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bronzes
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Personal Information */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Informações Pessoais
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Calendar size={20} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data de Nascimento
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {student.birthDate
                        ? `${format(student.birthDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}${age !== null ? ` (${age} anos)` : ''}`
                        : 'Não informada'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Phone size={20} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Telefone
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {student.phone || 'Não informado'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {student.email && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Mail size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {student.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Award size={20} />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Início do Treino
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {format(student.startDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Editable Information */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Informações Editáveis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Você pode editar estas informações diretamente
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="CPF"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  fullWidth
                  placeholder="000.000.000-00"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Tipo Sanguíneo"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  fullWidth
                  placeholder="Ex: A+, B-, O+"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Alergias"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  fullWidth
                  placeholder="Separe por vírgula"
                  helperText="Ex: Dipirona, Amendoim"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Contato de Emergência"
                  value={emergencyContact}
                  fullWidth
                  disabled
                  helperText="Entre em contato com a academia para alterar"
                />
              </Grid>

              <Grid size={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={18} /> : <Save size={18} />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Privacy Toggle */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: isProfilePublic ? 'success.light' : 'grey.200' }}>
                {isProfilePublic ? <Unlock size={20} color="#16A34A" /> : <Lock size={20} color="#666" />}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Privacidade do Perfil
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Controle quem pode ver seu perfil
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={isProfilePublic}
                  onChange={(e) => setIsProfilePublic(e.target.checked)}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {isProfilePublic ? 'Perfil Público' : 'Perfil Privado'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isProfilePublic
                      ? 'Outros alunos podem ver seu perfil'
                      : 'Apenas você e o mestre podem ver seu perfil'}
                  </Typography>
                </Box>
              }
              sx={{ m: 0, width: '100%' }}
            />

            {!isProfilePublic && (
              <Alert severity="info" sx={{ mt: 2 }} icon={<Shield size={18} />}>
                Seu perfil está oculto para outros alunos
              </Alert>
            )}
          </Paper>

          {/* Status Card */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Status
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: student.status === 'active' ? 'success.light' : 'warning.light',
                }}
              >
                {student.status === 'active' ? (
                  <CheckCircle size={24} color="#16A34A" />
                ) : (
                  <AlertCircle size={24} color="#CA8A04" />
                )}
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {student.status === 'active' ? 'Ativo' : student.status === 'injured' ? 'Lesionado' : 'Inativo'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mensalidade: R$ {student.tuitionValue?.toLocaleString('pt-BR') || '0'}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Health Info */}
          {(bloodType || allergies || student.healthNotes) && (
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Heart size={20} color="#DC2626" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Informações de Saúde
                </Typography>
              </Box>

              {bloodType && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Tipo Sanguíneo
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {bloodType}
                  </Typography>
                </Box>
              )}

              {allergies && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Alergias
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {allergies}
                  </Typography>
                </Box>
              )}

              {student.healthNotes && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Observações
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {student.healthNotes}
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
