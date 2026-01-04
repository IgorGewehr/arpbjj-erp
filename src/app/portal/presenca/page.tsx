'use client';

import { useMemo } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { CheckCircle, Calendar } from 'lucide-react';
import { usePermissions } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PortalPresencaPage() {
  const { linkedStudentIds } = usePermissions();
  const studentId = linkedStudentIds[0];

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['studentAttendanceRecords', studentId],
    queryFn: () => attendanceService.getByStudent(studentId, 100),
    enabled: !!studentId,
  });

  // Ensure attendanceRecords is always an array
  const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  // Calculate stats - include initialAttendanceCount (previous workouts from other gyms/periods)
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = records.filter((a) => {
      const date = new Date(a.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const initialCount = student?.initialAttendanceCount || 0;

    return {
      total: records.length + initialCount,
      thisMonth: thisMonth.length,
    };
  }, [records, student?.initialAttendanceCount]);

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
        <Skeleton variant="text" width="60%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={18} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" height={72} sx={{ flex: 1, borderRadius: 2 }} />
          <Skeleton variant="rounded" height={72} sx={{ flex: 1, borderRadius: 2 }} />
        </Box>
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
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
          Minhas Presenças
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Acompanhe seu histórico de treinos
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: { xs: 1.5, sm: 2 },
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            color="text.primary"
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            {stats.total}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
          >
            total de presenças
          </Typography>
        </Box>
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            color="text.primary"
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            {stats.thisMonth}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
          >
            este mês
          </Typography>
        </Box>
      </Box>

      {/* Calendar View */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Calendar size={16} color="#666" />
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.primary"
            sx={{ textTransform: 'capitalize', fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
          >
            {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </Typography>
        </Box>

        {/* Week days header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.25, sm: 0.5 }, mb: 1 }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
            <Typography
              key={`${day}-${idx}`}
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: 'center', fontSize: { xs: '0.65rem', sm: '0.7rem' }, fontWeight: 500 }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.25, sm: 0.5 } }}>
          {/* Empty cells for days before month starts */}
          {Array.from({ length: calendarDays[0]?.date.getDay() || 0 }).map((_, i) => (
            <Box key={`empty-${i}`} sx={{ aspectRatio: '1' }} />
          ))}
          {calendarDays.map(({ date, hasAttendance }) => {
            const isToday = isSameDay(date, new Date());
            const isFuture = date > new Date();
            return (
              <Box
                key={date.toISOString()}
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: { xs: 0.75, sm: 1 },
                  bgcolor: hasAttendance ? '#111' : 'transparent',
                  color: hasAttendance ? 'white' : isFuture ? 'text.disabled' : 'text.primary',
                  border: isToday && !hasAttendance ? '2px solid' : 'none',
                  borderColor: '#111',
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={hasAttendance || isToday ? 600 : 400}
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  {format(date, 'd')}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Recent Attendance List */}
      <Box>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.secondary"
          sx={{
            mb: 1.5,
            fontSize: { xs: '0.75rem', sm: '0.8rem' },
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Histórico recente
        </Typography>

        {records.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Nenhuma presença registrada ainda
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {records.slice(0, 15).map((record) => (
              <Box
                key={record.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1.5, sm: 2 },
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: '#fff',
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Box
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    borderRadius: '50%',
                    bgcolor: '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle size={16} color="#16A34A" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}
                  >
                    {format(new Date(record.date), "d 'de' MMMM", { locale: ptBR })}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  >
                    {record.className || 'Treino'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
