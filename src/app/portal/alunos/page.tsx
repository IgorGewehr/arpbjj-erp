'use client';

import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
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
  Fab,
} from '@mui/material';
import {
  Users,
  Search,
  Grid,
  List,
  Filter,
  Plus,
} from 'lucide-react';
import { StudentCard } from '@/components/features/students';
import { useIsMonitor, useStudents, useClasses } from '@/hooks';
import { Student, StudentStatus, StudentCategory } from '@/types';
import { BottomSheet, FadeInView, ScaleOnPress } from '@/components/mobile';

// ============================================
// Debounced Search Input Component
// ============================================
const DebouncedSearchInput = memo(function DebouncedSearchInput({
  onSearch,
  isSearching,
  placeholder = 'Buscar...',
}: {
  onSearch: (term: string) => void;
  isSearching: boolean;
  placeholder?: string;
}) {
  const [localValue, setLocalValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 400);
  }, [onSearch]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <TextField
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      size="small"
      fullWidth
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

// Belt/Status/Category options
const statusOptions: { value: StudentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os Status' },
  { value: 'active', label: 'Ativos' },
  { value: 'injured', label: 'Lesionados' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'suspended', label: 'Suspensos' },
];

const categoryOptions: { value: StudentCategory | ''; label: string }[] = [
  { value: '', label: 'Todas as Categorias' },
  { value: 'kids', label: 'Kids' },
  { value: 'adult', label: 'Adulto' },
];

export default function MonitorAlunosPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMonitor = useIsMonitor();

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

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [classFilter, setClassFilter] = useState<string>('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isSearching) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isSearching, fetchNextPage]);

  // Filter students by class
  const filteredStudents = useMemo(() => {
    let result = students;
    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        result = result.filter(s => selectedClass.studentIds?.includes(s.id));
      }
    }
    return [...result].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
  }, [students, classFilter, classes]);

  // Navigate to monitor student detail (not admin)
  const handleStudentClick = useCallback((student: Student) => {
    router.push(`/portal/alunos/${student.id}`);
  }, [router]);

  const handleStatusChange = useCallback((e: SelectChangeEvent<string>) => {
    updateFilter('status', e.target.value || undefined);
  }, [updateFilter]);

  const handleCategoryChange = useCallback((e: SelectChangeEvent<string>) => {
    updateFilter('category', e.target.value || undefined);
  }, [updateFilter]);

  const handleClassChange = useCallback((e: SelectChangeEvent<string>) => {
    setClassFilter(e.target.value);
  }, []);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    clearSearch();
    setClassFilter('');
  }, [clearFilters, clearSearch]);

  const activeFiltersCount = useMemo(() => {
    const filterCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;
    return filterCount + (classFilter ? 1 : 0);
  }, [filters, classFilter]);

  if (!isMonitor) {
    return (
      <Box>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Voce nao tem permissao para acessar esta pagina.
        </Alert>
      </Box>
    );
  }

  const FilterContent = (
    <>
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Status</InputLabel>
        <Select value={(filters.status as string) || ''} onChange={handleStatusChange} label="Status">
          {statusOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Categoria</InputLabel>
        <Select value={(filters.category as string) || ''} onChange={handleCategoryChange} label="Categoria">
          {categoryOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
        <InputLabel>Turma</InputLabel>
        <Select value={classFilter} onChange={handleClassChange} label="Turma">
          <MenuItem value="">Todas as Turmas</MenuItem>
          {classes.map((cls) => (
            <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#111',
          color: '#fff',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Users size={24} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Alunos
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {stats.total} alunos ({stats.byStatus.active} ativos)
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}
        >
          <ToggleButton value="grid" sx={{ color: '#fff' }}><Grid size={16} /></ToggleButton>
          <ToggleButton value="list" sx={{ color: '#fff' }}><List size={16} /></ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <DebouncedSearchInput onSearch={handleSearch} isSearching={isSearching} placeholder="Buscar aluno..." />
        <IconButton
          onClick={() => setMobileFiltersOpen(true)}
          sx={{
            bgcolor: activeFiltersCount > 0 ? 'primary.main' : 'action.hover',
            color: activeFiltersCount > 0 ? 'white' : 'text.primary',
            borderRadius: 2,
          }}
        >
          <Filter size={18} />
        </IconButton>
      </Box>

      {/* Desktop Filters */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, mb: 2 }}>
        {FilterContent}
        {activeFiltersCount > 0 && (
          <Chip label={`Limpar (${activeFiltersCount})`} onClick={handleClearFilters} onDelete={handleClearFilters} size="small" color="primary" variant="outlined" />
        )}
      </Box>

      {/* Mobile Filters BottomSheet */}
      <BottomSheet open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Filtros" height="auto">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FilterContent}
          {activeFiltersCount > 0 && (
            <Button variant="outlined" onClick={() => { handleClearFilters(); setMobileFiltersOpen(false); }} fullWidth>
              Limpar filtros ({activeFiltersCount})
            </Button>
          )}
          <Button variant="contained" onClick={() => setMobileFiltersOpen(false)} fullWidth>
            Aplicar Filtros
          </Button>
        </Box>
      </BottomSheet>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(140px, 1fr))' : '1fr', gap: 1 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={viewMode === 'grid' ? 100 : 60} sx={{ borderRadius: 2 }} />)}
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && filteredStudents.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Users size={36} style={{ color: '#9ca3af', marginBottom: 16 }} />
          <Typography variant="h6">Nenhum aluno encontrado</Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || activeFiltersCount > 0 ? 'Tente ajustar os filtros' : 'Clique no + para cadastrar'}
          </Typography>
        </Paper>
      )}

      {/* Student List */}
      {!isLoading && filteredStudents.length > 0 && (
        <FadeInView direction="up" delay={100}>
          <Box sx={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(140px, 1fr))' : '1fr', gap: 1 }}>
            {filteredStudents.map((student) => (
              <ScaleOnPress key={student.id}>
                <StudentCard student={student} onClick={handleStudentClick} compact={viewMode === 'list'} />
              </ScaleOnPress>
            ))}
          </Box>
          {hasNextPage && !searchTerm && (
            <Box ref={loadMoreRef} sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              {isFetchingNextPage ? <CircularProgress size={24} /> : <Typography variant="body2" color="text.secondary">Role para carregar mais</Typography>}
            </Box>
          )}
        </FadeInView>
      )}

      {/* FAB for new student */}
      <Fab
        color="primary"
        onClick={() => router.push('/portal/alunos/novo')}
        sx={{ position: 'fixed', bottom: { xs: 80, md: 24 }, right: 24 }}
      >
        <Plus size={24} />
      </Fab>
    </Box>
  );
}
