'use client';

import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  LinearProgress,
  Skeleton,
  Button,
} from '@mui/material';
import {
  Award,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Target,
  Trophy,
  ClipboardCheck,
  User,
} from 'lucide-react';
import { useAuth, usePermissions } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services';
import { attendanceService } from '@/services/attendanceService';
import { financialService } from '@/services';
import { BeltColor, KidsBeltColor } from '@/types';

// ============================================
// Belt Colors
// ============================================
const BELT_INFO: Record<BeltColor | KidsBeltColor, { bg: string; text: string; label: string }> = {
  white: { bg: '#f5f5f5', text: '#333', label: 'Branca' },
  blue: { bg: '#1E40AF', text: '#fff', label: 'Azul' },
  purple: { bg: '#7C3AED', text: '#fff', label: 'Roxa' },
  brown: { bg: '#78350F', text: '#fff', label: 'Marrom' },
  black: { bg: '#171717', text: '#fff', label: 'Preta' },
  grey: { bg: '#6B7280', text: '#fff', label: 'Cinza' },
  yellow: { bg: '#EAB308', text: '#333', label: 'Amarela' },
  orange: { bg: '#EA580C', text: '#fff', label: 'Laranja' },
  green: { bg: '#16A34A', text: '#fff', label: 'Verde' },
};

// ============================================
// Stat Card Component
// ============================================
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, color, loading }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
            }}
          >
            <Icon size={24} color={color} />
          </Box>
          <Box>
            {loading ? (
              <Skeleton variant="text" width={60} height={32} />
            ) : (
              <Typography variant="h5" fontWeight={700}>
                {value}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================
export default function PortalHomePage() {
  const { user } = useAuth();
  const { linkedStudentIds } = usePermissions();

  const studentId = linkedStudentIds[0]; // For student role, there's only one

  // Fetch student data
  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  // Fetch attendance count
  const { data: attendanceCount = 0, isLoading: loadingAttendance } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => attendanceService.getStudentAttendanceCount(studentId),
    enabled: !!studentId,
  });

  // Fetch pending payments
  const { data: pendingPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['studentPayments', studentId],
    queryFn: async () => {
      const payments = await financialService.getByStudent(studentId);
      return payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
    },
    enabled: !!studentId,
  });

  // Calculate time training
  const trainingInfo = useMemo(() => {
    if (!student) return null;

    const startDate = new Date(student.startDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    return {
      years,
      months: remainingMonths,
      startDate,
      totalMonths: months,
    };
  }, [student]);

  const beltInfo = student ? BELT_INFO[student.currentBelt as BeltColor | KidsBeltColor] : null;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const isLoading = loadingStudent || loadingAttendance || loadingPayments;

  return (
    <Box>
      {/* Welcome Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Avatar
            src={student?.photoUrl || user?.photoUrl}
            sx={{
              width: 80,
              height: 80,
              fontSize: '2rem',
              bgcolor: 'primary.main',
            }}
          >
            {student?.fullName?.[0] || user?.displayName?.[0] || 'A'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" fontWeight={700}>
              {greeting}, {student?.nickname || student?.fullName?.split(' ')[0] || 'Aluno'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {student?.fullName}
            </Typography>
            {beltInfo && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: beltInfo.bg,
                  color: beltInfo.text,
                  border: student?.currentBelt === 'white' ? '2px solid #e5e5e5' : 'none',
                }}
              >
                <Award size={16} />
                <Typography variant="body2" fontWeight={600}>
                  Faixa {beltInfo.label}
                  {(student?.currentStripes ?? 0) > 0 && ` - ${student?.currentStripes}º Grau`}
                </Typography>
              </Box>
            )}
          </Box>
          {trainingInfo && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                Tempo de treino
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {trainingInfo.years > 0
                  ? `${trainingInfo.years} ano${trainingInfo.years > 1 ? 's' : ''} e ${trainingInfo.months} mes${trainingInfo.months !== 1 ? 'es' : ''}`
                  : `${trainingInfo.totalMonths} mes${trainingInfo.totalMonths !== 1 ? 'es' : ''}`}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={CheckCircle}
            label="Total de Presencas"
            value={attendanceCount}
            color="#16A34A"
            loading={loadingAttendance}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={Award}
            label="Graus na Faixa"
            value={student?.currentStripes || 0}
            color="#7C3AED"
            loading={loadingStudent}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={Calendar}
            label="Meses Treinando"
            value={trainingInfo?.totalMonths || 0}
            color="#2563EB"
            loading={loadingStudent}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={pendingPayments.length > 0 ? AlertCircle : CheckCircle}
            label="Pagamentos Pendentes"
            value={pendingPayments.length}
            color={pendingPayments.length > 0 ? '#DC2626' : '#16A34A'}
            loading={loadingPayments}
          />
        </Grid>
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Pending Payments Alert */}
        {pendingPayments.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'error.50',
                border: '1px solid',
                borderColor: 'error.200',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AlertCircle size={24} color="#DC2626" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} color="error.main">
                    Voce tem {pendingPayments.length} pagamento{pendingPayments.length > 1 ? 's' : ''} pendente{pendingPayments.length > 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="body2" color="error.dark">
                    Regularize sua situacao para continuar treinando sem interrupcoes.
                  </Typography>
                </Box>
                <Button variant="contained" color="error" href="/portal/financeiro">
                  Ver Detalhes
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Next Goals */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Target size={20} />
              <Typography variant="h6" fontWeight={600}>
                Proximos Objetivos
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  Proximo grau ({(student?.currentStripes || 0) + 1}º)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.min(attendanceCount, 50)}/50 presencas
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((attendanceCount / 50) * 100, 100)}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Proxima faixa</Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.min(attendanceCount, 200)}/200 presencas
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((attendanceCount / 200) * 100, 100)}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' },
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              * Valores aproximados. A graduacao depende de avaliacao do professor.
            </Typography>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp size={20} />
              <Typography variant="h6" fontWeight={600}>
                Acoes Rapidas
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                  }}
                  onClick={() => window.location.href = '/portal/presenca'}
                >
                  <ClipboardCheck size={32} color="#2563EB" />
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    Ver Presencas
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                  }}
                  onClick={() => window.location.href = '/portal/horarios'}
                >
                  <Calendar size={32} color="#16A34A" />
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    Ver Horarios
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                  }}
                  onClick={() => window.location.href = '/portal/graduacao'}
                >
                  <Trophy size={32} color="#EAB308" />
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    Historico
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'action.hover', transform: 'translateY(-2px)' },
                  }}
                  onClick={() => window.location.href = '/portal/perfil'}
                >
                  <User size={32} color="#7C3AED" />
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    Meu Perfil
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
