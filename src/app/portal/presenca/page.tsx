'use client';

import { useMemo, useState } from 'react';
import { Box, Typography, Skeleton, Chip } from '@mui/material';
import { CheckCircle, Calendar } from 'lucide-react';
import { usePermissions } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { AcademyIndicator } from '@/components/portal/AcademyIndicator';
import { useQuery } from '@tanstack/react-query';
import { createAttendanceService } from '@/services/attendanceService';
import { createStudentService } from '@/services/studentService';
import { createClassService } from '@/services/classService';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getClassSport } from '@/types';
import { SportId, SPORTS } from '@/lib/constants/sports';

export default function PortalPresencaPage() {
  const { linkedStudentIds } = usePermissions();
  const { academyId } = useAcademy();
  const studentId = linkedStudentIds[0];
  const [sportFilter, setSportFilter] = useState<SportId | ''>('');

  const { data: student } = useQuery({
    queryKey: ['student', studentId, academyId],
    queryFn: () => {
      if (!academyId) return null;
      const studentService = createStudentService(academyId);
      return studentService.getById(studentId);
    },
    enabled: !!studentId && !!academyId,
  });

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['studentAttendanceRecords', studentId, academyId],
    queryFn: () => {
      if (!academyId) return [];
      const attendanceService = createAttendanceService(academyId);
      return attendanceService.getByStudent(studentId, 100);
    },
    enabled: !!studentId && !!academyId,
  });

  // Fetch student classes to build classId → sport map
  const { data: studentClasses } = useQuery({
    queryKey: ['studentClasses', studentId, academyId],
    queryFn: () => {
      if (!academyId) return [];
      const classService = createClassService(academyId);
      return classService.getByStudent(studentId);
    },
    enabled: !!studentId && !!academyId,
  });

  // Ensure attendanceRecords is always an array
  const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  // Build classId → sport map
  const classSportMap = useMemo(() => {
    const map: Record<string, SportId> = {};
    if (studentClasses) {
      studentClasses.forEach((cls) => {
        map[cls.id] = getClassSport(cls);
      });
    }
    return map;
  }, [studentClasses]);

  // Discover which sports the student has attendance in
  const attendanceSports = useMemo(() => {
    const sports = new Set<SportId>();
    records.forEach((r) => {
      const sport = classSportMap[r.classId] || 'bjj';
      sports.add(sport);
    });
    return [...sports];
  }, [records, classSportMap]);

  const showSportFilter = attendanceSports.length > 1;

  // Filter records by sport
  const filteredRecords = useMemo(() => {
    if (!sportFilter) return records;
    return records.filter((r) => {
      const sport = classSportMap[r.classId] || 'bjj';
      return sport === sportFilter;
    });
  }, [records, sportFilter, classSportMap]);

  // Calculate stats - include initialAttendanceCount (previous workouts from other gyms/periods)
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = filteredRecords.filter((a) => {
      const date = new Date(a.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const initialCount = !sportFilter ? (student?.initialAttendanceCount || 0) : 0;

    return {
      total: filteredRecords.length + initialCount,
      thisMonth: thisMonth.length,
    };
  }, [filteredRecords, student?.initialAttendanceCount, sportFilter]);

  // Calendar data for current month
  const calendarDays = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => ({
      date: day,
      hasAttendance: filteredRecords.some((a) => isSameDay(new Date(a.date), day)),
    }));
  }, [filteredRecords]);

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
      {/* Academy indicator for multi-academy users */}
      <AcademyIndicator label="Presencas de" icon={<CheckCircle size={16} />} />

      {/* Sport Filter Chips */}
      {showSportFilter && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label="Todos"
            size="small"
            variant={sportFilter === '' ? 'filled' : 'outlined'}
            color={sportFilter === '' ? 'primary' : 'default'}
            onClick={() => setSportFilter('')}
          />
          {attendanceSports.map((sportId) => (
            <Chip
              key={sportId}
              label={SPORTS[sportId]?.labelShort || sportId}
              size="small"
              variant={sportFilter === sportId ? 'filled' : 'outlined'}
              color={sportFilter === sportId ? 'primary' : 'default'}
              onClick={() => setSportFilter(sportId)}
            />
          ))}
        </Box>
      )}

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
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

      {/* Calendar + History Container */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'grid' },
          flexDirection: 'column',
          gridTemplateColumns: { md: '1fr 1fr' },
          gap: { xs: 3, md: 3 },
        }}
      >
        {/* Calendar View */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
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

        {filteredRecords.length === 0 ? (
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
            {filteredRecords.slice(0, 15).map((record) => {
              const recordSport = classSportMap[record.classId];
              const sportLabel = recordSport && showSportFilter ? SPORTS[recordSport]?.labelShort : null;
              return (
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                      >
                        {record.className || 'Treino'}
                      </Typography>
                      {sportLabel && (
                        <Chip
                          label={sportLabel}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        </Box>
      </Box>
    </Box>
  );
}
