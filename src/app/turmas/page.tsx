'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Alert,
  Avatar,
  InputAdornment,
  CircularProgress,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  User,
  Baby,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { useClasses, useStudents } from '@/hooks';
import { useConfirmDialog } from '@/components/providers';
import { Class, Student, StudentCategory, BeltColor } from '@/types';
import { getBeltChipColor } from '@/lib/theme';

// ============================================
// Constants
// ============================================
const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', full: 'Domingo' },
  { value: 1, label: 'Seg', full: 'Segunda' },
  { value: 2, label: 'Ter', full: 'Terca' },
  { value: 3, label: 'Qua', full: 'Quarta' },
  { value: 4, label: 'Qui', full: 'Quinta' },
  { value: 5, label: 'Sex', full: 'Sexta' },
  { value: 6, label: 'Sab', full: 'Sabado' },
];

const CATEGORIES = [
  { value: 'adult', label: 'Adulto', icon: User },
  { value: 'kids', label: 'Kids', icon: Baby },
];

// ============================================
// Student Mini Card (for class lists)
// ============================================
interface StudentMiniCardProps {
  student: Student;
  isInClass: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function StudentMiniCard({ student, isInClass, onToggle, disabled }: StudentMiniCardProps) {
  const beltColor = getBeltChipColor(student.currentBelt);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '2px solid',
        borderColor: isInClass ? 'success.main' : 'transparent',
        bgcolor: isInClass ? 'success.50' : 'background.paper',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <CardActionArea
        onClick={onToggle}
        disabled={disabled}
        sx={{ p: 1.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={student.photoUrl}
              sx={{
                width: 40,
                height: 40,
                bgcolor: beltColor.bg,
                color: beltColor.text,
                fontSize: '0.875rem',
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>
            {isInClass && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                }}
              >
                <CheckCircle size={10} color="white" />
              </Box>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>
            <BeltDisplay
              belt={student.currentBelt}
              stripes={student.currentStripes}
              size="small"
            />
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

// ============================================
// Class Card with Students
// ============================================
interface ClassCardProps {
  classData: Class;
  students: Student[];
  onEdit: (c: Class) => void;
  onDelete: (c: Class) => void;
  onManageStudents: (c: Class) => void;
  isDeleting: boolean;
}

function ClassCard({ classData, students, onEdit, onDelete, onManageStudents, isDeleting }: ClassCardProps) {
  const [expanded, setExpanded] = useState(false);

  const enrolledStudents = useMemo(() => {
    return students.filter((s) => classData.studentIds?.includes(s.id));
  }, [students, classData.studentIds]);

  const formatSchedule = () => {
    if (!classData.schedule || classData.schedule.length === 0) return 'Sem horario';
    return classData.schedule
      .map((s) => `${DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.label} ${s.startTime}`)
      .join(' | ');
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" fontWeight={700}>
                {classData.name}
              </Typography>
              <Chip
                icon={classData.category === 'kids' ? <Baby size={12} /> : <User size={12} />}
                label={classData.category === 'kids' ? 'Kids' : 'Adulto'}
                size="small"
                color={classData.category === 'kids' ? 'secondary' : 'primary'}
                variant="outlined"
                sx={{ height: 22 }}
              />
            </Box>
            {classData.description && (
              <Typography variant="body2" color="text.secondary">
                {classData.description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => onEdit(classData)} disabled={isDeleting}>
              <Edit2 size={16} />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDelete(classData)} disabled={isDeleting}>
              <Trash2 size={16} />
            </IconButton>
          </Box>
        </Box>

        {/* Students Count & Quick Add */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={18} />
            <Typography variant="body2" fontWeight={600}>
              {enrolledStudents.length} alunos
            </Typography>
            {classData.maxStudents && (
              <Typography variant="body2" color="text.secondary">
                / {classData.maxStudents}
              </Typography>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UserPlus size={16} />}
            onClick={() => onManageStudents(classData)}
          >
            Gerenciar
          </Button>
        </Box>

        {/* Enrolled Students Preview */}
        {enrolledStudents.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {enrolledStudents.slice(0, 6).map((student) => {
              const beltColor = getBeltChipColor(student.currentBelt);
              return (
                <Avatar
                  key={student.id}
                  src={student.photoUrl}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: beltColor.bg,
                    color: beltColor.text,
                    fontSize: '0.7rem',
                    border: '2px solid white',
                  }}
                >
                  {student.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </Avatar>
              );
            })}
            {enrolledStudents.length > 6 && (
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'action.hover',
                  fontSize: '0.7rem',
                  border: '2px solid white',
                }}
              >
                +{enrolledStudents.length - 6}
              </Avatar>
            )}
          </Box>
        )}

        {/* Schedule (Collapsible) */}
        <Box>
          <Button
            size="small"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            sx={{ color: 'text.secondary', px: 0 }}
          >
            <Clock size={14} style={{ marginRight: 4 }} />
            {formatSchedule()}
          </Button>
          <Collapse in={expanded}>
            <Box sx={{ mt: 1, pl: 2 }}>
              {classData.schedule.map((s, idx) => (
                <Typography key={idx} variant="body2" color="text.secondary">
                  {DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.full}: {s.startTime} - {s.endTime}
                </Typography>
              ))}
            </Box>
          </Collapse>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================
// Manage Students Dialog
// ============================================
interface ManageStudentsDialogProps {
  open: boolean;
  classData: Class | null;
  students: Student[];
  onClose: () => void;
  onToggleStudent: (classId: string, studentId: string) => Promise<void>;
  isToggling: boolean;
}

function ManageStudentsDialog({
  open,
  classData,
  students,
  onClose,
  onToggleStudent,
  isToggling,
}: ManageStudentsDialogProps) {
  const [search, setSearch] = useState('');

  const filteredStudents = useMemo(() => {
    if (!classData) return [];

    // Filter by category and search
    // Allow kids students to be added to adult classes (teacher discretion)
    let filtered = students.filter((s) => {
      if (s.status !== 'active') return false;
      if (classData.category === 'adult') return true; // Adult classes accept both kids and adult students
      return s.category === classData.category; // Kids classes only accept kids students
    });

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.nickname?.toLowerCase().includes(term)
      );
    }

    // Sort: enrolled first, then by name
    return filtered.sort((a, b) => {
      const aInClass = classData.studentIds?.includes(a.id) ? 0 : 1;
      const bInClass = classData.studentIds?.includes(b.id) ? 0 : 1;
      if (aInClass !== bInClass) return aInClass - bInClass;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [students, classData, search]);

  const enrolledCount = useMemo(() => {
    if (!classData) return 0;
    return students.filter((s) => classData.studentIds?.includes(s.id)).length;
  }, [students, classData]);

  if (!classData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {classData.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {enrolledCount} alunos na turma
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar aluno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
        />

        {/* Students Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 1.5,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {filteredStudents.map((student) => (
            <StudentMiniCard
              key={student.id}
              student={student}
              isInClass={classData.studentIds?.includes(student.id) || false}
              onToggle={() => onToggleStudent(classData.id, student.id)}
              disabled={isToggling}
            />
          ))}
        </Box>

        {filteredStudents.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Users size={32} color="#9CA3AF" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Nenhum aluno encontrado
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          Concluido
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Create/Edit Class Dialog
// ============================================
interface ClassFormData {
  name: string;
  description: string;
  instructorName: string;
  category: StudentCategory;
  maxStudents: number;
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[];
}

const initialFormData: ClassFormData = {
  name: '',
  description: '',
  instructorName: '',
  category: 'adult',
  maxStudents: 20,
  schedule: [{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }],
};

// ============================================
// Main Component
// ============================================
export default function TurmasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [managingClass, setManagingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(initialFormData);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    classes,
    isLoading,
    isCreating,
    isUpdating,
    isTogglingStudent,
    createClass,
    updateClass,
    deleteClass,
    toggleStudent,
    error,
  } = useClasses();

  const { students } = useStudents();
  const { confirm } = useConfirmDialog();

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof ClassFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle schedule changes
  const handleScheduleChange = useCallback(
    (index: number, field: string, value: string | number) => {
      setFormData((prev) => {
        const newSchedule = [...prev.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        return { ...prev, schedule: newSchedule };
      });
    },
    []
  );

  const addScheduleEntry = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }],
    }));
  }, []);

  const removeScheduleEntry = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index),
    }));
  }, []);

  // Open dialog for new class
  const handleNewClass = useCallback(() => {
    setEditingClass(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  }, []);

  // Open dialog for editing
  const handleEditClass = useCallback((cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || '',
      instructorName: cls.instructorName || '',
      category: cls.category,
      maxStudents: cls.maxStudents || 20,
      schedule: cls.schedule,
    });
    setDialogOpen(true);
  }, []);

  // Handle delete
  const handleDeleteClass = useCallback(
    async (cls: Class) => {
      const confirmed = await confirm({
        title: 'Excluir Turma',
        message: `Tem certeza que deseja excluir a turma "${cls.name}"?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        severity: 'error',
      });

      if (confirmed) {
        setDeletingId(cls.id);
        try {
          await deleteClass(cls.id);
        } finally {
          setDeletingId(null);
        }
      }
    },
    [confirm, deleteClass]
  );

  // Handle manage students
  const handleManageStudents = useCallback((cls: Class) => {
    setManagingClass(cls);
    setManageDialogOpen(true);
  }, []);

  // Handle toggle student
  const handleToggleStudent = useCallback(
    async (classId: string, studentId: string) => {
      // Optimistically update the UI
      setManagingClass((prev) => {
        if (!prev || prev.id !== classId) return prev;
        const currentIds = prev.studentIds || [];
        const isInClass = currentIds.includes(studentId);
        return {
          ...prev,
          studentIds: isInClass
            ? currentIds.filter((id) => id !== studentId)
            : [...currentIds, studentId],
        };
      });
      // Then sync with backend
      await toggleStudent({ classId, studentId });
    },
    [toggleStudent]
  );

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingClass) {
        await updateClass({
          id: editingClass.id,
          data: formData,
        });
      } else {
        await createClass({
          ...formData,
          instructorId: 'admin',
          studentIds: [],
          isActive: true,
        });
      }
      setDialogOpen(false);
    } catch {
      // Error handled by hook
    }
  }, [formData, editingClass, createClass, updateClass]);

  const handleCloseDialog = useCallback(() => {
    if (!isCreating && !isUpdating) {
      setDialogOpen(false);
    }
  }, [isCreating, isUpdating]);

  const isSaving = isCreating || isUpdating;

  return (
    <ProtectedRoute>
      <AppLayout title="Turmas">
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Turmas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Organize os alunos em turmas
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleNewClass}>
              Nova Turma
            </Button>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} icon={<AlertCircle size={20} />}>
              Erro ao carregar turmas. Tente novamente.
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Grid container spacing={3}>
              {[1, 2, 3].map((i) => (
                <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Empty State */}
          {!isLoading && classes.length === 0 && (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <Users size={48} color="#9CA3AF" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                Nenhuma turma cadastrada
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Crie sua primeira turma para organizar os alunos
              </Typography>
              <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleNewClass}>
                Criar Turma
              </Button>
            </Paper>
          )}

          {/* Classes Grid */}
          {!isLoading && classes.length > 0 && (
            <Grid container spacing={3}>
              {classes.map((cls) => (
                <Grid key={cls.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <ClassCard
                    classData={cls}
                    students={students}
                    onEdit={handleEditClass}
                    onDelete={handleDeleteClass}
                    onManageStudents={handleManageStudents}
                    isDeleting={deletingId === cls.id}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Manage Students Dialog */}
          <ManageStudentsDialog
            open={manageDialogOpen}
            classData={managingClass}
            students={students}
            onClose={() => setManageDialogOpen(false)}
            onToggleStudent={handleToggleStudent}
            isToggling={isTogglingStudent}
          />

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {editingClass ? <Edit2 size={20} /> : <Plus size={20} />}
                {editingClass ? 'Editar Turma' : 'Nova Turma'}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Nome da Turma"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    disabled={isSaving}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={isSaving}>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={formData.category}
                      label="Categoria"
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                    >
                      {CATEGORIES.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <cat.icon size={16} />
                            {cat.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max. Alunos"
                    value={formData.maxStudents}
                    onChange={(e) => handleFieldChange('maxStudents', Number(e.target.value))}
                    inputProps={{ min: 1, max: 100 }}
                    disabled={isSaving}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Descricao (opcional)"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    disabled={isSaving}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Instrutor"
                    value={formData.instructorName}
                    onChange={(e) => handleFieldChange('instructorName', e.target.value)}
                    disabled={isSaving}
                  />
                </Grid>

                <Grid size={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    Horarios
                  </Typography>
                  {formData.schedule.map((entry, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                          value={entry.dayOfWeek}
                          onChange={(e) => handleScheduleChange(index, 'dayOfWeek', Number(e.target.value))}
                          disabled={isSaving}
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <MenuItem key={day.value} value={day.value}>
                              {day.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                        disabled={isSaving}
                        sx={{ width: 100 }}
                      />
                      <Typography>-</Typography>
                      <TextField
                        size="small"
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                        disabled={isSaving}
                        sx={{ width: 100 }}
                      />
                      {formData.schedule.length > 1 && (
                        <IconButton size="small" onClick={() => removeScheduleEntry(index)} disabled={isSaving}>
                          <X size={16} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button size="small" startIcon={<Plus size={14} />} onClick={addScheduleEntry} disabled={isSaving}>
                    Adicionar Horario
                  </Button>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={handleCloseDialog} disabled={isSaving}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.name.trim() || isSaving}
                startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
              >
                {isSaving ? 'Salvando...' : editingClass ? 'Salvar' : 'Criar'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
