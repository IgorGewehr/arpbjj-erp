'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Skeleton, Button, LinearProgress } from '@mui/material';
import { ArrowRight, AlertTriangle } from 'lucide-react';
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

  const { data: attendanceCount = 0 } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => attendanceService.getStudentAttendanceCount(studentId),
    enabled: !!studentId,
  });

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

  if (loadingStudent) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} color="text.primary">
          {greeting}, {displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {student?.fullName}
        </Typography>
      </Box>

      {/* Pending Payment Alert */}
      {hasPlan && pendingPayments.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            mb: 3,
            bgcolor: '#FEF3C7',
            borderRadius: 2,
            border: '1px solid #FCD34D',
          }}
        >
          <AlertTriangle size={20} color="#D97706" />
          <Typography variant="body2" sx={{ flex: 1, color: '#92400E' }}>
            Você tem {pendingPayments.length} pagamento{pendingPayments.length > 1 ? 's' : ''} pendente{pendingPayments.length > 1 ? 's' : ''}.
          </Typography>
          <Button
            size="small"
            onClick={() => router.push('/portal/financeiro')}
            sx={{ color: '#D97706', fontWeight: 600, textTransform: 'none' }}
          >
            Ver detalhes
          </Button>
        </Box>
      )}

      {/* Belt & Stats */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mb: 4,
          pb: 4,
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          flexWrap: 'wrap',
        }}
      >
        {/* Belt */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BeltDisplay belt={student?.currentBelt || 'white'} stripes={student?.currentStripes || 0} size="large" />
          <Box>
            <Typography variant="body2" color="text.secondary">
              Graduação atual
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              Faixa {BELT_LABELS[student?.currentBelt || 'white']}
              {(student?.currentStripes || 0) > 0 && ` • ${student?.currentStripes} grau${(student?.currentStripes || 0) > 1 ? 's' : ''}`}
            </Typography>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 4, ml: { sm: 'auto' } }}>
          <Box>
            <Typography variant="h4" fontWeight={600} color="text.primary">
              {attendanceCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              presenças
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={600} color="text.primary">
              {trainingMonths}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              meses
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Quick Links */}
      <Box>
        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 2 }}>
          Acesso rápido
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[
            { label: 'Minhas presenças', path: '/portal/presenca' },
            { label: 'Histórico de graduações', path: '/portal/linha-do-tempo' },
            { label: 'Competições', path: '/portal/competicoes' },
            { label: 'Horários das aulas', path: '/portal/horarios' },
          ].map((item) => (
            <Box
              key={item.path}
              onClick={() => router.push(item.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: 1.5,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: 'grey.50' },
              }}
            >
              <Typography variant="body2" color="text.primary">
                {item.label}
              </Typography>
              <ArrowRight size={16} color="#999" />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
