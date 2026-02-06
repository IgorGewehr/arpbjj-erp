'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Avatar,
  Card,
  CardActionArea,
  Chip,
  useTheme,
  useMediaQuery,
  SelectChangeEvent,
  Grid,
} from '@mui/material';
import { Search, Users } from 'lucide-react';
import { Student, Plan } from '@/types';
import { getBeltChipColor } from '@/lib/theme';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { getStudentValue } from '@/services/planService';
import { StudentPlansModal } from './StudentPlansModal';

// ============================================
// Interfaces
// ============================================
interface PayingStudentsDialogProps {
  open: boolean;
  onClose: () => void;
  students: Student[];
  plans: Plan[];
}

type SortOption = 'name' | 'belt' | 'planCount';

// ============================================
// PayingStudentsDialog Component
// ============================================
export function PayingStudentsDialog({
  open,
  onClose,
  students,
  plans,
}: PayingStudentsDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ============================================
  // Get Paying Students
  // ============================================
  const payingStudents = useMemo(() => {
    const studentIdsWithPlans = new Set<string>();
    for (const plan of plans) {
      for (const studentId of plan.studentIds) {
        studentIdsWithPlans.add(studentId);
      }
    }
    return students.filter((s) => studentIdsWithPlans.has(s.id));
  }, [students, plans]);

  // ============================================
  // Get Belt Order Value (for sorting)
  // ============================================
  const getBeltOrderValue = (belt: string): number => {
    const beltOrder: Record<string, number> = {
      white: 0,
      'grey-white': 1,
      grey: 2,
      'grey-black': 3,
      'yellow-white': 4,
      yellow: 5,
      'yellow-black': 6,
      'orange-white': 7,
      orange: 8,
      'orange-black': 9,
      'green-white': 10,
      green: 11,
      'green-black': 12,
      blue: 13,
      purple: 14,
      brown: 15,
      black: 16,
    };
    return beltOrder[belt] ?? 0;
  };

  // ============================================
  // Get Plans for Student
  // ============================================
  const getPlansForStudent = (studentId: string): Plan[] => {
    return plans.filter((p) => p.studentIds.includes(studentId));
  };

  // ============================================
  // Calculate Total Monthly Value for Student
  // ============================================
  const getTotalMonthlyValue = (studentId: string): number => {
    const studentPlans = getPlansForStudent(studentId);
    return studentPlans.reduce((sum, plan) => sum + getStudentValue(plan, studentId), 0);
  };

  // ============================================
  // Filter and Sort Students
  // ============================================
  const filteredStudents = useMemo(() => {
    let result = payingStudents;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.nickname?.toLowerCase().includes(term)
      );
    }

    // Plan filter
    if (planFilter) {
      const selectedPlan = plans.find((p) => p.id === planFilter);
      if (selectedPlan) {
        result = result.filter((s) => selectedPlan.studentIds.includes(s.id));
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'belt':
          const aOrder = getBeltOrderValue(a.currentBelt) * 10 + a.currentStripes;
          const bOrder = getBeltOrderValue(b.currentBelt) * 10 + b.currentStripes;
          return bOrder - aOrder; // Descending (higher belts first)
        case 'planCount':
          const aCount = getPlansForStudent(a.id).length;
          const bCount = getPlansForStudent(b.id).length;
          return bCount - aCount; // Descending
        default:
          return 0;
      }
    });

    return result;
  }, [payingStudents, searchTerm, planFilter, sortBy, plans]);

  // ============================================
  // Get Initials
  // ============================================
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // ============================================
  // Handle Sort Change
  // ============================================
  const handleSortChange = (e: SelectChangeEvent<string>) => {
    setSortBy(e.target.value as SortOption);
  };

  const handlePlanFilterChange = (e: SelectChangeEvent<string>) => {
    setPlanFilter(e.target.value);
  };

  // ============================================
  // Get Plans Count Summary
  // ============================================
  const activePlansCount = plans.filter((p) => p.isActive).length;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Alunos Pagantes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredStudents.length} alunos em {activePlansCount}{' '}
                {activePlansCount === 1 ? 'plano' : 'planos'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Search and Filters */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 140, flex: { xs: 1, sm: 'none' } }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select value={sortBy} onChange={handleSortChange} label="Ordenar por">
                  <MenuItem value="name">Alfabética</MenuItem>
                  <MenuItem value="belt">Graduação</MenuItem>
                  <MenuItem value="planCount">Qtd. Planos</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140, flex: { xs: 1, sm: 'none' } }}>
                <InputLabel>Plano</InputLabel>
                <Select value={planFilter} onChange={handlePlanFilterChange} label="Plano">
                  <MenuItem value="">Todos os Planos</MenuItem>
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Students Grid */}
          {filteredStudents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">
                {searchTerm || planFilter
                  ? 'Nenhum aluno encontrado com os filtros aplicados'
                  : 'Nenhum aluno pagante cadastrado'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={1.5}>
              {filteredStudents.map((student) => {
                const beltColor = getBeltChipColor(student.currentBelt);
                const studentPlans = getPlansForStudent(student.id);
                const totalMonthly = getTotalMonthlyValue(student.id);
                const hasCustomValue = studentPlans.some(
                  (plan) => plan.customValues?.[student.id] !== undefined
                );

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={student.id}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                        },
                      }}
                    >
                      <CardActionArea
                        onClick={() => setSelectedStudent(student)}
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Avatar
                            src={student.photoUrl}
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: beltColor.bg,
                              color: beltColor.text,
                              fontSize: '0.875rem',
                            }}
                          >
                            {getInitials(student.fullName)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                mb: 0.5,
                              }}
                            >
                              {student.nickname || student.fullName.split(' ')[0]}
                            </Typography>
                            <BeltDisplay
                              belt={student.currentBelt}
                              stripes={student.currentStripes}
                              size="small"
                            />
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={`${studentPlans.length} ${
                                  studentPlans.length === 1 ? 'plano' : 'planos'
                                }`}
                                size="small"
                                sx={{ height: 20, fontSize: '0.65rem' }}
                              />
                              {hasCustomValue && (
                                <Chip
                                  label="Personalizado"
                                  size="small"
                                  color="success"
                                  sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              color="primary.main"
                              sx={{ mt: 1 }}
                            >
                              R$ {totalMonthly.toLocaleString('pt-BR')}/mês
                            </Typography>
                          </Box>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Student Plans Modal */}
      <StudentPlansModal
        open={!!selectedStudent}
        student={selectedStudent}
        plans={selectedStudent ? getPlansForStudent(selectedStudent.id) : []}
        onClose={() => setSelectedStudent(null)}
      />
    </>
  );
}

export default PayingStudentsDialog;
