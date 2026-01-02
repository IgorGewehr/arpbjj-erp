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
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useFeedback, useConfirmDialog } from '@/components/providers';
import { useAuth } from '@/components/providers/AuthProvider';
import { competitionService } from '@/services/competitionService';
import { studentService } from '@/services/studentService';
import { achievementService } from '@/services/achievementService';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import {
  Competition,
  CompetitionResult,
  CompetitionStatus,
  CompetitionPosition,
  Student,
  AgeCategory,
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

const ageCategoryLabels: Record<AgeCategory, string> = {
  kids: 'Infantil',
  juvenile: 'Juvenil',
  adult: 'Adulto',
  master: 'Master',
};

const weightCategories = [
  'Galo', 'Pluma', 'Pena', 'Leve', 'Médio',
  'Meio-Pesado', 'Pesado', 'Super-Pesado', 'Pesadíssimo', 'Absoluto',
];

// ============================================
// Add Student Dialog
// ============================================
interface AddStudentDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (studentIds: string[]) => void;
  enrolledIds: string[];
  students: Student[];
}

function AddStudentDialog({ open, onClose, onAdd, enrolledIds, students }: AddStudentDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const availableStudents = students.filter((s) => !enrolledIds.includes(s.id));

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onAdd(selectedIds);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adicionar Alunos</DialogTitle>
      <DialogContent dividers>
        {availableStudents.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Todos os alunos já estão inscritos
          </Typography>
        ) : (
          <List>
            {availableStudents.map((student) => (
              <ListItem
                key={student.id}
                component="div"
                onClick={() => handleToggle(student.id)}
                sx={{ cursor: 'pointer', borderRadius: 1 }}
              >
                <ListItemAvatar>
                  <Avatar src={student.photoUrl}>
                    {student.fullName.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={student.nickname || student.fullName}
                  secondary={<BeltDisplay belt={student.currentBelt} stripes={student.currentStripes} size="small" />}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    checked={selectedIds.includes(student.id)}
                    onChange={() => handleToggle(student.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={selectedIds.length === 0}
        >
          Adicionar ({selectedIds.length})
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
  existingResult?: CompetitionResult;
}

function AddResultDialog({ open, onClose, onSave, competition, students, existingResult }: AddResultDialogProps) {
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

  const enrolledStudents = students.filter((s) => competition.enrolledStudentIds.includes(s.id));
  const selectedStudent = students.find((s) => s.id === studentId);

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
              onChange={(_, value) => setStudentId(value?.id || '')}
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
                {Object.entries(ageCategoryLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              freeSolo
              options={weightCategories}
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
      const [compData, resultsData, studentsData] = await Promise.all([
        competitionService.getById(competitionId),
        competitionService.getResultsForCompetition(competitionId),
        studentService.getActive(),
      ]);

      if (!compData) {
        showError('Competição não encontrada');
        router.push('/competicoes');
        return;
      }

      setCompetition(compData);
      setResults(resultsData);
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

  const handleAddStudents = async (studentIds: string[]) => {
    if (!competition) return;

    try {
      for (const id of studentIds) {
        await competitionService.enrollStudent(competition.id, id);
      }
      success(`${studentIds.length} aluno(s) inscrito(s) com sucesso!`);
      loadData();
    } catch (err) {
      showError('Erro ao inscrever alunos');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!competition) return;

    const student = students.find((s) => s.id === studentId);
    const confirmed = await confirm({
      title: 'Remover Inscrição',
      message: `Deseja remover ${student?.nickname || student?.fullName} da competição?`,
      confirmText: 'Remover',
      severity: 'warning',
    });

    if (confirmed) {
      try {
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

  const enrolledStudents = students.filter((s) => competition.enrolledStudentIds.includes(s.id));
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
                  <Tab label={`Inscritos (${enrolledStudents.length})`} icon={<Users size={18} />} iconPosition="start" />
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
                      Adicionar Alunos
                    </Button>
                  </Box>

                  {enrolledStudents.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Users size={48} color="#ccc" />
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        Nenhum aluno inscrito ainda
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {enrolledStudents.map((student, index) => (
                        <Box key={student.id}>
                          {index > 0 && <Divider />}
                          <ListItem sx={{ py: 2 }}>
                            <ListItemAvatar>
                              <Avatar src={student.photoUrl} sx={{ width: 48, height: 48 }}>
                                {student.fullName.charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography fontWeight={600}>
                                  {student.nickname || student.fullName}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <BeltDisplay belt={student.currentBelt} stripes={student.currentStripes} size="small" />
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveStudent(student.id)}
                                color="error"
                              >
                                <X size={18} />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Box>
                      ))}
                    </List>
                  )}
                </Paper>
              )}

              {tabValue === 1 && (
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
                      disabled={enrolledStudents.length === 0}
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
                                <Chip size="small" label={ageCategoryLabels[result.ageCategory]} variant="outlined" />
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
        <AddStudentDialog
          open={addStudentOpen}
          onClose={() => setAddStudentOpen(false)}
          onAdd={handleAddStudents}
          enrolledIds={competition.enrolledStudentIds}
          students={students}
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
          existingResult={editingResult}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
