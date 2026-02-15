'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
  Button,
  IconButton,
  Divider,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Trophy,
  Calendar,
  MapPin,
  ArrowLeft,
  Medal,
  Camera,
  Edit,
  Trash2,
  Users,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback, useConfirmDialog } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { createCompetitionService } from '@/services/competitionService';
import { createCompetitionEnrollmentService } from '@/services/competitionEnrollmentService';
import { createAchievementService } from '@/services/achievementService';
import {
  Competition,
  CompetitionResult,
  CompetitionPosition,
  CompetitionModality,
  CompetitionDivisionType,
  CompetitionEnrollment,
  AgeCategory,
  StudentTransportPreference,
  AGE_CATEGORY_LABELS,
} from '@/types';
import { CompetitionGallery } from '@/components/features/competitions';
import { ListItemSkeleton } from '@/components/common/SkeletonComponents';
import { FadeIn, SlideIn } from '@/components/common/AnimatedComponents';
import { StudentResultDialog } from './StudentResultDialog';

// ============================================
// Position Config
// ============================================
const positionConfig: Record<string, { label: string; color: string; icon: string }> = {
  gold: { label: 'Ouro', color: '#FFD700', icon: '🥇' },
  silver: { label: 'Prata', color: '#C0C0C0', icon: '🥈' },
  bronze: { label: 'Bronze', color: '#CD7F32', icon: '🥉' },
  participant: { label: 'Participante', color: '#666', icon: '🎖️' },
};

const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'success' }> = {
  upcoming: { label: 'Proxima', color: 'warning' },
  ongoing: { label: 'Em Andamento', color: 'info' },
  completed: { label: 'Concluida', color: 'success' },
};

// ============================================
// Main Component
// ============================================
export default function StudentCompetitionDetailPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { academy, academyUser } = useAcademy();
  const { success, error: showError } = useFeedback();
  const { confirm } = useConfirmDialog();

  const competitionId = params.id as string;
  const studentName = academyUser?.displayName || user?.displayName;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [enrollments, setEnrollments] = useState<CompetitionEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Result dialog state
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<CompetitionResult | null>(null);
  const [savingResult, setSavingResult] = useState(false);

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false);

  // Resolved student ID
  const [effectiveStudentId, setEffectiveStudentId] = useState<string | undefined>(academyUser?.studentId);

  // ============================================
  // Load Data
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      if (!academy?.id || !competitionId) {
        setLoading(false);
        return;
      }

      const competitionService = createCompetitionService(academy.id);
      const enrollmentService = createCompetitionEnrollmentService(academy.id);

      try {
        // Resolve student ID
        let resolvedStudentId = academyUser?.studentId;
        if (!resolvedStudentId && user?.id) {
          const { createStudentService } = await import('@/services/studentService');
          const studentService = createStudentService(academy.id);
          const student = await studentService.getByLinkedUserId(user.id);
          if (student) resolvedStudentId = student.id;
        }
        setEffectiveStudentId(resolvedStudentId);

        const [compData, resultsData, enrollmentsData] = await Promise.all([
          competitionService.getById(competitionId),
          competitionService.getResultsForCompetition(competitionId),
          enrollmentService.getByCompetition(competitionId),
        ]);

        if (!compData) {
          showError('Competicao nao encontrada');
          router.push('/portal/competicoes');
          return;
        }

        setCompetition(compData);
        setResults(resultsData);
        setEnrollments(enrollmentsData);
      } catch (err) {
        console.error('Error loading competition detail:', err);
        showError('Erro ao carregar dados da competicao');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [academy?.id, competitionId, academyUser?.studentId, user?.id, showError, router]);

  // ============================================
  // Derived data
  // ============================================
  const isEnrolled = enrollments.some((e) => e.studentId === effectiveStudentId);
  const myResult = results.find((r) => r.studentId === effectiveStudentId);
  const myEnrollment = enrollments.find((e) => e.studentId === effectiveStudentId);
  const enrolledStudentsList = enrollments.map((e) => ({ id: e.studentId, name: e.studentName }));

  // ============================================
  // Handle result dialog
  // ============================================
  const handleOpenResultDialog = useCallback(() => {
    setEditingResult(myResult || null);
    setResultDialogOpen(true);
  }, [myResult]);

  const handleSaveResult = async (data: {
    position: CompetitionPosition;
    ageCategory: AgeCategory;
    weightCategory: string;
    modality?: CompetitionModality;
    divisionType?: CompetitionDivisionType;
    notes?: string;
  }) => {
    if (!effectiveStudentId || !studentName || !competition || !academy?.id || !user?.id) return;

    const competitionService = createCompetitionService(academy.id);
    const achievementService = createAchievementService(academy.id);

    setSavingResult(true);
    try {
      if (myResult) {
        await competitionService.updateResult(myResult.id, {
          position: data.position,
          ageCategory: data.ageCategory,
          weightCategory: data.weightCategory,
          modality: data.modality,
          divisionType: data.divisionType,
          notes: data.notes,
        });
        setResults((prev) =>
          prev.map((r) =>
            r.id === myResult.id
              ? { ...r, position: data.position, ageCategory: data.ageCategory, weightCategory: data.weightCategory, modality: data.modality, divisionType: data.divisionType, notes: data.notes }
              : r
          )
        );
        success('Resultado atualizado!');
      } else {
        const newResult = await competitionService.addResult(
          {
            competitionId: competition.id,
            competitionName: competition.name,
            studentId: effectiveStudentId,
            studentName: studentName,
            position: data.position,
            beltCategory: 'white' as any,
            ageCategory: data.ageCategory,
            weightCategory: data.weightCategory,
            modality: data.modality,
            divisionType: data.divisionType,
            notes: data.notes,
            date: competition.date,
          },
          user.id
        );

        await achievementService.createCompetitionAchievement(
          effectiveStudentId,
          studentName,
          competition.id,
          competition.name,
          data.position,
          competition.date,
          user.id
        );

        setResults((prev) => [...prev, newResult]);
        success('Resultado registrado!');
      }

      setResultDialogOpen(false);
    } catch (err) {
      showError('Erro ao salvar resultado');
    } finally {
      setSavingResult(false);
    }
  };

  // ============================================
  // Handle Delete Result
  // ============================================
  const handleDeleteResult = async () => {
    if (!myResult || !academy?.id) return;

    const confirmed = await confirm({
      title: 'Excluir Resultado',
      message: 'Deseja excluir seu resultado desta competição?',
      confirmText: 'Excluir',
      severity: 'error',
    });

    if (confirmed) {
      const competitionService = createCompetitionService(academy.id);
      try {
        await competitionService.deleteResult(myResult.id);
        setResults((prev) => prev.filter((r) => r.id !== myResult.id));
        success('Resultado excluído');
      } catch (err) {
        showError('Erro ao excluir resultado');
      }
    }
  };

  // ============================================
  // Handle Self-Enrollment
  // ============================================
  const handleSelfEnroll = async () => {
    if (!effectiveStudentId || !studentName || !competition || !academy?.id || !user?.id) return;

    const enrollmentService = createCompetitionEnrollmentService(academy.id);
    const competitionService = createCompetitionService(academy.id);

    setEnrolling(true);
    try {
      const enrollment = await enrollmentService.enroll({
        competitionId: competition.id,
        competitionName: competition.name,
        studentId: effectiveStudentId,
        studentName: studentName,
        ageCategory: 'adult' as AgeCategory,
        weightCategory: '',
        transportPreference: 'undecided' as StudentTransportPreference,
        enrolledBy: user.id,
      });

      // Also update legacy enrolledStudentIds
      try {
        await competitionService.enrollStudent(competition.id, effectiveStudentId);
      } catch {
        // Legacy field may not exist
      }

      setEnrollments((prev) => [...prev, enrollment]);
      success('Inscrito com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao se inscrever';
      showError(msg);
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (!myEnrollment || !effectiveStudentId || !competition || !academy?.id) return;

    const enrollmentService = createCompetitionEnrollmentService(academy.id);
    const competitionService = createCompetitionService(academy.id);

    setEnrolling(true);
    try {
      await enrollmentService.delete(myEnrollment.id);

      // Also remove from legacy array
      try {
        await competitionService.unenrollStudent(competition.id, effectiveStudentId);
      } catch {
        // Legacy field may not exist
      }

      setEnrollments((prev) => prev.filter((e) => e.id !== myEnrollment.id));
      success('Inscrição cancelada');
    } catch (err) {
      showError('Erro ao cancelar inscrição');
    } finally {
      setEnrolling(false);
    }
  };

  // ============================================
  // Loading State
  // ============================================
  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 40, height: 40, bgcolor: 'grey.200', borderRadius: '50%' }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ width: '60%', height: 24, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
            <Box sx={{ width: '40%', height: 16, bgcolor: 'grey.100', borderRadius: 1 }} />
          </Box>
        </Box>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ mb: 2 }}>
            <ListItemSkeleton />
          </Box>
        ))}
      </Box>
    );
  }

  if (!competition) return null;

  const status = statusConfig[competition.status] || statusConfig.upcoming;

  return (
    <FadeIn>
      <Box>
        {/* Header with back button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <IconButton
            onClick={() => router.push('/portal/competicoes')}
            sx={{ bgcolor: 'action.hover' }}
            size="small"
          >
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {competition.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={status.label}
                color={status.color}
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
              {isEnrolled && (
                <Chip
                  size="small"
                  label="Inscrito"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Competition Info Card */}
        <SlideIn direction="up" delay={0.1}>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              mb: 2,
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={14} color="#666" />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapPin size={14} color="#666" />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {competition.location}
                </Typography>
              </Box>
              {competition.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {competition.description}
                </Typography>
              )}
            </Box>

            {/* Self-enrollment button */}
            {effectiveStudentId && competition.status !== 'completed' && (
              <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'grey.100' }}>
                {isEnrolled ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={(e) => { e.stopPropagation(); handleCancelEnrollment(); }}
                    disabled={enrolling}
                    fullWidth
                  >
                    {enrolling ? 'Cancelando...' : 'Cancelar Inscrição'}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<UserPlus size={16} />}
                    onClick={(e) => { e.stopPropagation(); handleSelfEnroll(); }}
                    disabled={enrolling}
                    fullWidth
                    sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
                  >
                    {enrolling ? 'Inscrevendo...' : 'Inscrever-se'}
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </SlideIn>

        {/* Tabs */}
        <Box
          sx={{
            mb: 2,
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{
              minHeight: { xs: 40, sm: 48 },
              '& .MuiTab-root': {
                minHeight: { xs: 40, sm: 48 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
              },
            }}
          >
            <Tab
              label={`Resultados (${results.length})`}
              icon={<Medal size={16} />}
              iconPosition="start"
            />
            <Tab
              label="Galeria"
              icon={<Camera size={16} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Results Tab */}
        {tabValue === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* My result card (prominent) */}
            {effectiveStudentId && (
              <SlideIn direction="up" delay={0.15}>
                <Box
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    bgcolor: '#fff',
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: myResult ? positionConfig[myResult.position]?.color || 'grey.300' : 'primary.main',
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{
                      mb: 1.5,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Meu Resultado
                  </Typography>

                  {myResult ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, lineHeight: 1 }}>
                        {positionConfig[myResult.position]?.icon || '🎖️'}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {positionConfig[myResult.position]?.label || 'Participante'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {myResult.modality && `${myResult.modality === 'gi' ? 'Gi' : 'No-Gi'} - `}
                          {myResult.divisionType && `${myResult.divisionType === 'absolute' ? 'Absoluto' : 'Peso'} - `}
                          {myResult.ageCategory && AGE_CATEGORY_LABELS[myResult.ageCategory as AgeCategory]}
                          {myResult.weightCategory && ` - ${myResult.weightCategory}`}
                        </Typography>
                        {myResult.notes && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {myResult.notes}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small" onClick={handleOpenResultDialog}>
                        <Edit size={16} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={handleDeleteResult}>
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      onClick={handleOpenResultDialog}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.100' },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <Medal size={18} color="#666" />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Registrar meu resultado
                      </Typography>
                    </Box>
                  )}
                </Box>
              </SlideIn>
            )}

            {/* All results */}
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
                <Users size={16} color="#666" />
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                  Todos os Resultados
                </Typography>
              </Box>

              {results.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Medal size={40} color="#ddd" />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Nenhum resultado registrado ainda
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {results.map((result) => {
                    const pos = positionConfig[result.position] || positionConfig.participant;
                    const isMe = result.studentId === effectiveStudentId;

                    return (
                      <Box
                        key={result.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          bgcolor: isMe ? 'action.selected' : 'grey.50',
                          borderRadius: 1.5,
                          border: isMe ? '1px solid' : 'none',
                          borderColor: 'primary.light',
                        }}
                      >
                        <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, lineHeight: 1, flexShrink: 0 }}>
                          {pos.icon}
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              fontWeight={isMe ? 700 : 500}
                              noWrap
                              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            >
                              {result.studentName}
                            </Typography>
                            {isMe && (
                              <Chip
                                label="Voce"
                                size="small"
                                color="primary"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                            {pos.label}
                            {result.modality && ` - ${result.modality === 'gi' ? 'Gi' : 'No-Gi'}`}
                            {result.divisionType && ` - ${result.divisionType === 'absolute' ? 'Absoluto' : 'Peso'}`}
                            {result.weightCategory && ` - ${result.weightCategory}`}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Gallery Tab */}
        {tabValue === 1 && (
          <Box
            sx={{
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
              overflow: 'hidden',
              p: { xs: 1, sm: 2 },
            }}
          >
            <CompetitionGallery
              competitionId={competitionId}
              competitionName={competition.name}
              studentId={effectiveStudentId}
              studentName={studentName}
              isEnrolled={isEnrolled}
              enrolledStudents={enrolledStudentsList}
            />
          </Box>
        )}

        {/* Result Dialog */}
        <StudentResultDialog
          open={resultDialogOpen}
          onClose={() => {
            setResultDialogOpen(false);
            setEditingResult(null);
          }}
          competition={competition}
          existingResult={editingResult}
          enrollment={myEnrollment || null}
          onSave={handleSaveResult}
          loading={savingResult}
        />
      </Box>
    </FadeIn>
  );
}
