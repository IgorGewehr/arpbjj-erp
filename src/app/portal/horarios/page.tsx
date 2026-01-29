'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Skeleton,
  useTheme,
  useMediaQuery,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Clock, Calendar, CheckCircle, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClassService, createCheckinService } from '@/services';
import { isInCheckinWindow, getTimeUntilCheckinOpens } from '@/services/checkinService';
import { Class, Checkin } from '@/types';
import { usePermissions } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { useFeedback } from '@/components/providers';
import { AcademyIndicator } from '@/components/portal/AcademyIndicator';
import { format, isSameDay, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WEEK_DAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terca', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sabado', short: 'Sab' },
];

export default function PortalHorariosPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { linkedStudentIds } = usePermissions();
  const { academyId, academy } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  const studentId = linkedStudentIds[0];
  const checkinEnabled = academy?.studentCheckinEnabled || false;

  // Force re-render every minute to update check-in windows
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Services
  const classService = useMemo(
    () => createClassService(academyId || 'default'),
    [academyId]
  );
  const checkinService = useMemo(
    () => createCheckinService(academyId || 'default'),
    [academyId]
  );

  // Fetch all classes
  const { data: allClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['classes', academyId],
    queryFn: () => classService.list(),
    enabled: !!academyId,
  });

  // Filter classes where student is enrolled
  const myClasses = useMemo(() => {
    if (!studentId) return [];
    return allClasses.filter(cls =>
      cls.studentIds?.includes(studentId)
    );
  }, [allClasses, studentId]);

  // Get today and next 6 days
  const upcomingDays = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startOfDay(today), i));
    }
    return days;
  }, []);

  // Fetch existing check-ins for student
  const { data: studentCheckins = [] } = useQuery({
    queryKey: ['studentCheckins', studentId, academyId],
    queryFn: async () => {
      if (!studentId) return [];
      return checkinService.getStudentPendingCheckins(studentId);
    },
    enabled: !!studentId && checkinEnabled,
    staleTime: 1000 * 30,
  });

  // Check if student already has checkin for a class/date
  const hasCheckin = (classId: string, date: Date) => {
    return studentCheckins.some(
      c => c.classId === classId && isSameDay(c.scheduleDate, date)
    );
  };

  // Create check-in mutation
  const createCheckinMutation = useMutation({
    mutationFn: async ({
      classData,
      scheduleStartTime,
      scheduleEndTime,
      scheduleDayOfWeek,
    }: {
      classData: Class;
      scheduleStartTime: string;
      scheduleEndTime: string;
      scheduleDayOfWeek: number;
    }) => {
      const student = await import('@/services').then(m =>
        m.createStudentService(academyId || 'default').getById(studentId)
      );
      if (!student) throw new Error('Aluno nao encontrado');

      return checkinService.createCheckin({
        studentId,
        studentName: student.fullName,
        classId: classData.id,
        className: classData.name,
        scheduleStartTime,
        scheduleEndTime,
        scheduleDayOfWeek,
      });
    },
    onSuccess: () => {
      success('Check-in realizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['studentCheckins'] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer check-in';
      showError(errorMessage);
    },
  });

  const today = new Date();

  // Get schedules for upcoming days for enrolled classes
  const upcomingSchedules = useMemo(() => {
    const schedules: Array<{
      classData: Class;
      date: Date;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isToday: boolean;
      inWindow: boolean;
      timeUntilWindow: { hours: number; minutes: number } | null;
      hasCheckin: boolean;
    }> = [];

    myClasses.forEach(cls => {
      upcomingDays.forEach(day => {
        const dayOfWeek = day.getDay();
        const matchingSchedules = cls.schedule?.filter(s => s.dayOfWeek === dayOfWeek) || [];

        matchingSchedules.forEach(schedule => {
          const isToday = isSameDay(day, today);
          const inWindow = isToday && isInCheckinWindow(
            { startTime: schedule.startTime, endTime: schedule.endTime },
            day
          );
          const timeUntilWindow = isToday
            ? getTimeUntilCheckinOpens({ startTime: schedule.startTime }, day)
            : null;

          schedules.push({
            classData: cls,
            date: day,
            dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isToday,
            inWindow,
            timeUntilWindow,
            hasCheckin: hasCheckin(cls.id, day),
          });
        });
      });
    });

    // Sort by date, then by start time
    return schedules.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [myClasses, upcomingDays, today, studentCheckins]);

  // Group by day for mobile view
  const schedulesByDay = useMemo(() => {
    const grouped = new Map<string, typeof upcomingSchedules>();
    upcomingSchedules.forEach(schedule => {
      const key = format(schedule.date, 'yyyy-MM-dd');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(schedule);
    });
    return grouped;
  }, [upcomingSchedules]);

  if (loadingClasses) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={18} sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  // Render check-in button
  const renderCheckinButton = (schedule: typeof upcomingSchedules[0]) => {
    if (!checkinEnabled || !schedule.isToday) return null;

    if (schedule.hasCheckin) {
      return (
        <Chip
          icon={<CheckCircle size={14} />}
          label="Check-in feito"
          size="small"
          sx={{
            bgcolor: '#DCFCE7',
            color: '#16A34A',
            fontWeight: 600,
            fontSize: '0.7rem',
            '& .MuiChip-icon': { color: '#16A34A' },
          }}
        />
      );
    }

    if (schedule.inWindow) {
      return (
        <Button
          variant="contained"
          size="small"
          startIcon={
            createCheckinMutation.isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <UserCheck size={14} />
            )
          }
          onClick={() => createCheckinMutation.mutate({
            classData: schedule.classData,
            scheduleStartTime: schedule.startTime,
            scheduleEndTime: schedule.endTime,
            scheduleDayOfWeek: schedule.dayOfWeek,
          })}
          disabled={createCheckinMutation.isPending}
          sx={{
            bgcolor: '#16A34A',
            '&:hover': { bgcolor: '#15803D' },
            fontSize: '0.75rem',
            py: 0.5,
            px: 1.5,
            textTransform: 'none',
          }}
        >
          Marcar Presenca
        </Button>
      );
    }

    if (schedule.timeUntilWindow) {
      const { hours, minutes } = schedule.timeUntilWindow;
      const timeText = hours > 0
        ? `${hours}h ${minutes}min`
        : `${minutes}min`;
      return (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          Abre em {timeText}
        </Typography>
      );
    }

    return null;
  };

  // Mobile Card View
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {myClasses.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            Voce nao esta matriculado em nenhuma turma
          </Typography>
        </Box>
      ) : (
        Array.from(schedulesByDay.entries()).map(([dateKey, schedules]) => {
          const date = schedules[0].date;
          const isToday = isSameDay(date, today);

          return (
            <Box key={dateKey}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  mb: 1,
                  color: isToday ? '#16A34A' : 'text.secondary',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                }}
              >
                {isToday ? 'Hoje' : format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {schedules.map((schedule, idx) => (
                  <Box
                    key={`${schedule.classData.id}-${idx}`}
                    sx={{
                      p: 2,
                      bgcolor: schedule.inWindow ? '#F0FDF4' : '#fff',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: schedule.inWindow ? '#86EFAC' : 'grey.200',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: 'text.primary', fontSize: '0.9rem' }}
                        >
                          {schedule.classData.name}
                        </Typography>
                        {schedule.classData.instructorName && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                          >
                            {schedule.classData.instructorName}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={14} color="#666" />
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                          {schedule.startTime} - {schedule.endTime}
                        </Typography>
                      </Box>
                    </Box>

                    {checkinEnabled && schedule.isToday && (
                      <Box sx={{ mt: 1.5 }}>
                        {renderCheckinButton(schedule)}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );

  // Desktop View (list format)
  const renderDesktopView = () => (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.200',
        overflow: 'hidden',
      }}
    >
      {myClasses.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Voce nao esta matriculado em nenhuma turma
          </Typography>
        </Box>
      ) : (
        upcomingSchedules.map((schedule, index) => (
          <Box
            key={`${schedule.classData.id}-${schedule.date.toISOString()}-${index}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: index < upcomingSchedules.length - 1 ? '1px solid' : 'none',
              borderColor: 'grey.100',
              bgcolor: schedule.inWindow ? '#F0FDF4' : 'transparent',
              '&:hover': { bgcolor: schedule.inWindow ? '#DCFCE7' : 'grey.50' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Date */}
              <Box sx={{ minWidth: 100 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={schedule.isToday ? 'success.main' : 'text.primary'}
                >
                  {schedule.isToday ? 'Hoje' : format(schedule.date, 'EEE, dd/MM', { locale: ptBR })}
                </Typography>
              </Box>

              {/* Time */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
                <Clock size={14} color="#666" />
                <Typography variant="body2">
                  {schedule.startTime} - {schedule.endTime}
                </Typography>
              </Box>

              {/* Class Name */}
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {schedule.classData.name}
                </Typography>
                {schedule.classData.instructorName && (
                  <Typography variant="caption" color="text.secondary">
                    {schedule.classData.instructorName}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Check-in Button */}
            {renderCheckinButton(schedule)}
          </Box>
        ))
      )}
    </Box>
  );

  return (
    <Box>
      {/* Academy indicator for multi-academy users */}
      <AcademyIndicator label="Horarios de" icon={<Calendar size={16} />} />

      {/* Check-in info banner */}
      {checkinEnabled && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: '#EFF6FF',
            borderRadius: 2,
            border: '1px solid',
            borderColor: '#BFDBFE',
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#1E40AF' }}>
            <strong>Check-in:</strong> Disponivel de 30 min antes do inicio ate 1h apos o fim da aula.
            O professor confirmara sua presenca depois.
          </Typography>
        </Box>
      )}

      {/* Schedule View */}
      {isMobile ? renderMobileView() : renderDesktopView()}

      {/* Legend */}
      {checkinEnabled && myClasses.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: 0.5,
                bgcolor: '#F0FDF4',
                border: '1px solid',
                borderColor: '#86EFAC',
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Check-in disponivel
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle size={14} color="#16A34A" />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Check-in realizado
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
