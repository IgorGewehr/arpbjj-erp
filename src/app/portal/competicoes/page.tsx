'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Medal,
  ChevronRight,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { createCompetitionService } from '@/services/competitionService';
import { createCompetitionEnrollmentService } from '@/services/competitionEnrollmentService';
import {
  Competition,
  CompetitionResult,
  CompetitionStatus,
  CompetitionEnrollment,
  AgeCategory,
  StudentTransportPreference,
  TeamPosition,
  AGE_CATEGORY_LABELS,
  WEIGHT_CATEGORIES_CBJJ,
  TRANSPORT_STATUS_LABELS,
  TRANSPORT_PREFERENCE_LABELS,
} from '@/types';
import { EmptyCompetitionsIllustration } from '@/components/common/EmptyStateIllustrations';
import { AcademyIndicator } from '@/components/portal/AcademyIndicator';
import { ListItemSkeleton, StatsCardSkeleton } from '@/components/common/SkeletonComponents';
import { FadeIn, ListItemAnimation, SlideIn } from '@/components/common/AnimatedComponents';
import { TeamGalleryDialog } from '@/components/features/competitions/TeamGalleryDialog';

// ============================================
// Status Config
// ============================================
const statusConfig: Record<CompetitionStatus, { label: string; color: 'warning' | 'info' | 'success' }> = {
  upcoming: { label: 'Próxima', color: 'warning' },
  ongoing: { label: 'Em Andamento', color: 'info' },
  completed: { label: 'Concluída', color: 'success' },
};

// ============================================
// Team Position Config
// ============================================
const teamPositionConfig: Record<TeamPosition, { label: string; emoji: string; bgColor: string; color: string; borderColor: string }> = {
  gold: { label: 'Campeao', emoji: '🏆', bgColor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' },
  silver: { label: 'Vice', emoji: '🏆', bgColor: '#F3F4F6', color: '#374151', borderColor: '#9CA3AF' },
  bronze: { label: '3o Lugar', emoji: '🏆', bgColor: '#FED7AA', color: '#7C2D12', borderColor: '#F97316' },
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
  const router = useRouter();
  const { user } = useAuth();
  const { academy, academyUser } = useAcademy();
  const { success, error: showError } = useFeedback();

  // Get studentId from academyUser (not from user)
  const studentIdFromUser = academyUser?.studentId;
  const studentName = academyUser?.displayName || user?.displayName;

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [enrollments, setEnrollments] = useState<CompetitionEnrollment[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [effectiveStudentId, setEffectiveStudentId] = useState<string | undefined>(studentIdFromUser);
  const [teamGalleryOpen, setTeamGalleryOpen] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!academy?.id) {
        setLoading(false);
        return;
      }

      const competitionService = createCompetitionService(academy.id);
      const competitionEnrollmentService = createCompetitionEnrollmentService(academy.id);

      try {
        // Load competitions for all students (they should see all available competitions)
        const competitionsData = await competitionService.list();
        setCompetitions(competitionsData);

        // Try to get studentId from academyUser, or find student by linkedUserId
        let resolvedStudentId = studentIdFromUser;

        // If no studentId in academyUser, try to find student by user.id (linkedUserId)
        if (!resolvedStudentId && user?.id) {
          const { createStudentService } = await import('@/services/studentService');
          const studentService = createStudentService(academy.id);
          const student = await studentService.getByLinkedUserId(user.id);
          if (student) {
            resolvedStudentId = student.id;
          }
        }

        // Save the resolved studentId for use in other functions
        setEffectiveStudentId(resolvedStudentId);

        // Only load enrollments and results if we have a studentId
        if (resolvedStudentId) {
          const [enrollmentsData, resultsData] = await Promise.all([
            competitionEnrollmentService.getByStudent(resolvedStudentId),
            competitionService.getResultsForStudent(resolvedStudentId),
          ]);
          setEnrollments(enrollmentsData);
          setResults(resultsData);
        }
      } catch (err) {
        console.error('Error loading competitions:', err);
        showError('Erro ao carregar competições');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [academy?.id, studentIdFromUser, user?.id, showError]);

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
    if (!effectiveStudentId || !studentName || !selectedCompetition || !academy?.id) return;

    const competitionEnrollmentService = createCompetitionEnrollmentService(academy.id);

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
          studentId: effectiveStudentId,
          studentName: studentName,
          ageCategory: data.ageCategory,
          weightCategory: data.weightCategory,
          transportPreference: data.transportPreference,
          enrolledBy: user?.id || '',
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
    if (!enrollment || !academy?.id) return;

    const competitionEnrollmentService = createCompetitionEnrollmentService(academy.id);

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

  // Get result for competition (single - legacy)
  const getResult = useCallback(
    (competitionId: string) => {
      return results.find((r) => r.competitionId === competitionId);
    },
    [results]
  );

  // Get all results for competition (multi-result support)
  const getResults = useCallback(
    (competitionId: string) => {
      return results.filter((r) => r.competitionId === competitionId);
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
        {/* Academy indicator for multi-academy users */}
        <AcademyIndicator label="Competicoes de" icon={<Trophy size={16} />} />

        {/* Trophy Showcase - Academy team trophies (before Minhas Conquistas) */}
        {(() => {
          const trophyCompetitions = competitions.filter((c) => c.teamPosition);
          if (trophyCompetitions.length === 0) return null;
          return (
            <SlideIn direction="up" delay={0.1}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.8rem' },
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {trophyCompetitions.length} {trophyCompetitions.length === 1 ? 'Trofeu' : 'Trofeus'} da Academia
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setTeamGalleryOpen(true)}
                    sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 'auto' }}
                  >
                    Galeria da Equipe
                  </Button>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    pb: 1,
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                  }}
                >
                  {trophyCompetitions.map((comp) => {
                    const tpConfig = teamPositionConfig[comp.teamPosition!];
                    return (
                      <Box
                        key={comp.id}
                        onClick={() => router.push(`/portal/competicoes/${comp.id}`)}
                        sx={{
                          scrollSnapAlign: 'start',
                          minWidth: { xs: 160, sm: 180 },
                          p: 2,
                          bgcolor: tpConfig.bgColor,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: tpConfig.borderColor,
                          cursor: 'pointer',
                          flexShrink: 0,
                          '&:hover': { opacity: 0.85 },
                          transition: 'opacity 0.2s',
                        }}
                      >
                        <Typography sx={{ fontSize: '1.75rem', lineHeight: 1, mb: 1, filter: comp.teamPosition === 'silver' ? 'grayscale(0.8)' : comp.teamPosition === 'bronze' ? 'sepia(0.5)' : 'none' }}>
                          {tpConfig.emoji}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: tpConfig.color, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                          noWrap
                        >
                          {comp.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: tpConfig.color, opacity: 0.7, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
                        >
                          {format(new Date(comp.date), "MMM yyyy", { locale: ptBR })}
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          display="block"
                          sx={{ color: tpConfig.color, mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        >
                          {tpConfig.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </SlideIn>
          );
        })()}

        {/* Medal Stats Card - Minhas Conquistas */}
        <SlideIn direction="up" delay={0.15}>
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
                  Participacoes
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
            <Tab label={`Proximas (${upcomingCompetitions.length})`} />
            <Tab label={isMobile ? `Inscricoes (${myEnrolledCompetitions.length})` : `Minhas Inscricoes (${myEnrolledCompetitions.length})`} />
            <Tab label={`Historico (${pastCompetitions.length})`} />
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
                        onClick={() => router.push(`/portal/competicoes/${competition.id}`)}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          bgcolor: '#fff',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          cursor: 'pointer',
                          '&:hover': { borderColor: 'grey.400', bgcolor: 'grey.50' },
                          transition: 'all 0.2s',
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              size="small"
                              label={statusConfig[competition.status].label}
                              color={statusConfig[competition.status].color}
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                            />
                            <ChevronRight size={16} color="#999" />
                          </Box>
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
                                    onClick={(e) => { e.stopPropagation(); handleOpenEnrollment(competition); }}
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
                                    onClick={(e) => { e.stopPropagation(); handleCancelEnrollment(competition.id); }}
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
                            onClick={(e) => { e.stopPropagation(); handleOpenEnrollment(competition); }}
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
                        onClick={() => router.push(`/portal/competicoes/${competition.id}`)}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          bgcolor: '#fff',
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: 'success.main',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.50' },
                          transition: 'all 0.2s',
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              size="small"
                              icon={<CheckCircle size={12} />}
                              label="Inscrito"
                              color="success"
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                            />
                            <ChevronRight size={16} color="#999" />
                          </Box>
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

                        {/* Transport info - hidden for completed competitions */}
                        {competition.transportStatus && competition.status !== 'completed' && (
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
                              onClick={(e) => { e.stopPropagation(); handleOpenEnrollment(competition); }}
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
                  const competitionResults = getResults(competition.id);
                  const enrollment = getEnrollment(competition.id);

                  return (
                    <ListItemAnimation key={competition.id} index={index}>
                      <Box
                        onClick={() => router.push(`/portal/competicoes/${competition.id}`)}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          bgcolor: '#fff',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          cursor: 'pointer',
                          '&:hover': { borderColor: 'grey.400', bgcolor: 'grey.50' },
                          transition: 'all 0.2s',
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              size="small"
                              label="Concluida"
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: 22, sm: 24 } }}
                            />
                            <ChevronRight size={16} color="#999" />
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: competitionResults.length > 0 ? 1.5 : 0 }}>
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

                        {/* All results for this competition */}
                        {competitionResults.length > 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {competitionResults.map((result) => (
                              <Box
                                key={result.id}
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
                                <Box sx={{ flex: 1 }}>
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
                            ))}
                          </Box>
                        )}

                        {/* Enrolled but no result yet */}
                        {competitionResults.length === 0 && enrollment && (
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
                            <Typography variant="body2" sx={{ color: '#0369A1', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                              Resultado pendente - toque para registrar
                            </Typography>
                          </Box>
                        )}
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

        {/* Team Gallery Dialog */}
        <TeamGalleryDialog
          open={teamGalleryOpen}
          onClose={() => setTeamGalleryOpen(false)}
        />
      </Box>
    </FadeIn>
  );
}
