'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from '@mui/material';
import { Search, Grid, List, Users, Filter, X } from 'lucide-react';
import { StudentCard } from './StudentCard';
import { QuickRegisterFab } from './QuickRegisterFab';
import { useStudents, useClasses, usePlans } from '@/hooks';
import { Student, BeltColor, StudentStatus, StudentCategory } from '@/types';
import { useRouter } from 'next/navigation';
import { BottomSheet, FadeInView, ScaleOnPress } from '@/components/mobile';

// ============================================
// Belt Options
// ============================================
const beltOptions: { value: BeltColor | ''; label: string }[] = [
  { value: '', label: 'Todas as Faixas' },
  { value: 'white', label: 'Branca' },
  { value: 'blue', label: 'Azul' },
  { value: 'purple', label: 'Roxa' },
  { value: 'brown', label: 'Marrom' },
  { value: 'black', label: 'Preta' },
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
  } = useStudents();
  const { classes } = useClasses();
  const { plans } = usePlans();

  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [classFilter, setClassFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const initialViewModeSet = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Definir viewMode padrão como 'list' em telas pequenas (mobile)
  useEffect(() => {
    if (!initialViewModeSet.current) {
      setViewMode(isMobile ? 'list' : 'grid');
      initialViewModeSet.current = true;
    }
  }, [isMobile]);

  // Debounced search - calls database after 300ms of no typing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(localSearchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localSearchTerm, handleSearch]);

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

  // Filter students by class and plan (local filters)
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

    return result;
  }, [students, classFilter, classes, planFilter]);

  // Handle student click
  const handleStudentClick = useCallback(
    (student: Student) => {
      router.push(`/alunos/${student.id}`);
    },
    [router]
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
      updateFilter('category', e.target.value || undefined);
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

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;
    return filterCount + (classFilter ? 1 : 0) + (planFilter ? 1 : 0);
  }, [filters, classFilter, planFilter]);

  // Clear all filters including class, plan filter and search
  const handleClearFilters = useCallback(() => {
    clearFilters();
    clearSearch();
    setLocalSearchTerm('');
    setClassFilter('');
    setPlanFilter('');
  }, [clearFilters, clearSearch]);

  // Filter content for both desktop and mobile
  const FilterContent = (
    <>
      {/* Belt Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Faixa</InputLabel>
        <Select
          value={(filters.belt as string) || ''}
          onChange={handleBeltChange}
          label="Faixa"
        >
          {beltOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Status Filter */}
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={(filters.status as string) || ''}
          onChange={handleStatusChange}
          label="Status"
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
        >
          <MenuItem value="">Todos os Planos</MenuItem>
          {plans.map((plan) => (
            <MenuItem key={plan.id} value={plan.id}>
              {plan.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
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
          <TextField
            placeholder="Buscar aluno..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isSearching ? <CircularProgress size={16} /> : <Search size={16} />}
                </InputAdornment>
              ),
            }}
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
          <TextField
            placeholder="Buscar aluno..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isSearching ? <CircularProgress size={18} /> : <Search size={18} />}
                </InputAdornment>
              ),
            }}
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
            {localSearchTerm || activeFiltersCount > 0
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
                  onClick={handleStudentClick}
                  compact={viewMode === 'list'}
                />
              </ScaleOnPress>
            ))}
          </Box>

          {/* Load More Trigger */}
          {hasNextPage && !localSearchTerm && (
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
    </Box>
  );
}

export default StudentList;
