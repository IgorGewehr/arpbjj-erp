'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Skeleton,
  Divider,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowLeft,
  Save,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Edit,
  Plus,
  Medal,
  UserPlus,
  X,
  Check,
  Bus,
  Car,
  HelpCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useFeedback, useConfirmDialog } from '@/components/providers';
import { useAuth } from '@/components/providers/AuthProvider';
import { competitionService } from '@/services/competitionService';
import { competitionEnrollmentService } from '@/services/competitionEnrollmentService';
import { studentService } from '@/services/studentService';
import { achievementService } from '@/services/achievementService';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import {
  Competition,
  CompetitionEnrollment,
  CompetitionResult,
  CompetitionStatus,
  CompetitionPosition,
  CompetitionTransportStatus,
  StudentTransportPreference,
  Student,
  AgeCategory,
  WEIGHT_CATEGORIES_CBJJ,
  AGE_CATEGORY_LABELS,
  TRANSPORT_STATUS_LABELS,
  TRANSPORT_PREFERENCE_LABELS,
} from '@/types';

// ============================================
// Position Colors
// ============================================
const positionConfig: Record<CompetitionPosition, { label: string; color: string; bgColor: string }> = {
  gold: { label: 'Ouro', color: '#B8860B', bgColor: '#FEF3C7' },
  silver: { label: 'Prata', color: '#6B7280', bgColor: '#F3F4F6' },
  bronze: { label: 'Bronze', color: '#92400E', bgColor: '#FED7AA' },
  participant: { label: 'Participante', color: '#3B82F6', bgColor: '#DBEAFE' },
};

const statusConfig: Record<CompetitionStatus, { label: string; color: 'warning' | 'info' | 'success' }> = {
  upcoming: { label: 'Próxima', color: 'warning' },
  ongoing: { label: 'Em Andamento', color: 'info' },
  completed: { label: 'Concluída', color: 'success' },
};

const transportPreferenceIcons: Record<StudentTransportPreference, React.ReactNode> = {
  need_transport: <Bus size={16} />,
  own_transport: <Car size={16} />,
  undecided: <HelpCircle size={16} />,
};

// ============================================
// Enroll Student Dialog (with categories and transport)
// ============================================
interface EnrollStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onEnroll: (data: {
    studentId: string;
    studentName: string;
    ageCategory: AgeCategory;
    weightCategory: string;
    transportPreference: StudentTransportPreference;
  }) => void;
  enrolledIds: string[];
  students: Student[];
  competition: Competition;
}

function EnrollStudentDialog({ open, onClose, onEnroll, enrolledIds, students, competition }: EnrollStudentDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [ageCategory, setAgeCategory] = useState<AgeCategory>('adult');
  const [weightCategory, setWeightCategory] = useState('');
  const [transportPreference, setTransportPreference] = useState<StudentTransportPreference>('undecided');

  const availableStudents = students.filter((s) => !enrolledIds.includes(s.id));
  const selectedStudent = students.find((s) => s.id === studentId);

  // Combine CBJJ categories with custom categories from competition
  const allWeightCategories = [
    ...WEIGHT_CATEGORIES_CBJJ,
    ...(competition.customWeightCategories || []),
  ];

  const handleSubmit = () => {
    if (!studentId || !selectedStudent || !weightCategory) return;

    onEnroll({
      studentId,
      studentName: selectedStudent.fullName,
      ageCategory,
      weightCategory,
      transportPreference,
    });

    // Reset form
    setStudentId('');
    setAgeCategory('adult');
    setWeightCategory('');
    setTransportPreference('undecided');
    onClose();
  };

  const handleClose = () => {
    setStudentId('');
    setAgeCategory('adult');
    setWeightCategory('');
    setTransportPreference('undecided');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Inscrever Aluno</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {/* Student Selection */}
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={availableStudents}
              getOptionLabel={(opt) => opt.nickname || opt.fullName}
              value={availableStudents.find((s) => s.id === studentId) || null}
              onChange={(_, value) => {
                setStudentId(value?.id || '');
                // Auto-set age category based on student category
                if (value?.category === 'kids') {
                  setAgeCategory('kids');
                }
              }}
              renderOption={(props, option) => {
                const { key, ...rest } = props as { key: string } & React.HTMLAttributes<HTMLLIElement>;
                return (
                  <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar src={option.photoUrl} sx={{ width: 32, height: 32 }}>
                      {option.fullName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.nickname || option.fullName}</Typography>
                      <BeltDisplay belt={option.currentBelt} stripes={option.currentStripes} size="small" />
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="Aluno" required />
              )}
              noOptionsText="Todos os alunos já estão inscritos"
            />
          </Grid>

          {/* Age Category */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Categoria Idade</InputLabel>
              <Select
                value={ageCategory}
                onChange={(e) => setAgeCategory(e.target.value as AgeCategory)}
                label="Categoria Idade"
              >
                {Object.entries(AGE_CATEGORY_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Weight Category */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              freeSolo
              options={allWeightCategories}
              value={weightCategory}
              onChange={(_, value) => setWeightCategory(value || '')}
              onInputChange={(_, value) => setWeightCategory(value)}
              renderInput={(params) => (
                <TextField {...params} label="Categoria Peso" required />
              )}
            />
          </Grid>

          {/* Transport Preference */}
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <InputLabel>Transporte</InputLabel>
              <Select
                value={transportPreference}
                onChange={(e) => setTransportPreference(e.target.value as StudentTransportPreference)}
                label="Transporte"
              >
                {Object.entries(TRANSPORT_PREFERENCE_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {transportPreferenceIcons[key as StudentTransportPreference]}
                      {label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Transport Info from Competition */}
          {competition.transportStatus && competition.transportStatus !== 'no_transport' && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2, color: 'info.dark' }}>
                <Typography variant="body2" fontWeight={600}>
                  <Bus size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Transporte: {TRANSPORT_STATUS_LABELS[competition.transportStatus]}
                </Typography>
                {competition.transportNotes && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {competition.transportNotes}
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!studentId || !weightCategory}
        >
          Inscrever
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Add Result Dialog
// ============================================
interface AddResultDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<CompetitionResult, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  competition: Competition;
  students: Student[];
  enrollments: CompetitionEnrollment[];
  existingResult?: CompetitionResult;
}

function AddResultDialog({ open, onClose, onSave, competition, students, enrollments, existingResult }: AddResultDialogProps) {
  const [studentId, setStudentId] = useState(existingResult?.studentId || '');
  const [position, setPosition] = useState<CompetitionPosition>(existingResult?.position || 'participant');
  const [ageCategory, setAgeCategory] = useState<AgeCategory>(existingResult?.ageCategory || 'adult');
  const [weightCategory, setWeightCategory] = useState(existingResult?.weightCategory || '');
  const [notes, setNotes] = useState(existingResult?.notes || '');

  useEffect(() => {
    if (existingResult) {
      setStudentId(existingResult.studentId);
      setPosition(existingResult.position);
      setAgeCategory(existingResult.ageCategory);
      setWeightCategory(existingResult.weightCategory);
      setNotes(existingResult.notes || '');
    } else {
      setStudentId('');
      setPosition('participant');
      setAgeCategory('adult');
      setWeightCategory('');
      setNotes('');
    }
  }, [existingResult, open]);

  // Get enrolled students from enrollments
  const enrolledIds = enrollments.map((e) => e.studentId);
  const enrolledStudents = students.filter((s) => enrolledIds.includes(s.id));
  const selectedStudent = students.find((s) => s.id === studentId);

  // Auto-fill category from enrollment when student is selected
  const handleStudentChange = (newStudentId: string) => {
    setStudentId(newStudentId);
    const enrollment = enrollments.find((e) => e.studentId === newStudentId);
    if (enrollment && !existingResult) {
      setAgeCategory(enrollment.ageCategory);
      setWeightCategory(enrollment.weightCategory);
    }
  };

  const handleSubmit = () => {
    if (!studentId || !selectedStudent) return;

    onSave({
      competitionId: competition.id,
      competitionName: competition.name,
      studentId,
      studentName: selectedStudent.fullName,
      position,
      beltCategory: selectedStudent.currentBelt,
      ageCategory,
      weightCategory,
      notes: notes || undefined,
      date: competition.date,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingResult ? 'Editar Resultado' : 'Registrar Resultado'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={enrolledStudents}
              getOptionLabel={(opt) => opt.nickname || opt.fullName}
              value={enrolledStudents.find((s) => s.id === studentId) || null}
              onChange={(_, value) => handleStudentChange(value?.id || '')}
              disabled={!!existingResult}
              renderOption={(props, option) => {
                const { key, ...rest } = props as { key: string } & React.HTMLAttributes<HTMLLIElement>;
                return (
                  <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar src={option.photoUrl} sx={{ width: 32, height: 32 }}>
                      {option.fullName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.nickname || option.fullName}</Typography>
                      <BeltDisplay belt={option.currentBelt} stripes={option.currentStripes} size="small" />
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="Aluno" required />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Resultado</InputLabel>
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value as CompetitionPosition)}
                label="Resultado"
              >
                <MenuItem value="gold">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Medal size={18} color={positionConfig.gold.color} />
                    Ouro
                  </Box>
                </MenuItem>
                <MenuItem value="silver">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Medal size={18} color={positionConfig.silver.color} />
                    Prata
                  </Box>
                </MenuItem>
                <MenuItem value="bronze">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Medal size={18} color={positionConfig.bronze.color} />
                    Bronze
                  </Box>
                </MenuItem>
                <MenuItem value="participant">Participante</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Categoria Idade</InputLabel>
              <Select
                value={ageCategory}
                onChange={(e) => setAgeCategory(e.target.value as AgeCategory)}
                label="Categoria Idade"
              >
                {Object.entries(AGE_CATEGORY_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              freeSolo
              options={[...WEIGHT_CATEGORIES_CBJJ]}
              value={weightCategory}
              onChange={(_, value) => setWeightCategory(value || '')}
              onInputChange={(_, value) => setWeightCategory(value)}
              renderInput={(params) => (
                <TextField {...params} label="Categoria Peso" required />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Observações"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!studentId || !weightCategory}
        >
          {existingResult ? 'Salvar' : 'Registrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function CompetitionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const { confirm } = useConfirmDialog();

  const competitionId = params.id as string;
  const isEditMode = searchParams.get('edit') === 'true';

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [enrollments, setEnrollments] = useState<CompetitionEnrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Edit form state
  const [editData, setEditData] = useState<Partial<Competition>>({});

  // Dialogs
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<CompetitionResult | undefined>();

  // ============================================
  // Load Data
  // ============================================
  useEffect(() => {
    loadData();
  }, [competitionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [compData, resultsData, enrollmentsData, studentsData] = await Promise.all([
        competitionService.getById(competitionId),
        competitionService.getResultsForCompetition(competitionId),
        competitionEnrollmentService.getByCompetition(competitionId),
        studentService.getActive(),
      ]);

      if (!compData) {
        showError('Competição não encontrada');
        router.push('/competicoes');
        return;
      }

      setCompetition(compData);
      setResults(resultsData);
      setEnrollments(enrollmentsData);
      setStudents(studentsData);
      setEditData(compData);
    } catch (err) {
      showError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Handlers
  // ============================================
  const handleSave = async () => {
    if (!competition) return;

    try {
      setSaving(true);
      await competitionService.update(competition.id, editData);
      success('Competição atualizada com sucesso!');
      router.push(`/competicoes/${competition.id}`);
      loadData();
    } catch (err) {
      showError('Erro ao atualizar competição');
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollStudent = async (data: {
    studentId: string;
    studentName: string;
    ageCategory: AgeCategory;
    weightCategory: string;
    transportPreference: StudentTransportPreference;
  }) => {
    if (!competition || !user) return;

    try {
      await competitionEnrollmentService.enroll({
        competitionId: competition.id,
        competitionName: competition.name,
        studentId: data.studentId,
        studentName: data.studentName,
        ageCategory: data.ageCategory,
        weightCategory: data.weightCategory,
        transportPreference: data.transportPreference,
      }, user.id);

      // Also update the legacy enrolledStudentIds for backwards compatibility
      await competitionService.enrollStudent(competition.id, data.studentId);

      success('Aluno inscrito com sucesso!');
      loadData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao inscrever aluno';
      showError(errorMessage);
    }
  };

  const handleRemoveStudent = async (enrollmentId: string, studentId: string) => {
    if (!competition) return;

    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    const confirmed = await confirm({
      title: 'Remover Inscrição',
      message: `Deseja remover ${enrollment?.studentName} da competição?`,
      confirmText: 'Remover',
      severity: 'warning',
    });

    if (confirmed) {
      try {
        await competitionEnrollmentService.delete(enrollmentId);
        // Also remove from legacy array
        await competitionService.unenrollStudent(competition.id, studentId);
        success('Inscrição removida');
        loadData();
      } catch (err) {
        showError('Erro ao remover inscrição');
      }
    }
  };

  const handleSaveResult = async (data: Omit<CompetitionResult, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    if (!user) return;

    try {
      if (editingResult) {
        await competitionService.updateResult(editingResult.id, data);
        success('Resultado atualizado!');
      } else {
        await competitionService.addResult(data, user.id);
        // Create achievement
        await achievementService.createCompetitionAchievement(
          data.studentId,
          data.studentName,
          data.competitionId,
          data.competitionName,
          data.position,
          data.date,
          user.id
        );
        success('Resultado registrado!');
      }
      setEditingResult(undefined);
      loadData();
    } catch (err) {
      showError('Erro ao salvar resultado');
    }
  };

  const handleDeleteResult = async (result: CompetitionResult) => {
    const confirmed = await confirm({
      title: 'Excluir Resultado',
      message: `Deseja excluir o resultado de ${result.studentName}?`,
      confirmText: 'Excluir',
      severity: 'error',
    });

    if (confirmed) {
      try {
        await competitionService.deleteResult(result.id);
        success('Resultado excluído');
        loadData();
      } catch (err) {
        showError('Erro ao excluir resultado');
      }
    }
  };

  // ============================================
  // Render Loading
  // ============================================
  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout title="Carregando...">
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" height={400} />
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!competition) return null;

  // Get enrolled student IDs from the new enrollment system
  const enrolledIds = enrollments.map((e) => e.studentId);
  const transportStats = {
    needTransport: enrollments.filter((e) => e.transportPreference === 'need_transport').length,
    ownTransport: enrollments.filter((e) => e.transportPreference === 'own_transport').length,
    undecided: enrollments.filter((e) => e.transportPreference === 'undecided').length,
  };
  const status = statusConfig[competition.status];

  return (
    <ProtectedRoute>
      <AppLayout title={competition.name}>
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.push('/competicoes')}>
              <ArrowLeft />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" fontWeight={700}>
                  {isEditMode ? 'Editar Competição' : competition.name}
                </Typography>
                <Chip label={status.label} color={status.color} size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })} • {competition.location}
              </Typography>
            </Box>
            {!isEditMode && (
              <Button
                variant="outlined"
                startIcon={<Edit size={18} />}
                onClick={() => router.push(`/competicoes/${competition.id}?edit=true`)}
              >
                Editar
              </Button>
            )}
          </Box>

          {isEditMode ? (
            /* Edit Mode */
            <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 800 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Nome"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Data"
                    type="date"
                    value={editData.date ? format(new Date(editData.date), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value ? parseISO(e.target.value) : undefined })}
                    fullWidth
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editData.status || 'upcoming'}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as CompetitionStatus })}
                      label="Status"
                    >
                      <MenuItem value="upcoming">Próxima</MenuItem>
                      <MenuItem value="ongoing">Em Andamento</MenuItem>
                      <MenuItem value="completed">Concluída</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Local"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Descrição"
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    multiline
                    rows={3}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button onClick={() => router.push(`/competicoes/${competition.id}`)}>
                  Cancelar
                </Button>
                <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </Box>
            </Paper>
          ) : (
            /* View Mode */
            <>
              <Paper sx={{ mb: 3, borderRadius: 3 }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2 }}>
                  <Tab label={`Inscritos (${enrollments.length})`} icon={<Users size={18} />} iconPosition="start" />
                  <Tab label={`Transporte (${transportStats.needTransport})`} icon={<Bus size={18} />} iconPosition="start" />
                  <Tab label={`Resultados (${results.length})`} icon={<Medal size={18} />} iconPosition="start" />
                </Tabs>
              </Paper>

              {tabValue === 0 && (
                /* Enrolled Students Tab */
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Alunos Inscritos
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<UserPlus size={18} />}
                      onClick={() => setAddStudentOpen(true)}
                    >
                      Inscrever Aluno
                    </Button>
                  </Box>

                  {enrollments.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Users size={48} color="#ccc" />
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        Nenhum aluno inscrito ainda
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {enrollments.map((enrollment, index) => {
                        const student = students.find((s) => s.id === enrollment.studentId);
                        return (
                          <Box key={enrollment.id}>
                            {index > 0 && <Divider />}
                            <ListItem sx={{ py: 2 }}>
                              <ListItemAvatar>
                                <Avatar src={student?.photoUrl} sx={{ width: 48, height: 48 }}>
                                  {enrollment.studentName.charAt(0)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography fontWeight={600}>
                                    {student?.nickname || enrollment.studentName}
                                  </Typography>
                                }
                                secondary={
                                  <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {student && (
                                      <BeltDisplay belt={student.currentBelt} stripes={student.currentStripes} size="small" />
                                    )}
                                    <Chip
                                      size="small"
                                      label={AGE_CATEGORY_LABELS[enrollment.ageCategory]}
                                      variant="outlined"
                                    />
                                    <Chip
                                      size="small"
                                      label={enrollment.weightCategory}
                                      variant="outlined"
                                    />
                                    <Chip
                                      size="small"
                                      icon={transportPreferenceIcons[enrollment.transportPreference] as React.ReactElement}
                                      label={TRANSPORT_PREFERENCE_LABELS[enrollment.transportPreference]}
                                      variant="outlined"
                                      color={enrollment.transportPreference === 'need_transport' ? 'info' : 'default'}
                                    />
                                  </Box>
                                }
                              />
                              <ListItemSecondaryAction>
                                <IconButton
                                  edge="end"
                                  onClick={() => handleRemoveStudent(enrollment.id, enrollment.studentId)}
                                  color="error"
                                >
                                  <X size={18} />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          </Box>
                        );
                      })}
                    </List>
                  )}
                </Paper>
              )}

              {tabValue === 1 && (
                /* Transport Tab */
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Transporte
                    </Typography>
                    <Chip
                      label={competition.transportStatus ? TRANSPORT_STATUS_LABELS[competition.transportStatus] : 'Não definido'}
                      color={competition.transportStatus === 'confirmed' ? 'success' : competition.transportStatus === 'no_transport' ? 'error' : 'warning'}
                    />
                  </Box>

                  {/* Transport Stats */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={700} color="info.main">
                          {transportStats.needTransport}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Precisam de transporte
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={700} color="success.main">
                          {transportStats.ownTransport}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Transporte próprio
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={700} color="warning.main">
                          {transportStats.undecided}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Não decidiram
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Transport Capacity Info */}
                  {competition.transportCapacity && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                      <Typography variant="body2" color="info.dark">
                        <strong>Capacidade:</strong> {transportStats.needTransport} / {competition.transportCapacity} vagas ocupadas
                      </Typography>
                    </Box>
                  )}

                  {/* Transport Notes */}
                  {competition.transportNotes && (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Informações:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {competition.transportNotes}
                      </Typography>
                    </Box>
                  )}

                  {/* List of students who need transport */}
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Alunos que precisam de transporte
                  </Typography>
                  {transportStats.needTransport === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Bus size={48} color="#ccc" />
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        Nenhum aluno precisa de transporte
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {enrollments
                        .filter((e) => e.transportPreference === 'need_transport')
                        .map((enrollment, index) => {
                          const student = students.find((s) => s.id === enrollment.studentId);
                          return (
                            <Box key={enrollment.id}>
                              {index > 0 && <Divider />}
                              <ListItem sx={{ py: 1.5 }}>
                                <ListItemAvatar>
                                  <Avatar src={student?.photoUrl} sx={{ width: 40, height: 40 }}>
                                    {enrollment.studentName.charAt(0)}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={student?.nickname || enrollment.studentName}
                                  secondary={`${AGE_CATEGORY_LABELS[enrollment.ageCategory]} - ${enrollment.weightCategory}`}
                                />
                              </ListItem>
                            </Box>
                          );
                        })}
                    </List>
                  )}
                </Paper>
              )}

              {tabValue === 2 && (
                /* Results Tab */
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Resultados
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={18} />}
                      onClick={() => {
                        setEditingResult(undefined);
                        setResultDialogOpen(true);
                      }}
                      disabled={enrollments.length === 0}
                    >
                      Registrar Resultado
                    </Button>
                  </Box>

                  {results.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Medal size={48} color="#ccc" />
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        Nenhum resultado registrado ainda
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {results.map((result) => {
                        const pos = positionConfig[result.position];
                        return (
                          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={result.id}>
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                borderColor: pos.color,
                                borderWidth: 2,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                  <Avatar
                                    sx={{
                                      bgcolor: pos.bgColor,
                                      color: pos.color,
                                      width: 40,
                                      height: 40,
                                    }}
                                  >
                                    <Medal size={20} />
                                  </Avatar>
                                  <Box>
                                    <Typography fontWeight={600}>{result.studentName}</Typography>
                                    <Chip
                                      size="small"
                                      label={pos.label}
                                      sx={{
                                        bgcolor: pos.bgColor,
                                        color: pos.color,
                                        fontWeight: 600,
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setEditingResult(result);
                                      setResultDialogOpen(true);
                                    }}
                                  >
                                    <Edit size={16} />
                                  </IconButton>
                                </Box>
                              </Box>
                              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip size="small" label={AGE_CATEGORY_LABELS[result.ageCategory]} variant="outlined" />
                                <Chip size="small" label={result.weightCategory} variant="outlined" />
                              </Box>
                              {result.notes && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  {result.notes}
                                </Typography>
                              )}
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Paper>
              )}
            </>
          )}
        </Box>

        {/* Dialogs */}
        <EnrollStudentDialog
          open={addStudentOpen}
          onClose={() => setAddStudentOpen(false)}
          onEnroll={handleEnrollStudent}
          enrolledIds={enrolledIds}
          students={students}
          competition={competition}
        />

        <AddResultDialog
          open={resultDialogOpen}
          onClose={() => {
            setResultDialogOpen(false);
            setEditingResult(undefined);
          }}
          onSave={handleSaveResult}
          competition={competition}
          students={students}
          enrollments={enrollments}
          existingResult={editingResult}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
