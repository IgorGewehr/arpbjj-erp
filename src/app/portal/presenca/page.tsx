'use client';

import { useMemo } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { CheckCircle } from 'lucide-react';
import { usePermissions } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PortalPresencaPage() {
  const { linkedStudentIds } = usePermissions();
  const studentId = linkedStudentIds[0];

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['studentAttendanceRecords', studentId],
    queryFn: () => attendanceService.getByStudent(studentId, 100),
    enabled: !!studentId,
  });

  // Ensure attendanceRecords is always an array
  const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = records.filter((a) => {
      const date = new Date(a.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    return {
      total: records.length,
      thisMonth: thisMonth.length,
    };
  }, [records]);

  // Calendar data for current month
  const calendarDays = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => ({
      date: day,
      hasAttendance: records.some((a) => isSameDay(new Date(a.date), day)),
    }));
  }, [records]);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} color="text.primary">
          Minhas Presenças
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Acompanhe seu histórico de treinos
        </Typography>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          mb: 4,
          pb: 4,
          borderBottom: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            {stats.total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            total de presenças
          </Typography>
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            {stats.thisMonth}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            este mês
          </Typography>
        </Box>
      </Box>

      {/* Calendar View */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 2 }}>
          {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
        </Typography>

        {/* Week days header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 1 }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <Typography
              key={day}
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: 'center', fontSize: '0.7rem' }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {/* Empty cells for days before month starts */}
          {Array.from({ length: calendarDays[0]?.date.getDay() || 0 }).map((_, i) => (
            <Box key={`empty-${i}`} />
          ))}
          {calendarDays.map(({ date, hasAttendance }) => {
            const isToday = isSameDay(date, new Date());
            return (
              <Box
                key={date.toISOString()}
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  bgcolor: hasAttendance ? '#111' : 'transparent',
                  color: hasAttendance ? 'white' : 'text.primary',
                  border: isToday && !hasAttendance ? '1px solid' : 'none',
                  borderColor: 'grey.300',
                }}
              >
                <Typography variant="caption" fontWeight={hasAttendance ? 600 : 400}>
                  {format(date, 'd')}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Recent Attendance List */}
      <Box>
        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 2 }}>
          Histórico recente
        </Typography>

        {records.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma presença registrada ainda
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {records.slice(0, 20).map((record) => (
              <Box
                key={record.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'grey.50',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckCircle size={16} color="#16A34A" />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {format(new Date(record.date), "d 'de' MMMM", { locale: ptBR })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {record.className || 'Treino'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
