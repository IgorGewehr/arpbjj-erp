'use client';

import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import { Clock, Calendar } from 'lucide-react';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        <Skeleton variant="text" width="60%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={18} sx={{ mb: 3 }} />
        {isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            ))}
          </Box>
        ) : (
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
        )}
      </Box>
    );
  }

  // Mobile Card View
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {classRows.length === 0 ? (
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
            Nenhuma aula cadastrada
          </Typography>
        </Box>
      ) : (
        classRows.map(({ classData, scheduleByDay }) => {
          const daysWithClass = WEEK_DAYS.filter((day) => scheduleByDay.has(day.value));
          const hasClassNow = daysWithClass.some((day) => {
            const schedule = scheduleByDay.get(day.value);
            return schedule && isClassNow(schedule.startTime, schedule.endTime, day.value);
          });

          return (
            <Box
              key={classData.id}
              sx={{
                p: 2,
                bgcolor: hasClassNow ? '#111' : '#fff',
                borderRadius: 2,
                border: '1px solid',
                borderColor: hasClassNow ? '#111' : 'grey.200',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ color: hasClassNow ? '#fff' : 'text.primary', fontSize: '0.9rem' }}
                  >
                    {classData.name}
                  </Typography>
                  {classData.instructorName && (
                    <Typography
                      variant="caption"
                      sx={{ color: hasClassNow ? 'rgba(255,255,255,0.7)' : 'text.secondary', fontSize: '0.75rem' }}
                    >
                      {classData.instructorName}
                    </Typography>
                  )}
                </Box>
                {hasClassNow && (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600 }}>
                      AGORA
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {daysWithClass.map((day) => {
                  const schedule = scheduleByDay.get(day.value);
                  const isToday = day.value === today;
                  const isNow = schedule && isClassNow(schedule.startTime, schedule.endTime, day.value);

                  return (
                    <Box
                      key={day.value}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: hasClassNow
                          ? isNow
                            ? 'rgba(255,255,255,0.25)'
                            : 'rgba(255,255,255,0.1)'
                          : isToday
                            ? '#111'
                            : 'grey.100',
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          color: hasClassNow ? '#fff' : isToday ? '#fff' : 'text.secondary',
                          fontSize: '0.7rem',
                        }}
                      >
                        {day.short}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: hasClassNow ? '#fff' : isToday ? '#fff' : 'text.primary',
                          fontSize: '0.75rem',
                        }}
                      >
                        {schedule?.startTime}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );

  // Desktop Table View
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
      {/* Header Row - Days */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '180px repeat(6, 1fr)',
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
              <Typography variant="caption" fontWeight={600} sx={{ color: isToday ? '#fff' : 'text.secondary' }}>
                {day.label.toUpperCase()}
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
              gridTemplateColumns: '180px repeat(6, 1fr)',
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
  );

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
          Horários das Aulas
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Grade semanal de treinos
        </Typography>
      </Box>

      {/* Schedule View */}
      {isMobile ? renderMobileView() : renderDesktopView()}

      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: '#111' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
            {isMobile ? 'Agora' : 'Aula acontecendo agora'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: 0.5,
              bgcolor: isMobile ? '#111' : 'grey.50',
              border: isMobile ? 'none' : '1px solid',
              borderColor: 'grey.200',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
            Hoje
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
