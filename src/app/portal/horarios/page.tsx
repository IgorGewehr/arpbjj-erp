'use client';

import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Skeleton,
} from '@mui/material';
import { Calendar, Clock, User, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { classService } from '@/services';
import { Class } from '@/types';

// ============================================
// Constants
// ============================================
const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terca-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sabado', short: 'Sab' },
];

// ============================================
// Class Card Component
// ============================================
interface ClassCardProps {
  classData: Class;
  schedule: { startTime: string; endTime: string };
  isNow?: boolean;
}

function ClassCard({ classData, schedule, isNow }: ClassCardProps) {
  return (
    <Card
      sx={{
        border: isNow ? '2px solid' : '1px solid',
        borderColor: isNow ? 'primary.main' : 'divider',
        bgcolor: isNow ? 'primary.50' : 'background.paper',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {classData.name}
          </Typography>
          {isNow && (
            <Chip label="Agora" size="small" color="primary" />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Clock size={14} color="#6B7280" />
          <Typography variant="body2" color="text.secondary">
            {schedule.startTime} - {schedule.endTime}
          </Typography>
        </Box>

        {classData.instructorName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <User size={14} color="#6B7280" />
            <Typography variant="body2" color="text.secondary">
              {classData.instructorName}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          <Chip
            label={classData.category === 'kids' ? 'Kids' : 'Adulto'}
            size="small"
            variant="outlined"
            color={classData.category === 'kids' ? 'secondary' : 'primary'}
          />
          {classData.maxStudents && (
            <Chip
              icon={<Users size={12} />}
              label={`Max ${classData.maxStudents}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================
export default function PortalHorariosPage() {
  // Fetch weekly schedule
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

    const currentTotalMinutes = currentHour * 60 + currentMinutes;
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Horarios das Aulas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Confira a grade semanal de treinos
        </Typography>
      </Box>

      {/* Weekly Grid */}
      <Grid container spacing={3}>
        {DAYS_OF_WEEK.slice(1, 7).map((day) => {
          const classesForDay = weeklySchedule?.[day.value] || [];
          const isToday = day.value === today;

          return (
            <Grid key={day.value} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <Paper
                sx={{
                  p: 2,
                  minHeight: 300,
                  borderTop: isToday ? '4px solid' : 'none',
                  borderColor: 'primary.main',
                  bgcolor: isToday ? 'action.hover' : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Calendar size={18} color={isToday ? '#2563EB' : '#6B7280'} />
                  <Typography
                    variant="subtitle1"
                    fontWeight={isToday ? 700 : 600}
                    color={isToday ? 'primary.main' : 'text.primary'}
                  >
                    {day.label}
                  </Typography>
                </Box>

                {isLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
                  </Box>
                ) : classesForDay.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Sem aulas
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {classesForDay.map((cls) => {
                      const schedule = cls.schedule.find((s) => s.dayOfWeek === day.value);
                      if (!schedule) return null;

                      return (
                        <ClassCard
                          key={cls.id}
                          classData={cls}
                          schedule={schedule}
                          isNow={isClassNow(schedule.startTime, schedule.endTime, day.value)}
                        />
                      );
                    })}
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Legend */}
      <Paper sx={{ p: 2, mt: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Legenda
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'primary.main' }} />
            <Typography variant="body2">Aula acontecendo agora</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Adulto" size="small" variant="outlined" color="primary" />
            <Typography variant="body2">Turma adulto</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Kids" size="small" variant="outlined" color="secondary" />
            <Typography variant="body2">Turma infantil</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
