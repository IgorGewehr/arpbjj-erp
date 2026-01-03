'use client';

import { useMemo } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { classService } from '@/services';
import { Class } from '@/types';

const WEEK_DAYS = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

export default function PortalHorariosPage() {
  const { data: weeklySchedule, isLoading } = useQuery({
    queryKey: ['weeklySchedule'],
    queryFn: () => classService.getWeeklySchedule(),
  });

  const today = new Date().getDay();
  const currentHour = new Date().getHours();
  const currentMinutes = new Date().getMinutes();

  const isClassNow = (startTime: string, endTime: string, dayOfWeek: number) => {
    if (dayOfWeek !== today) return false;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const currentTotal = currentHour * 60 + currentMinutes;
    return currentTotal >= startHour * 60 + startMin && currentTotal <= endHour * 60 + endMin;
  };

  // Group classes by name to show each class as a row
  const classRows = useMemo(() => {
    if (!weeklySchedule) return [];

    const classMap = new Map<string, { classData: Class; scheduleByDay: Map<number, { startTime: string; endTime: string }> }>();

    // Iterate through all days and collect unique classes
    WEEK_DAYS.forEach((day) => {
      const classesForDay = weeklySchedule[day.value] || [];
      classesForDay.forEach((cls: Class) => {
        if (!classMap.has(cls.id)) {
          classMap.set(cls.id, {
            classData: cls,
            scheduleByDay: new Map(),
          });
        }
        const schedule = cls.schedule?.find((s) => s.dayOfWeek === day.value);
        if (schedule) {
          classMap.get(cls.id)!.scheduleByDay.set(day.value, {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          });
        }
      });
    });

    return Array.from(classMap.values()).sort((a, b) => {
      // Sort by earliest time
      const aTime = Array.from(a.scheduleByDay.values())[0]?.startTime || '99:99';
      const bTime = Array.from(b.scheduleByDay.values())[0]?.startTime || '99:99';
      return aTime.localeCompare(bTime);
    });
  }, [weeklySchedule]);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={280} height={20} sx={{ mb: 4 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} color="text.primary">
          Horários das Aulas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Grade semanal de treinos
        </Typography>
      </Box>

      {/* Schedule Table */}
      <Box
        sx={{
          bgcolor: '#fff',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200',
          overflow: 'hidden',
        }}
      >
        {/* Header Row - Days */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '120px repeat(6, 1fr)', md: '180px repeat(6, 1fr)' },
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            bgcolor: 'grey.50',
          }}
        >
          <Box sx={{ p: 1.5, borderRight: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              TURMA
            </Typography>
          </Box>
          {WEEK_DAYS.map((day) => {
            const isToday = day.value === today;
            return (
              <Box
                key={day.value}
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  borderRight: '1px solid',
                  borderColor: 'grey.200',
                  bgcolor: isToday ? '#111' : 'transparent',
                  '&:last-child': { borderRight: 'none' },
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: isToday ? '#fff' : 'text.secondary', display: { xs: 'none', sm: 'block' } }}
                >
                  {day.label.toUpperCase()}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: isToday ? '#fff' : 'text.secondary', display: { xs: 'block', sm: 'none' } }}
                >
                  {day.short.toUpperCase()}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Class Rows */}
        {classRows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma aula cadastrada
            </Typography>
          </Box>
        ) : (
          classRows.map(({ classData, scheduleByDay }, index) => (
            <Box
              key={classData.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '120px repeat(6, 1fr)', md: '180px repeat(6, 1fr)' },
                borderBottom: index < classRows.length - 1 ? '1px solid' : 'none',
                borderColor: 'grey.100',
                '&:hover': { bgcolor: 'grey.50' },
                transition: 'background-color 0.15s',
              }}
            >
              {/* Class Name */}
              <Box
                sx={{
                  p: 1.5,
                  borderRight: '1px solid',
                  borderColor: 'grey.100',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" fontWeight={600} noWrap>
                  {classData.name}
                </Typography>
                {classData.instructorName && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {classData.instructorName}
                  </Typography>
                )}
              </Box>

              {/* Schedule Cells */}
              {WEEK_DAYS.map((day) => {
                const schedule = scheduleByDay.get(day.value);
                const isToday = day.value === today;
                const isNow = schedule && isClassNow(schedule.startTime, schedule.endTime, day.value);

                return (
                  <Box
                    key={day.value}
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: '1px solid',
                      borderColor: 'grey.100',
                      bgcolor: isNow ? '#111' : isToday ? 'grey.50' : 'transparent',
                      '&:last-child': { borderRight: 'none' },
                    }}
                  >
                    {schedule ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: isNow ? 'transparent' : 'grey.100',
                        }}
                      >
                        <Clock size={12} color={isNow ? '#fff' : '#666'} />
                        <Typography
                          variant="caption"
                          fontWeight={500}
                          sx={{ color: isNow ? '#fff' : 'text.primary', whiteSpace: 'nowrap' }}
                        >
                          {schedule.startTime}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: '#111' }} />
          <Typography variant="caption" color="text.secondary">
            Aula acontecendo agora
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }} />
          <Typography variant="caption" color="text.secondary">
            Hoje
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
