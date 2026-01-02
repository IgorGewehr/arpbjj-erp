'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Drawer,
  Button,
} from '@mui/material';
import { Search, Grid, List, Users, Filter, X } from 'lucide-react';
import { StudentCard } from './StudentCard';
import { QuickRegisterFab } from './QuickRegisterFab';
import { useStudents, useClasses } from '@/hooks';
import { Student, BeltColor, StudentStatus, StudentCategory } from '@/types';
import { useRouter } from 'next/navigation';

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
  } = useStudents();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [classFilter, setClassFilter] = useState<string>('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter students by search term and class
  const filteredStudents = useMemo(() => {
    let result = students;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.nickname?.toLowerCase().includes(term) ||
          s.phone.includes(term)
      );
    }

    // Filter by class
    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        result = result.filter(s => selectedClass.studentIds?.includes(s.id));
      }
    }

    return result;
  }, [students, searchTerm, classFilter, classes]);

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

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'grid' | 'list' | null) => {
      if (newMode) setViewMode(newMode);
    },
    []
  );

  // Handle new student success
  const handleNewStudentSuccess = useCallback(
    (studentId: string) => {
      router.push(`/alunos/${studentId}`);
    },
    [router]
  );

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;
    return filterCount + (classFilter ? 1 : 0);
  }, [filters, classFilter]);

  // Clear all filters including class filter
  const handleClearFilters = useCallback(() => {
    clearFilters();
    setClassFilter('');
  }, [clearFilters]);

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
    </>
  );

  return (
    <Box>
      {/* Mobile Filters Drawer */}
      <Drawer
        anchor="bottom"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70vh',
            p: 2,
          },
        }}
      >
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>Filtros</Typography>
          <IconButton onClick={() => setMobileFiltersOpen(false)}>
            <X size={20} />
          </IconButton>
        </Box>
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
      </Drawer>

      {/* Header */}
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
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

      {/* Loading State */}
      {isLoading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid'
              ? { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }
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
      {!isLoading && filteredStudents.length === 0 && (
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid'
              ? { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }
              : '1fr',
            gap: { xs: 1, sm: 2 },
          }}
        >
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={handleStudentClick}
              compact={viewMode === 'list'}
            />
          ))}
        </Box>
      )}

      {/* Quick Register FAB */}
      <QuickRegisterFab onSuccess={handleNewStudentSuccess} />
    </Box>
  );
}

export default StudentList;
