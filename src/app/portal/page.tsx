'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Skeleton, Button } from '@mui/material';
import { ArrowRight, AlertTriangle, ClipboardCheck, History, Trophy, Calendar } from 'lucide-react';
import { useAuth, usePermissions } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services';
import { attendanceService } from '@/services/attendanceService';
import { financialService } from '@/services';
import { BeltDisplay } from '@/components/shared/BeltDisplay';

const BELT_LABELS: Record<string, string> = {
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

export default function PortalHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { linkedStudentIds } = usePermissions();

  const studentId = linkedStudentIds[0];

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  const { data: systemAttendanceCount = 0 } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => attendanceService.getStudentAttendanceCount(studentId),
    enabled: !!studentId,
  });

  // Total attendance = system count + initial count (previous workouts from other gyms/periods)
  const attendanceCount = systemAttendanceCount + (student?.initialAttendanceCount || 0);

  const hasPlan = !!student?.planId;

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['studentPayments', studentId],
    queryFn: async () => {
      const payments = await financialService.getByStudent(studentId);
      return payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
    },
    enabled: !!studentId && hasPlan,
  });

  const trainingMonths = useMemo(() => {
    if (!student) return 0;
    const start = new Date(student.startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }, [student]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const displayName = student?.nickname || student?.fullName?.split(' ')[0] || user?.displayName || 'Aluno';

  const quickLinks = [
    { label: 'Presenças', path: '/portal/presenca', icon: ClipboardCheck },
    { label: 'Histórico', path: '/portal/linha-do-tempo', icon: History },
    { label: 'Competições', path: '/portal/competicoes', icon: Trophy },
    { label: 'Horários', path: '/portal/horarios', icon: Calendar },
  ];

  if (loadingStudent) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          color="text.primary"
          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
        >
          {greeting}, {displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          {student?.fullName}
        </Typography>
      </Box>

      {/* Pending Payment Alert */}
      {hasPlan && pendingPayments.length > 0 && (
        <Box
          onClick={() => router.push('/portal/financeiro')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            mb: 3,
            bgcolor: '#FEF3C7',
            borderRadius: 2,
            border: '1px solid #FCD34D',
            cursor: 'pointer',
          }}
        >
          <AlertTriangle size={18} color="#D97706" />
          <Typography variant="body2" sx={{ flex: 1, color: '#92400E', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            {pendingPayments.length} pagamento{pendingPayments.length > 1 ? 's' : ''} pendente{pendingPayments.length > 1 ? 's' : ''}
          </Typography>
          <ArrowRight size={16} color="#D97706" />
        </Box>
      )}

      {/* Belt Card */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          bgcolor: '#fff',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BeltDisplay belt={student?.currentBelt || 'white'} stripes={student?.currentStripes || 0} size="large" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Graduação atual
            </Typography>
            <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Faixa {BELT_LABELS[student?.currentBelt || 'white']}
              {(student?.currentStripes || 0) > 0 && ` • ${student?.currentStripes} grau${(student?.currentStripes || 0) > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Box>

        {/* Stats Row */}
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'grey.100',
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              {attendanceCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              presenças
            </Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              {trainingMonths}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              meses
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Quick Links Grid */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.secondary"
          sx={{ mb: 1.5, fontSize: { xs: '0.75rem', sm: '0.8rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Acesso rápido
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Box
                key={item.path}
                onClick={() => router.push(item.path)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Icon size={24} color="#666" strokeWidth={1.5} />
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{ mt: 1, fontWeight: 500, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
