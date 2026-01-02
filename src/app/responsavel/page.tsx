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
  Skeleton,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Award,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  Star,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useAuth, usePermissions } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services';
import { attendanceService } from '@/services/attendanceService';
import { financialService } from '@/services';
import { Student, BeltColor, KidsBeltColor } from '@/types';

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
// Child Card Component
// ============================================
interface ChildCardProps {
  student: Student;
  attendanceCount: number;
  pendingPayments: number;
}

function ChildCard({ student, attendanceCount, pendingPayments }: ChildCardProps) {
  const beltInfo = BELT_INFO[student.currentBelt as BeltColor | KidsBeltColor];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Avatar
            src={student.photoUrl}
            sx={{ width: 60, height: 60, bgcolor: 'secondary.main' }}
          >
            {student.fullName[0]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {student.fullName}
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: beltInfo.bg,
                color: beltInfo.text,
                fontSize: '0.75rem',
              }}
            >
              <Award size={12} />
              {beltInfo.label} {student.currentStripes > 0 && `${student.currentStripes}º`}
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <CheckCircle size={20} color="#16A34A" />
              <Typography variant="h6" fontWeight={700}>
                {attendanceCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Presencas
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box
              sx={{
                textAlign: 'center',
                p: 1,
                bgcolor: pendingPayments > 0 ? 'error.50' : 'success.50',
                borderRadius: 1,
              }}
            >
              {pendingPayments > 0 ? (
                <AlertCircle size={20} color="#DC2626" />
              ) : (
                <CheckCircle size={20} color="#16A34A" />
              )}
              <Typography variant="h6" fontWeight={700} color={pendingPayments > 0 ? 'error.main' : 'success.main'}>
                {pendingPayments}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pendencias
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Button
          fullWidth
          variant="outlined"
          sx={{ mt: 2 }}
          href={`/responsavel/filhos/${student.id}`}
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================
export default function GuardianHomePage() {
  const { user } = useAuth();
  const { linkedStudentIds } = usePermissions();

  // Fetch children data
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ['guardianChildren', linkedStudentIds],
    queryFn: async () => {
      const students = await Promise.all(
        linkedStudentIds.map((id) => studentService.getById(id))
      );
      return students.filter((s): s is Student => s !== null);
    },
    enabled: linkedStudentIds.length > 0,
  });

  // Fetch attendance for all children
  const { data: attendanceCounts = {}, isLoading: loadingAttendance } = useQuery({
    queryKey: ['guardianChildrenAttendance', linkedStudentIds],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of linkedStudentIds) {
        counts[id] = await attendanceService.getStudentAttendanceCount(id);
      }
      return counts;
    },
    enabled: linkedStudentIds.length > 0,
  });

  // Fetch pending payments for all children
  const { data: pendingPaymentsCounts = {}, isLoading: loadingPayments } = useQuery({
    queryKey: ['guardianChildrenPayments', linkedStudentIds],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of linkedStudentIds) {
        const payments = await financialService.getByStudent(id);
        counts[id] = payments.filter((p) => p.status === 'pending' || p.status === 'overdue').length;
      }
      return counts;
    },
    enabled: linkedStudentIds.length > 0,
  });

  // Calculate totals
  const totals = useMemo(() => {
    const totalAttendance = Object.values(attendanceCounts).reduce((a, b) => a + b, 0);
    const totalPending = Object.values(pendingPaymentsCounts).reduce((a, b) => a + b, 0);
    return { totalAttendance, totalPending };
  }, [attendanceCounts, pendingPaymentsCounts]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const isLoading = loadingChildren || loadingAttendance || loadingPayments;

  return (
    <Box>
      {/* Welcome Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            src={user?.photoUrl}
            sx={{ width: 70, height: 70, bgcolor: 'secondary.main' }}
          >
            {user?.displayName?.[0] || 'R'}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {greeting}, {user?.displayName?.split(' ')[0] || 'Responsavel'}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Acompanhe o progresso dos seus filhos na academia
            </Typography>
            <Chip
              icon={<Users size={14} />}
              label={`${children.length} filho${children.length > 1 ? 's' : ''} vinculado${children.length > 1 ? 's' : ''}`}
              size="small"
              color="secondary"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Alert for pending payments */}
      {totals.totalPending > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          icon={<AlertCircle size={20} />}
          action={
            <Button color="inherit" size="small" href="/responsavel/financeiro">
              Ver Detalhes
            </Button>
          }
        >
          Voce tem {totals.totalPending} pagamento{totals.totalPending > 1 ? 's' : ''} pendente{totals.totalPending > 1 ? 's' : ''}.
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.50' }}>
                  <Users size={24} color="#7C3AED" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {children.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filhos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.50' }}>
                  <CheckCircle size={24} color="#16A34A" />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700}>
                      {totals.totalAttendance}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Presencas Total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: totals.totalPending > 0 ? 'error.50' : 'success.50' }}>
                  <DollarSign size={24} color={totals.totalPending > 0 ? '#DC2626' : '#16A34A'} />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={60} height={32} />
                  ) : (
                    <Typography variant="h4" fontWeight={700} color={totals.totalPending > 0 ? 'error.main' : 'success.main'}>
                      {totals.totalPending}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Pagamentos Pendentes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.50' }}>
                  <Star size={24} color="#D97706" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    --
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Media Avaliacoes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Children Cards */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Meus Filhos
      </Typography>
      <Grid container spacing={3}>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Skeleton variant="circular" width={60} height={60} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                  </Box>
                  <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : children.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Users size={48} color="#9CA3AF" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                Nenhum filho vinculado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entre em contato com a academia para vincular seus filhos.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          children.map((child) => (
            <Grid key={child.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ChildCard
                student={child}
                attendanceCount={attendanceCounts[child.id] || 0}
                pendingPayments={pendingPaymentsCounts[child.id] || 0}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}
