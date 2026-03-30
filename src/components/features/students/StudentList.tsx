'use client';

import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Skeleton,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
  ListItemButton,
  Tooltip,
} from '@mui/material';
import { Search, Grid, List, Users, Filter, FileText, Download, Calendar } from 'lucide-react';
import { StudentCard } from './StudentCard';
import { QuickRegisterFab } from './QuickRegisterFab';
import { useStudents, useClasses, usePlans } from '@/hooks';
import { Student, BeltColor, KidsBeltColor, StudentStatus, StudentCategory, getStudentSports } from '@/types';
import { SportId, SPORT_OPTIONS, SPORTS, getGradesForSport } from '@/lib/constants/sports';

// ============================================
// Sort Options
// ============================================
type SortOption = 'alphabetical' | 'graduation' | 'attendance' | 'tatami_time';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'alphabetical', label: 'Ordem Alfabética' },
  { value: 'graduation', label: 'Graduação' },
  { value: 'attendance', label: 'Número de Presenças' },
  { value: 'tatami_time', label: 'Tempo de Tatame' },
];

// Belt order maps (higher index = higher graduation)
const adultBeltOrder: Record<string, number> = {
  white: 0,
  blue: 1,
  purple: 2,
  brown: 3,
  black: 4,
};

const kidsBeltOrder: Record<string, number> = {
  white: 0,
  grey: 1,
  'grey-white': 2,
  'grey-black': 3,
  yellow: 4,
  'yellow-white': 5,
  'yellow-black': 6,
  orange: 7,
  'orange-white': 8,
  'orange-black': 9,
  green: 10,
  'green-white': 11,
  'green-black': 12,
};

// Get belt order value (combining adults and kids)
function getBeltOrderValue(belt: string, stripes: number): number {
  const adultOrder = adultBeltOrder[belt];
  const kidsOrder = kidsBeltOrder[belt];

  // Base value: belt order * 10 + stripes (to account for stripes within same belt)
  if (adultOrder !== undefined) {
    return adultOrder * 10 + stripes;
  }
  if (kidsOrder !== undefined) {
    // Kids belts start after adult black belt (50+)
    return 50 + kidsOrder * 10 + stripes;
  }
  return 0;
}

// Get total attendance count
function getTotalAttendance(student: Student): number {
  return (student.initialAttendanceCount || 0) + (student.attendanceCount || 0);
}

// Get tatami start date (jiu-jitsu start date or academy start date)
function getTatamiStartDate(student: Student): Date {
  return student.jiujitsuStartDate || student.startDate;
}
import { useRouter } from 'next/navigation';
import { BottomSheet, FadeInView, ScaleOnPress } from '@/components/mobile';
import { useAcademy } from '@/contexts/AcademyContext';
import { createAttendanceService } from '@/services/attendanceService';
import { generateAttendanceReportPDF } from '@/lib/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// Debounced Search Input Component (Optimized)
// ============================================
interface DebouncedSearchInputProps {
  onSearch: (term: string) => void;
  isSearching: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  sx?: Record<string, unknown>;
}

const DebouncedSearchInput = memo(function DebouncedSearchInput({
  onSearch,
  isSearching,
  placeholder = 'Buscar...',
  size = 'small',
  fullWidth = false,
  sx = {},
}: DebouncedSearchInputProps) {
  const [localValue, setLocalValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search callback
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 400);
  }, [onSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <TextField
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      size={size}
      fullWidth={fullWidth}
      sx={sx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            {isSearching ? <CircularProgress size={18} /> : <Search size={18} />}
          </InputAdornment>
        ),
      }}
    />
  );
});

// ============================================
// Belt Options
// ============================================
const adultBeltOptions: { value: BeltColor | ''; label: string }[] = [
  { value: '', label: 'Todas as Faixas' },
  { value: 'white', label: 'Branca' },
  { value: 'blue', label: 'Azul' },
  { value: 'purple', label: 'Roxa' },
  { value: 'brown', label: 'Marrom' },
  { value: 'black', label: 'Preta' },
];

const kidsBeltOptions: { value: KidsBeltColor | ''; label: string }[] = [
  { value: '', label: 'Todas as Faixas' },
  { value: 'white', label: 'Branca' },
  { value: 'grey', label: 'Cinza' },
  { value: 'grey-white', label: 'Cinza/Branca' },
  { value: 'grey-black', label: 'Cinza/Preta' },
  { value: 'yellow', label: 'Amarela' },
  { value: 'yellow-white', label: 'Amarela/Branca' },
  { value: 'yellow-black', label: 'Amarela/Preta' },
  { value: 'orange', label: 'Laranja' },
  { value: 'orange-white', label: 'Laranja/Branca' },
  { value: 'orange-black', label: 'Laranja/Preta' },
  { value: 'green', label: 'Verde' },
  { value: 'green-white', label: 'Verde/Branca' },
  { value: 'green-black', label: 'Verde/Preta' },
];

const allBeltOptions: { value: BeltColor | KidsBeltColor | ''; label: string }[] = [
  { value: '', label: 'Todas as Faixas' },
  // Adult belts
  { value: 'white', label: 'Branca' },
  { value: 'blue', label: 'Azul' },
  { value: 'purple', label: 'Roxa' },
  { value: 'brown', label: 'Marrom' },
  { value: 'black', label: 'Preta' },
  // Kids belts
  { value: 'grey', label: 'Cinza' },
  { value: 'grey-white', label: 'Cinza/Branca' },
  { value: 'grey-black', label: 'Cinza/Preta' },
  { value: 'yellow', label: 'Amarela' },
  { value: 'yellow-white', label: 'Amarela/Branca' },
  { value: 'yellow-black', label: 'Amarela/Preta' },
  { value: 'orange', label: 'Laranja' },
  { value: 'orange-white', label: 'Laranja/Branca' },
  { value: 'orange-black', label: 'Laranja/Preta' },
  { value: 'green', label: 'Verde' },
  { value: 'green-white', label: 'Verde/Branca' },
  { value: 'green-black', label: 'Verde/Preta' },
];

// ============================================
// Status Options
// ============================================
const statusOptions: { value: StudentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os Status' },
  { value: 'active', label: 'Ativos' },
  { value: 'injured', label: 'Lesionados' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'suspended', label: 'Suspensos' },
];

// ============================================
// Category Options
// ============================================
const categoryOptions: { value: StudentCategory | ''; label: string }[] = [
  { value: '', label: 'Todas as Categorias' },
  { value: 'kids', label: 'Kids' },
  { value: 'adult', label: 'Adulto' },
];

// ============================================
// StudentList Component
// ============================================
export function StudentList() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const {
    students,
    filters,
    updateFilter,
    clearFilters,
    stats,
    isLoading,
    isSearching,
    handleSearch,
    searchTerm,
    clearSearch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    updateStudent,
  } = useStudents();
  const { classes } = useClasses();
  const { plans } = usePlans();
  const { academyId, academy } = useAcademy();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [classFilter, setClassFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<SportId | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const initialViewModeSet = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // PDF Report state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfSelectedClasses, setPdfSelectedClasses] = useState<string[]>([]);
  const [pdfStartDate, setPdfStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [pdfEndDate, setPdfEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Definir viewMode padrão como 'list' em telas pequenas (mobile)
  useEffect(() => {
    if (!initialViewModeSet.current) {
      setViewMode(isMobile ? 'list' : 'grid');
      initialViewModeSet.current = true;
    }
  }, [isMobile]);

  // Infinite scroll - IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isSearching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isSearching, fetchNextPage]);

  // Filter and sort students by class, plan, sport, and sort option
  const filteredStudents = useMemo(() => {
    let result = students;

    // Filter by class
    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        result = result.filter(s => selectedClass.studentIds?.includes(s.id));
      }
    }

    // Filter by plan
    if (planFilter) {
      result = result.filter(s => s.planId === planFilter);
    }

    // Filter by sport
    if (sportFilter) {
      result = result.filter(s => getStudentSports(s).includes(sportFilter as SportId));
    }

    // Filter by account link status
    if (accountFilter === 'linked') {
      result = result.filter(s => !!s.linkedUserId);
    } else if (accountFilter === 'unlinked') {
      result = result.filter(s => !s.linkedUserId);
    }

    // Sort students
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.fullName.localeCompare(b.fullName, 'pt-BR');

        case 'graduation':
          // Higher graduation first (descending)
          const aGraduation = getBeltOrderValue(a.currentBelt, a.currentStripes);
          const bGraduation = getBeltOrderValue(b.currentBelt, b.currentStripes);
          return bGraduation - aGraduation;

        case 'attendance':
          // More attendance first (descending)
          return getTotalAttendance(b) - getTotalAttendance(a);

        case 'tatami_time':
          // Older (more time on tatami) first - earlier date comes first
          const aDate = getTatamiStartDate(a);
          const bDate = getTatamiStartDate(b);
          return new Date(aDate).getTime() - new Date(bDate).getTime();

        default:
          return 0;
      }
    });

    return result;
  }, [students, classFilter, classes, planFilter, accountFilter, sortBy]);

  // Handle student click
  const handleStudentClick = useCallback(
    (student: Student) => {
      router.push(`/alunos/${student.id}`);
    },
    [router]
  );

  // Handle quick status change from card kebab menu
  const handleCardStatusChange = useCallback(
    (student: Student, newStatus: StudentStatus) => {
      updateStudent({ id: student.id, data: { status: newStatus } });
    },
    [updateStudent]
  );

  // Handle filter changes
  const handleBeltChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      updateFilter('belt', e.target.value || undefined);
    },
    [updateFilter]
  );

  const handleStatusChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      updateFilter('status', e.target.value || undefined);
    },
    [updateFilter]
  );

  const handleCategoryChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      const newCategory = e.target.value || undefined;
      updateFilter('category', newCategory);
      // Reset belt filter when category changes (belts are different per category)
      updateFilter('belt', undefined);
    },
    [updateFilter]
  );

  // Get belt/grade options based on sport and category filter
  const currentBeltOptions = useMemo(() => {
    if (sportFilter && sportFilter !== 'bjj') {
      // For non-BJJ sports, show grades from that sport definition
      const sportGrades = getGradesForSport(sportFilter as SportId, 'adult');
      const sportLabel = SPORTS[sportFilter as SportId]?.gradeSystem === 'armband' ? 'Prajied' : 'Faixa';
      return [
        { value: '' as const, label: `Todas as ${sportLabel}s` },
        ...sportGrades.map(g => ({ value: g.id as BeltColor | KidsBeltColor | '', label: g.label })),
      ];
    }
    // Default: BJJ belts by category
    if (filters.category === 'kids') {
      return kidsBeltOptions;
    } else if (filters.category === 'adult') {
      return adultBeltOptions;
    }
    return allBeltOptions;
  }, [filters.category, sportFilter]);

  const handleSportChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      const newSport = e.target.value as SportId | '';
      setSportFilter(newSport);
      // Reset belt filter when sport changes (grades differ per sport)
      updateFilter('belt', undefined);
    },
    [updateFilter]
  );

  const handleClassChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      setClassFilter(e.target.value);
    },
    []
  );

  const handlePlanChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      setPlanFilter(e.target.value);
    },
    []
  );

  const handleAccountChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      setAccountFilter(e.target.value);
    },
    []
  );

  const handleSortChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      setSortBy(e.target.value as SortOption);
    },
    []
  );

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'grid' | 'list' | null) => {
      if (newMode) setViewMode(newMode);
    },
    []
  );

  // Handle new student success - stay on /alunos page
  const handleNewStudentSuccess = useCallback(() => {
    // The list will auto-refresh via React Query invalidation
    // No redirect needed - stay on current page
  }, []);

  const handleGenerateAttendancePDF = useCallback(async () => {
    if (!academyId || pdfSelectedClasses.length === 0) return;
    setPdfGenerating(true);
    try {
      const attendanceService = createAttendanceService(academyId);
      const startDate = new Date(pdfStartDate + 'T00:00:00');
      const endDate = new Date(pdfEndDate + 'T23:59:59');

      // Fetch attendance for the period
      const allAttendance = await attendanceService.getByDateRange(startDate, endDate);

      // Filter by selected classes
      const filteredAttendance = allAttendance.filter(a => pdfSelectedClasses.includes(a.classId));

      // Build class data
      const selectedClassObjs = classes.filter(c => pdfSelectedClasses.includes(c.id));
      const classData = selectedClassObjs.map(cls => {
        const classAttendance = filteredAttendance.filter(a => a.classId === cls.id);

        // Count per student
        const studentCounts = new Map<string, { name: string; count: number }>();
        for (const att of classAttendance) {
          const existing = studentCounts.get(att.studentId);
          if (existing) {
            existing.count++;
          } else {
            studentCounts.set(att.studentId, { name: att.studentName || att.studentId, count: 1 });
          }
        }

        return {
          id: cls.id,
          name: cls.name,
          instructorName: cls.instructorName,
          students: Array.from(studentCounts.values()).map(s => ({
            name: s.name,
            attendanceCount: s.count,
          })),
        };
      });

      // Build class days with schedules
      const dayMap = new Map<string, { date: Date; classNames: Set<string>; classSchedules: Map<string, { name: string; startTime: string; endTime: string }> }>();
      for (const att of filteredAttendance) {
        const dayKey = att.date.toISOString().split('T')[0];
        const cls = selectedClassObjs.find(c => c.id === att.classId);
        const className = cls?.name || att.className || 'Turma';
        const dayOfWeek = att.date.getDay();
        const scheduleEntry = cls?.schedule?.find(s => s.dayOfWeek === dayOfWeek);
        const scheduleInfo = {
          name: className,
          startTime: scheduleEntry?.startTime || '',
          endTime: scheduleEntry?.endTime || '',
        };
        const existing = dayMap.get(dayKey);
        if (existing) {
          existing.classNames.add(className);
          if (!existing.classSchedules.has(className)) {
            existing.classSchedules.set(className, scheduleInfo);
          }
        } else {
          const schedMap = new Map<string, { name: string; startTime: string; endTime: string }>();
          schedMap.set(className, scheduleInfo);
          dayMap.set(dayKey, { date: att.date, classNames: new Set([className]), classSchedules: schedMap });
        }
      }

      const classDays = Array.from(dayMap.values()).map(d => ({
        date: d.date,
        classNames: Array.from(d.classNames),
        classSchedules: Array.from(d.classSchedules.values()).sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));

      // Period label
      const startMonth = format(startDate, 'MMMM/yyyy', { locale: ptBR });
      const periodLabel = startMonth.charAt(0).toUpperCase() + startMonth.slice(1);

      const doc = generateAttendanceReportPDF({
        academyName: academy?.name || 'Academia',
        classes: classData,
        classDays,
        periodLabel,
        startDate,
        endDate,
      });

      doc.save(`Relatorio_Presenca_${pdfStartDate}_${pdfEndDate}.pdf`);
      setPdfDialogOpen(false);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setPdfGenerating(false);
    }
  }, [academyId, academy, pdfSelectedClasses, pdfStartDate, pdfEndDate, classes]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;
    return filterCount + (classFilter ? 1 : 0) + (planFilter ? 1 : 0) + (accountFilter ? 1 : 0) + (sportFilter ? 1 : 0);
  }, [filters, classFilter, planFilter, accountFilter, sportFilter]);

  // Clear all filters including class, plan filter and search
  const handleClearFilters = useCallback(() => {
    clearFilters();
    clearSearch();
    setClassFilter('');
    setPlanFilter('');
    setAccountFilter('');
    setSportFilter('');
  }, [clearFilters, clearSearch]);

  // MenuProps for Selects inside BottomSheet (needs higher z-index)
  const selectMenuProps = isMobile ? { sx: { zIndex: 1400 } } : undefined;

  // Determine if the selected sport has grades (boxing has none)
  const selectedSportHasGrades = !sportFilter || SPORTS[sportFilter as SportId]?.gradeSystem !== 'none';
  const gradeFilterLabel = sportFilter && SPORTS[sportFilter as SportId]?.gradeSystem === 'armband'
    ? 'Prajied'
    : 'Faixa';

  // Filter content for both desktop and mobile
  const FilterContent = (
    <>
      {/* Sport Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Esporte</InputLabel>
        <Select
          value={sportFilter}
          onChange={handleSportChange}
          label="Esporte"
          MenuProps={selectMenuProps}
        >
          <MenuItem value="">Todos os Esportes</MenuItem>
          {SPORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Belt / Grade Filter — hidden for sports with no grade system */}
      {selectedSportHasGrades && (
        <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
          <InputLabel>{gradeFilterLabel}</InputLabel>
          <Select
            value={(filters.belt as string) || ''}
            onChange={handleBeltChange}
            label={gradeFilterLabel}
            MenuProps={selectMenuProps}
          >
            {currentBeltOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Status Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={(filters.status as string) || ''}
          onChange={handleStatusChange}
          label="Status"
          MenuProps={selectMenuProps}
        >
          {statusOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Category Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Categoria</InputLabel>
        <Select
          value={(filters.category as string) || ''}
          onChange={handleCategoryChange}
          label="Categoria"
          MenuProps={selectMenuProps}
        >
          {categoryOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Class Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Turma</InputLabel>
        <Select
          value={classFilter}
          onChange={handleClassChange}
          label="Turma"
          MenuProps={selectMenuProps}
        >
          <MenuItem value="">Todas as Turmas</MenuItem>
          {classes.map((cls) => (
            <MenuItem key={cls.id} value={cls.id}>
              {cls.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Plan Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Plano</InputLabel>
        <Select
          value={planFilter}
          onChange={handlePlanChange}
          label="Plano"
          MenuProps={selectMenuProps}
        >
          <MenuItem value="">Todos os Planos</MenuItem>
          {plans.map((plan) => (
            <MenuItem key={plan.id} value={plan.id}>
              {plan.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Account Link Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Conta</InputLabel>
        <Select
          value={accountFilter}
          onChange={handleAccountChange}
          label="Conta"
          MenuProps={selectMenuProps}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="linked">Com conta</MenuItem>
          <MenuItem value="unlinked">Sem conta</MenuItem>
        </Select>
      </FormControl>

      {/* Sort By */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 180 }}>
        <InputLabel>Ordenar por</InputLabel>
        <Select
          value={sortBy}
          onChange={handleSortChange}
          label="Ordenar por"
          MenuProps={selectMenuProps}
        >
          {sortOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Mobile Filters BottomSheet */}
      <BottomSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filtros"
        height="auto"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FilterContent}
          {activeFiltersCount > 0 && (
            <Button
              variant="outlined"
              onClick={() => {
                handleClearFilters();
                setMobileFiltersOpen(false);
              }}
              fullWidth
            >
              Limpar filtros ({activeFiltersCount})
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => setMobileFiltersOpen(false)}
            fullWidth
          >
            Aplicar Filtros
          </Button>
        </Box>
      </BottomSheet>

      {/* Header */}
      <FadeInView direction="down" delay={0}>
        <Box sx={{ mb: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography
                variant="h4"
                fontWeight={700}
                gutterBottom
                sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                Alunos
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}
              >
                {stats.total} alunos ({stats.byStatus.active} ativos)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Relatório de Presença (PDF)">
                <IconButton
                  onClick={() => setPdfDialogOpen(true)}
                  size="small"
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <FileText size={isMobile ? 16 : 18} />
                </IconButton>
              </Tooltip>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="grid">
                  <Grid size={isMobile ? 16 : 18} />
                </ToggleButton>
                <ToggleButton value="list">
                  <List size={isMobile ? 16 : 18} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

        {/* Filters - Mobile */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, alignItems: 'center' }}>
          <DebouncedSearchInput
            onSearch={handleSearch}
            isSearching={isSearching}
            placeholder="Buscar aluno..."
            fullWidth
            sx={{ flex: 1 }}
          />
          <IconButton
            onClick={() => setMobileFiltersOpen(true)}
            sx={{
              bgcolor: activeFiltersCount > 0 ? 'primary.main' : 'action.hover',
              color: activeFiltersCount > 0 ? 'white' : 'text.primary',
              borderRadius: 2,
              '&:hover': {
                bgcolor: activeFiltersCount > 0 ? 'primary.dark' : 'action.selected',
              },
            }}
          >
            <Filter size={18} />
          </IconButton>
          {activeFiltersCount > 0 && (
            <Chip
              label={activeFiltersCount}
              size="small"
              color="primary"
              sx={{ height: 22, minWidth: 22 }}
            />
          )}
        </Box>

        {/* Filters - Desktop */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <DebouncedSearchInput
            onSearch={handleSearch}
            isSearching={isSearching}
            placeholder="Buscar aluno..."
            sx={{ minWidth: 250 }}
          />

          {FilterContent}

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Chip
              label={`Limpar filtros (${activeFiltersCount})`}
              onClick={handleClearFilters}
              onDelete={handleClearFilters}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        </Box>
      </FadeInView>

      {/* Loading State */}
      {isLoading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid'
              ? {
                  xs: 'repeat(auto-fill, minmax(140px, 1fr))',
                  sm: 'repeat(auto-fill, minmax(200px, 1fr))',
                  md: 'repeat(auto-fill, minmax(240px, 1fr))',
                }
              : '1fr',
            gap: { xs: 1, sm: 2 },
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={viewMode === 'grid' ? (isMobile ? 100 : 140) : 60}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && !isSearching && filteredStudents.length === 0 && (
        <Paper
          sx={{
            p: { xs: 4, sm: 6 },
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Users size={isMobile ? 36 : 48} style={{ color: '#9ca3af', marginBottom: 16 }} />
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Nenhum aluno encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            {searchTerm || activeFiltersCount > 0
              ? 'Tente ajustar os filtros de busca'
              : 'Clique no botão + para cadastrar um novo aluno'}
          </Typography>
        </Paper>
      )}

      {/* Students Grid/List */}
      {!isLoading && filteredStudents.length > 0 && (
        <FadeInView direction="up" delay={100}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid'
                ? {
                    xs: 'repeat(auto-fill, minmax(140px, 1fr))',
                    sm: 'repeat(auto-fill, minmax(200px, 1fr))',
                    md: 'repeat(auto-fill, minmax(240px, 1fr))',
                  }
                : '1fr',
              gap: { xs: 1, sm: 2 },
            }}
          >
            {filteredStudents.map((student) => (
              <ScaleOnPress key={student.id}>
                <StudentCard
                  student={student}
                  displaySport={sportFilter || undefined}
                  onClick={handleStudentClick}
                  onStatusChange={handleCardStatusChange}
                  compact={viewMode === 'list'}
                />
              </ScaleOnPress>
            ))}
          </Box>

          {/* Load More Trigger */}
          {hasNextPage && !searchTerm && (
            <Box
              ref={loadMoreRef}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 4,
                gap: 2,
              }}
            >
              {isFetchingNextPage ? (
                <>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    Carregando mais alunos...
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Role para carregar mais
                </Typography>
              )}
            </Box>
          )}
        </FadeInView>
      )}

      {/* Quick Register FAB */}
      <QuickRegisterFab onSuccess={handleNewStudentSuccess} />

      {/* PDF Report Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} />
            Relatório de Presença
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Selecione as turmas e o período para gerar o relatório em PDF.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={pdfStartDate}
                onChange={(e) => setPdfStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={pdfEndDate}
                onChange={(e) => setPdfEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Turmas</Typography>
              <Paper variant="outlined" sx={{ maxHeight: 240, overflow: 'auto', borderRadius: 2 }}>
                {classes.map((cls) => (
                  <ListItemButton
                    key={cls.id}
                    dense
                    onClick={() => {
                      setPdfSelectedClasses(prev =>
                        prev.includes(cls.id)
                          ? prev.filter(id => id !== cls.id)
                          : [...prev, cls.id]
                      );
                    }}
                    sx={{ py: 0.5 }}
                  >
                    <Checkbox
                      checked={pdfSelectedClasses.includes(cls.id)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <ListItemText
                      primary={cls.name}
                      secondary={cls.instructorName ? `Prof. ${cls.instructorName}` : undefined}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                ))}
                {classes.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    Nenhuma turma encontrada
                  </Typography>
                )}
              </Paper>
              {classes.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setPdfSelectedClasses(classes.map(c => c.id))}
                  >
                    Selecionar todas
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setPdfSelectedClasses([])}
                  >
                    Limpar
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPdfDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateAttendancePDF}
            disabled={pdfGenerating || pdfSelectedClasses.length === 0}
            startIcon={pdfGenerating ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
          >
            {pdfGenerating ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StudentList;
