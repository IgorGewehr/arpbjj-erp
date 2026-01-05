'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
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
  Alert,
  useTheme,
  useMediaQuery,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Bus,
  Car,
  HelpCircle,
  X,
  Scale,
  Users,
  Info,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { competitionService } from '@/services/competitionService';
import { competitionEnrollmentService } from '@/services/competitionEnrollmentService';
import {
  Competition,
  CompetitionResult,
  CompetitionStatus,
  CompetitionEnrollment,
  AgeCategory,
  StudentTransportPreference,
  WEIGHT_CATEGORIES_CBJJ,
  AGE_CATEGORY_LABELS,
  TRANSPORT_STATUS_LABELS,
  TRANSPORT_PREFERENCE_LABELS,
} from '@/types';
import { EmptyCompetitionsIllustration } from '@/components/common/EmptyStateIllustrations';
import { ListItemSkeleton, StatsCardSkeleton } from '@/components/common/SkeletonComponents';
import { FadeIn, ListItemAnimation, SlideIn } from '@/components/common/AnimatedComponents';

// ============================================
// Status Config
// ============================================
const statusConfig: Record<CompetitionStatus, { label: string; color: 'warning' | 'info' | 'success' }> = {
  upcoming: { label: 'Próxima', color: 'warning' },
  ongoing: { label: 'Em Andamento', color: 'info' },
  completed: { label: 'Concluída', color: 'success' },
};

// ============================================
// Position Config
// ============================================
const positionConfig = {
  gold: { label: 'Ouro', color: '#FFD700', icon: '🥇' },
  silver: { label: 'Prata', color: '#C0C0C0', icon: '🥈' },
  bronze: { label: 'Bronze', color: '#CD7F32', icon: '🥉' },
  participant: { label: 'Participante', color: '#666', icon: '🎖️' },
};

// ============================================
// Transport Icon
// ============================================
const TransportIcon = ({ preference }: { preference: StudentTransportPreference }) => {
  switch (preference) {
    case 'need_transport':
      return <Bus size={14} />;
    case 'own_transport':
      return <Car size={14} />;
    default:
      return <HelpCircle size={14} />;
  }
};

// ============================================
// Enrollment Dialog
// ============================================
interface EnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  competition: Competition | null;
  existingEnrollment: CompetitionEnrollment | null;
  onEnroll: (data: { ageCategory: AgeCategory; weightCategory: string; transportPreference: StudentTransportPreference }) => void;
  loading: boolean;
}

function EnrollmentDialog({ open, onClose, competition, existingEnrollment, onEnroll, loading }: EnrollmentDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [ageCategory, setAgeCategory] = useState<AgeCategory>('adult');
  const [weightCategory, setWeightCategory] = useState('');
  const [transportPreference, setTransportPreference] = useState<StudentTransportPreference>('undecided');

  // Reset form when dialog opens
  useEffect(() => {
    if (open && existingEnrollment) {
      setAgeCategory(existingEnrollment.ageCategory);
      setWeightCategory(existingEnrollment.weightCategory);
      setTransportPreference(existingEnrollment.transportPreference);
    } else if (open) {
      setAgeCategory('adult');
      setWeightCategory('');
      setTransportPreference('undecided');
    }
  }, [open, existingEnrollment]);

  const handleSubmit = () => {
    onEnroll({ ageCategory, weightCategory, transportPreference });
  };

  // Get available weight categories
  const weightCategories = [
    ...WEIGHT_CATEGORIES_CBJJ,
    ...(competition?.customWeightCategories || []),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          {existingEnrollment ? 'Editar Inscrição' : 'Inscrição na Competição'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {competition && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {competition.name}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calendar size={14} color="#666" />
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapPin size={14} color="#666" />
                <Typography variant="body2" color="text.secondary">
                  {competition.location}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Suas Categorias
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Categoria de Idade</InputLabel>
            <Select
              value={ageCategory}
              label="Categoria de Idade"
              onChange={(e) => setAgeCategory(e.target.value as AgeCategory)}
              startAdornment={<Users size={16} style={{ marginRight: 8, marginLeft: 8 }} />}
            >
              {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Categoria de Peso</InputLabel>
            <Select
              value={weightCategory}
              label="Categoria de Peso"
              onChange={(e) => setWeightCategory(e.target.value)}
              startAdornment={<Scale size={16} style={{ marginRight: 8, marginLeft: 8 }} />}
            >
              {weightCategories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Transporte
        </Typography>

        {competition?.transportStatus && (
          <Alert
            severity={competition.transportStatus === 'confirmed' ? 'success' : competition.transportStatus === 'no_transport' ? 'warning' : 'info'}
            sx={{ mb: 2 }}
            icon={<Bus size={20} />}
          >
            <Typography variant="body2" fontWeight={500}>
              {TRANSPORT_STATUS_LABELS[competition.transportStatus]}
            </Typography>
            {competition.transportNotes && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                {competition.transportNotes}
              </Typography>
            )}
            {competition.transportCapacity && competition.transportStatus === 'confirmed' && (
              <Typography variant="caption" display="block">
                Capacidade: {competition.transportCapacity} pessoas
              </Typography>
            )}
          </Alert>
        )}

        <FormControl fullWidth size="small">
          <InputLabel>Preferência de Transporte</InputLabel>
          <Select
            value={transportPreference}
            label="Preferência de Transporte"
            onChange={(e) => setTransportPreference(e.target.value as StudentTransportPreference)}
            startAdornment={<TransportIcon preference={transportPreference} />}
          >
            <MenuItem value="need_transport">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Bus size={16} />
                <span>Preciso de transporte</span>
              </Box>
            </MenuItem>
            <MenuItem value="own_transport">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Car size={16} />
                <span>Vou por conta própria</span>
              </Box>
            </MenuItem>
            <MenuItem value="undecided">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HelpCircle size={16} />
                <span>Ainda não decidi</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !weightCategory}
          sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
        >
          {loading ? 'Salvando...' : existingEnrollment ? 'Atualizar' : 'Confirmar Inscrição'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================
export default function StudentCompetitionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [enrollments, setEnrollments] = useState<CompetitionEnrollment[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [canceling, setCanceling] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.studentId) {
        setLoading(false);
        return;
      }

      try {
        const [competitionsData, enrollmentsData, resultsData] = await Promise.all([
          competitionService.list(),
          competitionEnrollmentService.getByStudent(user.studentId),
          competitionService.getResultsForStudent(user.studentId),
        ]);

        setCompetitions(competitionsData);
        setEnrollments(enrollmentsData);
        setResults(resultsData);
      } catch (err) {
        showError('Erro ao carregar competições');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.studentId, showError]);

  // Get enrollment for competition
  const getEnrollment = useCallback(
    (competitionId: string) => {
      return enrollments.find((e) => e.competitionId === competitionId);
    },
    [enrollments]
  );

  // Check if student is enrolled
  const isEnrolled = useCallback(
    (competitionId: string) => {
      return !!getEnrollment(competitionId);
    },
    [getEnrollment]
  );

  // Handle enrollment
  const handleOpenEnrollment = (competition: Competition) => {
    setSelectedCompetition(competition);
    setEnrollmentDialogOpen(true);
  };

  const handleEnroll = async (data: { ageCategory: AgeCategory; weightCategory: string; transportPreference: StudentTransportPreference }) => {
    if (!user?.studentId || !user?.displayName || !selectedCompetition) return;

    setEnrolling(true);
    try {
      const existingEnrollment = getEnrollment(selectedCompetition.id);

      if (existingEnrollment) {
        // Update existing enrollment
        await competitionEnrollmentService.update(existingEnrollment.id, {
          ageCategory: data.ageCategory,
          weightCategory: data.weightCategory,
          transportPreference: data.transportPreference,
        });

        setEnrollments((prev) =>
          prev.map((e) =>
            e.id === existingEnrollment.id
              ? { ...e, ...data }
              : e
          )
        );
        success('Inscrição atualizada!');
      } else {
        // Create new enrollment
        const enrollment = await competitionEnrollmentService.enroll({
          competitionId: selectedCompetition.id,
          competitionName: selectedCompetition.name,
          studentId: user.studentId,
          studentName: user.displayName,
          ageCategory: data.ageCategory,
          weightCategory: data.weightCategory,
          transportPreference: data.transportPreference,
          enrolledBy: user.id,
        });

        setEnrollments((prev) => [...prev, enrollment]);
        success('Inscrito com sucesso!');
      }

      setEnrollmentDialogOpen(false);
    } catch (err) {
      showError('Erro ao processar inscrição');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle cancel enrollment
  const handleCancelEnrollment = async (competitionId: string) => {
    const enrollment = getEnrollment(competitionId);
    if (!enrollment) return;

    setCanceling(competitionId);
    try {
      await competitionEnrollmentService.delete(enrollment.id);
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollment.id));
      success('Inscrição cancelada');
    } catch (err) {
      showError('Erro ao cancelar inscrição');
    } finally {
      setCanceling(null);
    }
  };

  // Get result for competition
  const getResult = useCallback(
    (competitionId: string) => {
      return results.find((r) => r.competitionId === competitionId);
    },
    [results]
  );

  // Filter competitions
  const upcomingCompetitions = competitions.filter((c) => c.status === 'upcoming' || c.status === 'ongoing');
  const enrolledCompetitionIds = new Set(enrollments.map((e) => e.competitionId));
  const myEnrolledCompetitions = competitions.filter((c) => enrolledCompetitionIds.has(c.id) && c.status !== 'completed');
  const pastCompetitions = competitions.filter((c) => c.status === 'completed');

  // Medal stats
  const medalStats = results.reduce(
    (acc, r) => {
      if (r.position === 'gold') acc.gold++;
      else if (r.position === 'silver') acc.silver++;
      else if (r.position === 'bronze') acc.bronze++;
      else acc.participations++;
      return acc;
    },
    { gold: 0, silver: 0, bronze: 0, participations: 0 }
  );

  if (loading) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ width: '50%', height: 24, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
          <Box sx={{ width: '70%', height: 16, bgcolor: 'grey.100', borderRadius: 1 }} />
        </Box>
        <StatsCardSkeleton />
        <Box sx={{ mt: 3 }}>
          {[1, 2].map((i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <ListItemSkeleton hasSecondaryAction />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <FadeIn>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            fontWeight={600}
            color="text.primary"
            sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
          >
            Competições
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Veja as competições disponíveis e seus resultados
          </Typography>
        </Box>

        {/* Medal Stats */}
        <SlideIn direction="up" delay={0.1}>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              mb: 3,
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography
              variant="body2"
              fontWeight={600}
              color="text.secondary"
              sx={{
                mb: 2,
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Minhas Conquistas
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: { xs: 1, sm: 2 } }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>🥇</Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ color: '#FFD700', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {medalStats.gold}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Ouros
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>🥈</Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ color: '#C0C0C0', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {medalStats.silver}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Pratas
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>🥉</Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ color: '#CD7F32', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {medalStats.bronze}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Bronzes
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>🎖️</Typography>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {medalStats.participations}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Participações
                </Typography>
              </Box>
            </Box>
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
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={false}
            sx={{
              minHeight: { xs: 40, sm: 48 },
              '& .MuiTab-root': {
                minHeight: { xs: 40, sm: 48 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
                minWidth: 'auto',
              },
            }}
          >
            <Tab label={`Próximas (${upcomingCompetitions.length})`} />
            <Tab label={isMobile ? `Inscrições (${myEnrolledCompetitions.length})` : `Minhas Inscrições (${myEnrolledCompetitions.length})`} />
            <Tab label={`Histórico (${pastCompetitions.length})`} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {tabValue === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {upcomingCompetitions.length === 0 ? (
              <Box
                sx={{
                  p: { xs: 4, sm: 6 },
                  textAlign: 'center',
                  bgcolor: '#fff',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <EmptyCompetitionsIllustration size={isMobile ? 80 : 100} />
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                >
                  Nenhuma competição agendada
                </Typography>
              </Box>
            ) : (
              upcomingCompetitions.map((competition, index) => {
                const enrolled = isEnrolled(competition.id);
                const enrollment = getEnrollment(competition.id);
                const deadlinePassed = competition.registrationDeadline
                  ? isPast(new Date(competition.registrationDeadline))
                  : false;

                return (
                  <ListItemAnimation key={competition.id} index={index}>
                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          bgcolor: '#fff',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Trophy size={isMobile ? 18 : 20} color="#1976d2" style={{ flexShrink: 0 }} />
                            <Typography
                              variant="body1"
                              fontWeight={600}
                              sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                              noWrap
                            >
                              {competition.name}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={statusConfig[competition.status].label}
                            color={statusConfig[competition.status].color}
                            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
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
                          {competition.registrationDeadline && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Clock size={14} color={deadlinePassed ? '#DC2626' : '#666'} />
                              <Typography
                                variant="body2"
                                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: deadlinePassed ? 'error.main' : 'text.secondary' }}
                              >
                                Inscrição até {format(new Date(competition.registrationDeadline), 'dd/MM/yyyy')}
                                {deadlinePassed && ' (encerrada)'}
                              </Typography>
                            </Box>
                          )}
                          {competition.transportStatus && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Bus size={14} color={competition.transportStatus === 'confirmed' ? '#16A34A' : '#666'} />
                              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, color: competition.transportStatus === 'confirmed' ? 'success.main' : 'text.secondary' }}>
                                {TRANSPORT_STATUS_LABELS[competition.transportStatus]}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {enrolled ? (
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1.5,
                                mb: 1.5,
                                bgcolor: '#DCFCE7',
                                borderRadius: 1.5,
                              }}
                            >
                              <CheckCircle size={16} color="#16A34A" />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ color: '#166534', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  Você está inscrito nesta competição
                                </Typography>
                                {enrollment && (
                                  <Typography variant="caption" sx={{ color: '#166534', display: 'block' }}>
                                    {AGE_CATEGORY_LABELS[enrollment.ageCategory]} • {enrollment.weightCategory} • {TRANSPORT_PREFERENCE_LABELS[enrollment.transportPreference]}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {!deadlinePassed && (
                                <>
                                  <Button
                                    variant="outlined"
                                    fullWidth
                                    size={isMobile ? 'small' : 'medium'}
                                    onClick={() => handleOpenEnrollment(competition)}
                                    sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    fullWidth
                                    size={isMobile ? 'small' : 'medium'}
                                    startIcon={<UserX size={16} />}
                                    onClick={() => handleCancelEnrollment(competition.id)}
                                    disabled={canceling === competition.id}
                                    sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                                  >
                                    {canceling === competition.id ? 'Cancelando...' : 'Cancelar'}
                                  </Button>
                                </>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            fullWidth
                            size={isMobile ? 'small' : 'medium'}
                            startIcon={<UserCheck size={16} />}
                            onClick={() => handleOpenEnrollment(competition)}
                            disabled={deadlinePassed}
                            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
                          >
                            {deadlinePassed ? 'Inscrições Encerradas' : 'Quero Participar'}
                          </Button>
                        )}
                    </Box>
                  </ListItemAnimation>
                );
              })
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {myEnrolledCompetitions.length === 0 ? (
                <Box
                  sx={{
                    p: { xs: 4, sm: 6 },
                    textAlign: 'center',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                >
                  <UserCheck size={isMobile ? 36 : 48} color="#ccc" />
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                  >
                    Você não está inscrito em nenhuma competição
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
                    Confira as próximas competições e faça sua inscrição
                  </Typography>
                  <Button
                    variant="contained"
                    size={isMobile ? 'small' : 'medium'}
                    onClick={() => setTabValue(0)}
                    sx={{ bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
                  >
                    Ver Competições
                  </Button>
                </Box>
              ) : (
                myEnrolledCompetitions.map((competition, index) => {
                  const enrollment = getEnrollment(competition.id);
                  const deadlinePassed = competition.registrationDeadline
                    ? isPast(new Date(competition.registrationDeadline))
                    : false;

                  return (
                    <ListItemAnimation key={competition.id} index={index}>
                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          bgcolor: '#fff',
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: 'success.main',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Trophy size={isMobile ? 18 : 20} color="#16A34A" style={{ flexShrink: 0 }} />
                            <Typography
                              variant="body1"
                              fontWeight={600}
                              sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                              noWrap
                            >
                              {competition.name}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            icon={<CheckCircle size={12} />}
                            label="Inscrito"
                            color="success"
                            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
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
                        </Box>

                        {/* Enrollment details */}
                        {enrollment && (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                icon={<Users size={12} />}
                                label={AGE_CATEGORY_LABELS[enrollment.ageCategory]}
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                size="small"
                                icon={<Scale size={12} />}
                                label={enrollment.weightCategory}
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                size="small"
                                icon={<TransportIcon preference={enrollment.transportPreference} />}
                                label={TRANSPORT_PREFERENCE_LABELS[enrollment.transportPreference]}
                                variant="outlined"
                                color={enrollment.transportPreference === 'need_transport' ? 'primary' : 'default'}
                                sx={{ fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Transport info */}
                        {competition.transportStatus && (
                          <Alert
                            severity={competition.transportStatus === 'confirmed' ? 'success' : competition.transportStatus === 'no_transport' ? 'warning' : 'info'}
                            sx={{ mb: 2 }}
                            icon={<Bus size={18} />}
                          >
                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                              {TRANSPORT_STATUS_LABELS[competition.transportStatus]}
                            </Typography>
                            {competition.transportNotes && (
                              <Typography variant="caption" display="block">
                                {competition.transportNotes}
                              </Typography>
                            )}
                          </Alert>
                        )}

                        {!deadlinePassed && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              fullWidth
                              size={isMobile ? 'small' : 'medium'}
                              onClick={() => handleOpenEnrollment(competition)}
                              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            >
                              Editar Inscrição
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              fullWidth
                              size={isMobile ? 'small' : 'medium'}
                              onClick={() => handleCancelEnrollment(competition.id)}
                              disabled={canceling === competition.id}
                              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                            >
                              {canceling === competition.id ? 'Cancelando...' : 'Cancelar'}
                            </Button>
                          </Box>
                        )}
                      </Box>
                  </ListItemAnimation>
                  );
                })
              )}
          </Box>
        )}

        {tabValue === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {pastCompetitions.length === 0 ? (
                <Box
                  sx={{
                    p: { xs: 4, sm: 6 },
                    textAlign: 'center',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                >
                  <EmptyCompetitionsIllustration size={isMobile ? 80 : 100} />
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
                  >
                    Nenhuma competição no histórico
                  </Typography>
                </Box>
              ) : (
                pastCompetitions.map((competition, index) => {
                  const result = getResult(competition.id);
                  const enrollment = getEnrollment(competition.id);

                  return (
                    <ListItemAnimation key={competition.id} index={index}>
                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          bgcolor: '#fff',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Trophy size={isMobile ? 18 : 20} color="#666" style={{ flexShrink: 0 }} />
                            <Typography
                              variant="body1"
                              fontWeight={600}
                              sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                              noWrap
                            >
                              {competition.name}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label="Concluída"
                            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: result || enrollment ? 2 : 0 }}>
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
                        </Box>

                        {result ? (
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: 'grey.50',
                              borderRadius: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                            }}
                          >
                            <Typography sx={{ fontSize: { xs: '1.5rem', sm: '2rem' }, lineHeight: 1 }}>
                              {positionConfig[result.position].icon}
                            </Typography>
                            <Box>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem' } }}>
                                {positionConfig[result.position].label}
                              </Typography>
                              {(result.ageCategory || result.weightCategory) && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                  {[result.ageCategory, result.weightCategory].filter(Boolean).join(' - ')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ) : enrollment ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1.5,
                              bgcolor: '#E0F2FE',
                              borderRadius: 1.5,
                            }}
                          >
                            <AlertCircle size={16} color="#0284C7" />
                            <Box>
                              <Typography variant="body2" sx={{ color: '#0369A1', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                Resultado pendente
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#0369A1' }}>
                                {AGE_CATEGORY_LABELS[enrollment.ageCategory]} • {enrollment.weightCategory}
                              </Typography>
                            </Box>
                          </Box>
                        ) : null}
                      </Box>
                  </ListItemAnimation>
                  );
                })
            )}
          </Box>
        )}

        {/* Enrollment Dialog */}
        <EnrollmentDialog
          open={enrollmentDialogOpen}
          onClose={() => setEnrollmentDialogOpen(false)}
          competition={selectedCompetition}
          existingEnrollment={selectedCompetition ? getEnrollment(selectedCompetition.id) || null : null}
          onEnroll={handleEnroll}
          loading={enrolling}
        />
      </Box>
    </FadeIn>
  );
}
