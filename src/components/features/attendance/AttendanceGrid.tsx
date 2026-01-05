'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  LinearProgress,
  SelectChangeEvent,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  ButtonGroup,
  useTheme,
  useMediaQuery,
  Drawer,
  Fab,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Grid3X3,
  List,
  CheckCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  History,
  RefreshCw,
} from 'lucide-react';
import { AttendanceCard, AttendanceCardSkeleton } from './AttendanceCard';
import { MobileAttendanceList } from './MobileAttendanceList';
import { useAttendance } from '@/hooks';
import { useConfirmDialog } from '@/components/providers';
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  getDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Student, BeltColor, KidsBeltColor } from '@/types';

// ============================================
// Belt Colors for List View
// ============================================
const BELT_COLORS: Record<BeltColor | KidsBeltColor, string> = {
  white: '#f5f5f5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
  grey: '#6B7280',
  yellow: '#EAB308',
  orange: '#EA580C',
  green: '#16A34A',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

// ============================================
// Props Interface
// ============================================
interface AttendanceGridProps {
  onViewProfile?: (student: { id: string }) => void;
  onReportInjury?: (student: { id: string }) => void;
  onPromote?: (student: { id: string }) => void;
}

// ============================================
// Stats Card Component
// ============================================
function StatCard({
  icon: Icon,
  label,
  value,
  compact,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string;
  compact?: boolean;
}) {
  return (
    <Paper
      sx={{
        p: compact ? 1.5 : 2,
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: compact ? 36 : 48,
          height: compact ? 36 : 48,
          borderRadius: 2,
          bgcolor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={compact ? 18 : 24} style={{ color: '#1a1a1a' }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ fontSize: compact ? '1.1rem' : '1.5rem', lineHeight: 1.2, color: '#1a1a1a' }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: compact ? '0.65rem' : '0.875rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

// ============================================
// Mini Calendar Component
// ============================================
interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  classesForDate: Array<{ id: string; name: string; schedule: Array<{ dayOfWeek: number }> }>;
  allClasses: Array<{ id: string; name: string; schedule: Array<{ dayOfWeek: number }> }>;
  compact?: boolean;
}

function MiniCalendar({ selectedDate, onDateSelect, allClasses, compact }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const prevMonth = () => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setViewMonth(today);
    onDateSelect(today);
  };

  // Check if a day has classes
  const hasClassesOnDay = useCallback(
    (date: Date) => {
      const dayOfWeek = date.getDay();
      return allClasses.some((cls) => cls.schedule.some((s) => s.dayOfWeek === dayOfWeek));
    },
    [allClasses]
  );

  return (
    <Paper sx={{ p: compact ? 1.5 : 2, borderRadius: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: compact ? 1 : 2 }}>
        <IconButton size="small" onClick={prevMonth}>
          <ChevronLeft size={compact ? 18 : 20} />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{ fontSize: compact ? '0.85rem' : '1rem', textTransform: 'capitalize' }}
          >
            {format(viewMonth, compact ? 'MMM yyyy' : 'MMMM yyyy', { locale: ptBR })}
          </Typography>
          {!isSameMonth(viewMonth, new Date()) && (
            <Chip
              label="Hoje"
              size="small"
              onClick={goToToday}
              sx={{ cursor: 'pointer', height: compact ? 20 : 24, fontSize: compact ? '0.65rem' : '0.75rem' }}
            />
          )}
        </Box>
        <IconButton size="small" onClick={nextMonth}>
          <ChevronRight size={compact ? 18 : 20} />
        </IconButton>
      </Box>

      {/* Weekday Headers */}
      <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
        {WEEKDAYS.map((day) => (
          <Grid size={{ xs: 12 / 7 }} key={day}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: compact ? '0.6rem' : '0.75rem',
              }}
            >
              {compact ? day[0] : day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Days */}
      <Grid container spacing={0.5}>
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isTodayDate = isToday(day);
          const hasClasses = hasClassesOnDay(day);
          const isFuture = day > new Date();

          return (
            <Grid size={{ xs: 12 / 7 }} key={day.toISOString()}>
              <Box
                onClick={() => !isFuture && onDateSelect(day)}
                sx={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                  opacity: !isCurrentMonth || isFuture ? 0.3 : 1,
                  bgcolor: isSelected
                    ? 'primary.main'
                    : isTodayDate
                    ? 'primary.50'
                    : 'transparent',
                  color: isSelected ? 'white' : 'text.primary',
                  border: isTodayDate && !isSelected ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  transition: 'all 0.15s ease',
                  '&:hover': !isFuture
                    ? {
                        bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                      }
                    : {},
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={isSelected || isTodayDate ? 600 : 400}
                  sx={{ fontSize: compact ? '0.7rem' : '0.875rem' }}
                >
                  {format(day, 'd')}
                </Typography>
                {hasClasses && !isSelected && isCurrentMonth && !isFuture && (
                  <Box
                    sx={{
                      width: compact ? 3 : 4,
                      height: compact ? 3 : 4,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mt: 0.25,
                    }}
                  />
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

// ============================================
// List Row Component (Compact View)
// ============================================
interface ListRowProps {
  student: Student;
  isPresent: boolean;
  onToggle: (student: Student) => void;
}

function ListRow({ student, isPresent, onToggle }: ListRowProps) {
  const beltColor = BELT_COLORS[student.currentBelt as BeltColor | KidsBeltColor] || '#6B7280';

  return (
    <Paper
      onClick={() => onToggle(student)}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        borderRadius: 2,
        border: '2px solid',
        borderColor: isPresent ? 'success.main' : 'transparent',
        bgcolor: isPresent ? 'success.50' : 'background.paper',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: isPresent ? 'success.100' : 'action.hover',
          transform: 'scale(1.01)',
        },
        '&:active': {
          transform: 'scale(0.99)',
        },
      }}
    >
      {/* Presence Indicator */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isPresent ? 'success.main' : 'grey.200',
          color: isPresent ? 'white' : 'grey.500',
          flexShrink: 0,
        }}
      >
        {isPresent ? <CheckCircle size={24} /> : <XCircle size={24} />}
      </Box>

      {/* Avatar */}
      <Avatar
        src={student.photoUrl}
        sx={{
          width: 40,
          height: 40,
          bgcolor: 'grey.300',
          flexShrink: 0,
        }}
      >
        {student.fullName[0]}
      </Avatar>

      {/* Name */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          fontWeight={600}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {student.nickname || student.fullName.split(' ')[0]}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {student.fullName}
        </Typography>
      </Box>

      {/* Belt Indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <Box
          sx={{
            width: 8,
            height: 24,
            borderRadius: 1,
            bgcolor: beltColor,
            border: student.currentBelt === 'white' ? '1px solid #e5e5e5' : 'none',
          }}
        />
        {student.currentStripes > 0 && (
          <Typography variant="caption" color="text.secondary">
            {student.currentStripes}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ============================================
// AttendanceGrid Component
// ============================================
export function AttendanceGrid({
  onViewProfile,
  onReportInjury,
  onPromote,
}: AttendanceGridProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);
  const { confirm } = useConfirmDialog();

  const {
    students,
    allClasses,
    classesForDate,
    selectedClass,
    selectedClassId,
    setSelectedClassId,
    selectedDate,
    setSelectedDate,
    isToday: isSelectedDateToday,
    scheduleOptions,
    selectedScheduleTime,
    setSelectedScheduleTime,
    toggleAttendance,
    isStudentPresent,
    markAllPresent,
    unmarkAllPresent,
    stats,
    isLoading,
    isMutating,
    refresh,
  } = useAttendance({ autoDetectClass: true });

  // Handle class change
  const handleClassChange = (event: SelectChangeEvent<string>) => {
    setSelectedClassId(event.target.value);
    setSearchQuery('');
    // Auto-select first schedule if available
    const selectedCls = classesForDate.find((c) => c.id === event.target.value);
    if (selectedCls) {
      const dayOfWeek = selectedDate.getDay();
      const firstSchedule = selectedCls.schedule.find((s) => s.dayOfWeek === dayOfWeek);
      if (firstSchedule) {
        setSelectedScheduleTime(firstSchedule.startTime);
      }
    }
  };

  // Handle schedule time change
  const handleScheduleChange = (event: SelectChangeEvent<string>) => {
    setSelectedScheduleTime(event.target.value);
  };

  // Handle view mode change
  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'grid' | 'list' | null
  ) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  // Navigate days
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => {
    const tomorrow = addDays(selectedDate, 1);
    if (tomorrow <= new Date()) {
      setSelectedDate(tomorrow);
    }
  };
  const goToToday = () => setSelectedDate(new Date());

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase().trim();
    return students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(query) ||
        student.nickname?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // Handle mark all present
  const handleMarkAllPresent = async () => {
    const confirmed = await confirm({
      title: 'Marcar Todos Presentes',
      message: `Deseja marcar todos os ${filteredStudents.length} alunos como presentes?`,
      confirmText: 'Marcar Todos',
      cancelText: 'Cancelar',
      severity: 'success',
    });

    if (confirmed) {
      markAllPresent(filteredStudents);
    }
  };

  // Handle unmark all present
  const handleUnmarkAllPresent = async () => {
    const confirmed = await confirm({
      title: 'Remover Todas Presencas',
      message: 'Deseja remover todas as presencas registradas?',
      confirmText: 'Remover Todas',
      cancelText: 'Cancelar',
      severity: 'error',
    });

    if (confirmed) {
      unmarkAllPresent();
    }
  };

  // Format selected date
  const formattedDate = useMemo(() => {
    return format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  }, [selectedDate]);

  // Loading skeletons
  if (isLoading) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Chamada
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {formattedDate}
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <AttendanceCardSkeleton />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AttendanceCardSkeleton key={i} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: { xs: 2, sm: 3 },
          flexWrap: 'wrap',
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            Chamada
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ textTransform: 'capitalize', fontSize: { xs: '0.8rem', sm: '1rem' } }}
            >
              {formattedDate}
            </Typography>
            {!isSelectedDateToday && (
              <Chip
                icon={<History size={isMobile ? 12 : 14} />}
                label="Historico"
                size="small"
                variant="outlined"
                sx={{ height: isMobile ? 22 : 24, fontSize: isMobile ? '0.65rem' : '0.75rem', borderColor: '#525252', color: '#525252' }}
              />
            )}
            {isSelectedDateToday && (
              <Chip
                icon={<Clock size={isMobile ? 12 : 14} />}
                label={format(new Date(), 'HH:mm')}
                size="small"
                variant="outlined"
                sx={{ height: isMobile ? 22 : 24, fontSize: isMobile ? '0.65rem' : '0.75rem' }}
              />
            )}
          </Box>
        </Box>

        {/* Quick Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton onClick={goToPreviousDay} size="small">
            <ChevronLeft size={isMobile ? 18 : 20} />
          </IconButton>
          <Button
            variant={isSelectedDateToday ? 'contained' : 'outlined'}
            size="small"
            onClick={goToToday}
            startIcon={!isMobile && <Calendar size={16} />}
            sx={{ minWidth: isMobile ? 'auto' : undefined, px: isMobile ? 1.5 : 2 }}
          >
            {isMobile ? <Calendar size={16} /> : 'Hoje'}
          </Button>
          <IconButton
            onClick={goToNextDay}
            size="small"
            disabled={addDays(selectedDate, 1) > new Date()}
          >
            <ChevronRight size={isMobile ? 18 : 20} />
          </IconButton>
          <IconButton
            onClick={refresh}
            size="small"
            title="Atualizar dados"
            sx={{ ml: 0.5 }}
          >
            <RefreshCw size={isMobile ? 16 : 18} />
          </IconButton>
        </Box>
      </Box>

      {/* Progress bar when mutating */}
      {isMutating && (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        />
      )}

      {/* Mobile Calendar Drawer */}
      <Drawer
        anchor="bottom"
        open={mobileCalendarOpen}
        onClose={() => setMobileCalendarOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh',
            p: 2,
          },
        }}
      >
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2 }} />
          <Typography variant="h6" fontWeight={600}>Selecionar Data</Typography>
        </Box>
        <MiniCalendar
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setMobileCalendarOpen(false);
          }}
          classesForDate={classesForDate}
          allClasses={allClasses}
        />
        {/* Class Selector in Drawer */}
        <Paper sx={{ p: 2, mt: 2, borderRadius: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Turma</InputLabel>
            <Select
              value={selectedClassId || ''}
              onChange={handleClassChange}
              label="Turma"
            >
              {classesForDate.length === 0 ? (
                <MenuItem value="" disabled>
                  Sem aulas neste dia
                </MenuItem>
              ) : (
                classesForDate.map((cls) => {
                  const daySchedules = cls.schedule.filter(
                    (s) => s.dayOfWeek === selectedDate.getDay()
                  );
                  const timeLabel = daySchedules.map((s) => s.startTime).join(', ');
                  return (
                    <MenuItem key={cls.id} value={cls.id}>
                      <Box>
                        <Typography variant="body2">{cls.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {timeLabel}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })
              )}
            </Select>
          </FormControl>
        </Paper>
      </Drawer>

      {/* Main Content */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Left Side - Calendar (Hidden on Mobile) */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <MiniCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            classesForDate={classesForDate}
            allClasses={allClasses}
          />

          {/* Class and Time Selectors */}
          <Paper sx={{ p: 2, mt: 2, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Selecionar Aula
            </Typography>

            {/* Class Selector */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Turma</InputLabel>
              <Select
                value={selectedClassId || ''}
                onChange={handleClassChange}
                label="Turma"
              >
                {classesForDate.length === 0 ? (
                  <MenuItem value="" disabled>
                    Sem aulas neste dia
                  </MenuItem>
                ) : (
                  classesForDate.map((cls) => {
                    const daySchedules = cls.schedule.filter(
                      (s) => s.dayOfWeek === selectedDate.getDay()
                    );
                    const timeLabel = daySchedules.map((s) => s.startTime).join(', ');
                    return (
                      <MenuItem key={cls.id} value={cls.id}>
                        <Box>
                          <Typography variant="body2">{cls.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {timeLabel}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>

            {/* Time/Schedule Selector */}
            {selectedClassId && scheduleOptions.length > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel>Horario</InputLabel>
                <Select
                  value={selectedScheduleTime || ''}
                  onChange={handleScheduleChange}
                  label="Horario"
                >
                  {scheduleOptions.map((opt) => (
                    <MenuItem key={opt.startTime} value={opt.startTime}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* No classes message */}
            {classesForDate.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Calendar size={32} style={{ color: '#9ca3af', marginBottom: 8 }} />
                <Typography variant="body2" color="text.secondary">
                  Nenhuma aula programada para {format(selectedDate, 'EEEE', { locale: ptBR })}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Side - Attendance */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          {/* Mobile Class Selector */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Turma</InputLabel>
                  <Select
                    value={selectedClassId || ''}
                    onChange={handleClassChange}
                    label="Turma"
                  >
                    {classesForDate.length === 0 ? (
                      <MenuItem value="" disabled>Sem aulas</MenuItem>
                    ) : (
                      classesForDate.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                <IconButton
                  onClick={() => setMobileCalendarOpen(true)}
                  sx={{ bgcolor: 'action.hover', borderRadius: 2 }}
                >
                  <Calendar size={20} />
                </IconButton>
              </Box>
            </Paper>
          </Box>

          {/* Stats */}
          <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Grid size={{ xs: 3, sm: 6, md: 3 }}>
              <StatCard
                icon={Users}
                label={isMobile ? "Total" : "Total de Alunos"}
                value={stats.totalStudents}
                color="primary"
                compact={isMobile}
              />
            </Grid>
            <Grid size={{ xs: 3, sm: 6, md: 3 }}>
              <StatCard
                icon={CheckCircle}
                label="Presentes"
                value={stats.presentCount}
                color="success"
                compact={isMobile}
              />
            </Grid>
            <Grid size={{ xs: 3, sm: 6, md: 3 }}>
              <StatCard
                icon={XCircle}
                label="Ausentes"
                value={stats.absentCount}
                color="error"
                compact={isMobile}
              />
            </Grid>
            <Grid size={{ xs: 3, sm: 6, md: 3 }}>
              <StatCard
                icon={CheckCircle}
                label={isMobile ? "Taxa" : "Taxa de Presenca"}
                value={`${stats.attendanceRate}%`}
                color="info"
                compact={isMobile}
              />
            </Grid>
          </Grid>

          {/* Toolbar: Search + Actions + View Toggle (Desktop only) */}
          {selectedClassId && students.length > 0 && !isMobile && (
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 1, sm: 2 },
                  flexWrap: 'wrap',
                }}
              >
                {/* Search */}
                <TextField
                  placeholder="Buscar aluno..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ flex: 1, minWidth: { xs: 120, sm: 200 } }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={isMobile ? 16 : 18} />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <X size={16} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {/* Bulk Actions */}
                <ButtonGroup variant="outlined" size="small">
                  <Button
                    onClick={handleMarkAllPresent}
                    startIcon={!isMobile && <CheckCheck size={16} />}
                    disabled={isMutating}
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, borderColor: '#1a1a1a', color: '#1a1a1a', '&:hover': { borderColor: '#1a1a1a', bgcolor: '#f5f5f5' } }}
                  >
                    {isMobile ? <CheckCheck size={16} /> : 'Todos'}
                  </Button>
                  <Button
                    onClick={handleUnmarkAllPresent}
                    startIcon={!isMobile && <X size={16} />}
                    disabled={isMutating || stats.presentCount === 0}
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, borderColor: '#525252', color: '#525252', '&:hover': { borderColor: '#525252', bgcolor: '#f5f5f5' } }}
                  >
                    {isMobile ? <X size={16} /> : 'Limpar'}
                  </Button>
                </ButtonGroup>

                {/* View Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                >
                  <ToggleButton value="grid">
                    <Grid3X3 size={isMobile ? 16 : 18} />
                  </ToggleButton>
                  <ToggleButton value="list">
                    <List size={isMobile ? 16 : 18} />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Search Results Count */}
              {searchQuery && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {filteredStudents.length} aluno{filteredStudents.length !== 1 ? 's' : ''} encontrado{filteredStudents.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Paper>
          )}

          {/* No class selected */}
          {!selectedClassId && classesForDate.length > 0 && (
            <Paper
              sx={{
                p: { xs: 3, sm: 4 },
                textAlign: 'center',
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Selecione uma turma para iniciar a chamada
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                Escolha uma turma no painel lateral
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'block', md: 'none' } }}>
                Escolha uma turma acima
              </Typography>
            </Paper>
          )}

          {/* No students */}
          {selectedClassId && students.length === 0 && (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhum aluno encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nao ha alunos ativos para esta turma
              </Typography>
            </Paper>
          )}

          {/* No search results */}
          {selectedClassId && students.length > 0 && filteredStudents.length === 0 && (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhum aluno encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tente buscar por outro nome
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => setSearchQuery('')}
              >
                Limpar Busca
              </Button>
            </Paper>
          )}

          {/* Mobile Optimized List */}
          {selectedClassId && students.length > 0 && isMobile && (
            <MobileAttendanceList
              students={students}
              isStudentPresent={isStudentPresent}
              onToggle={toggleAttendance}
              onMarkAll={handleMarkAllPresent}
              onUnmarkAll={handleUnmarkAllPresent}
            />
          )}

          {/* Desktop/Tablet Grid View */}
          {selectedClassId && filteredStudents.length > 0 && viewMode === 'grid' && !isMobile && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                  xl: 'repeat(5, 1fr)',
                },
                gap: { xs: 1, sm: 2 },
              }}
            >
              {filteredStudents.map((student) => (
                <AttendanceCard
                  key={student.id}
                  student={student}
                  isPresent={isStudentPresent(student.id)}
                  onToggle={toggleAttendance}
                  onViewProfile={onViewProfile ? () => onViewProfile({ id: student.id }) : undefined}
                  onReportInjury={onReportInjury ? () => onReportInjury({ id: student.id }) : undefined}
                  onPromote={onPromote ? () => onPromote({ id: student.id }) : undefined}
                />
              ))}
            </Box>
          )}

          {/* Desktop/Tablet List View */}
          {selectedClassId && filteredStudents.length > 0 && viewMode === 'list' && !isMobile && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredStudents.map((student) => (
                <ListRow
                  key={student.id}
                  student={student}
                  isPresent={isStudentPresent(student.id)}
                  onToggle={toggleAttendance}
                />
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default AttendanceGrid;
