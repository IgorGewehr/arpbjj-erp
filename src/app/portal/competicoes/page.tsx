'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { competitionService } from '@/services/competitionService';
import { Competition, CompetitionResult, CompetitionStatus } from '@/types';

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
// Main Component
// ============================================
export default function StudentCompetitionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.studentId) {
        setLoading(false);
        return;
      }

      try {
        const [competitionsData, resultsData] = await Promise.all([
          competitionService.list(),
          competitionService.getResultsForStudent(user.studentId),
        ]);

        setCompetitions(competitionsData);
        setResults(resultsData);
      } catch (err) {
        showError('Erro ao carregar competições');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.studentId, showError]);

  // Check if student is enrolled
  const isEnrolled = useCallback(
    (competition: Competition) => {
      return user?.studentId && competition.enrolledStudentIds.includes(user.studentId);
    },
    [user?.studentId]
  );

  // Handle RSVP
  const handleToggleEnrollment = useCallback(
    async (competition: Competition) => {
      if (!user?.studentId) return;

      setEnrolling(competition.id);
      try {
        await competitionService.toggleEnrollment(competition.id, user.studentId);

        // Update local state
        setCompetitions((prev) =>
          prev.map((c) => {
            if (c.id === competition.id) {
              const enrolled = c.enrolledStudentIds.includes(user.studentId!);
              return {
                ...c,
                enrolledStudentIds: enrolled
                  ? c.enrolledStudentIds.filter((id) => id !== user.studentId)
                  : [...c.enrolledStudentIds, user.studentId!],
              };
            }
            return c;
          })
        );

        success(isEnrolled(competition) ? 'Inscrição cancelada' : 'Inscrito com sucesso!');
      } catch (err) {
        showError('Erro ao atualizar inscrição');
      } finally {
        setEnrolling(null);
      }
    },
    [user?.studentId, success, showError, isEnrolled]
  );

  // Get result for competition
  const getResult = useCallback(
    (competitionId: string) => {
      return results.find((r) => r.competitionId === competitionId);
    },
    [results]
  );

  // Filter competitions
  const upcomingCompetitions = competitions.filter((c) => c.status === 'upcoming' || c.status === 'ongoing');
  const pastCompetitions = competitions.filter((c) => c.status === 'completed');
  const myEnrolledCompetitions = competitions.filter((c) => isEnrolled(c) && c.status !== 'completed');

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
        <Skeleton variant="text" width="50%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="70%" height={18} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={isMobile ? 80 : 100} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rounded" height={40} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={isMobile ? 160 : 180} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
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
          <Tab label={isMobile ? `Próximas (${upcomingCompetitions.length})` : `Próximas (${upcomingCompetitions.length})`} />
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
              <Calendar size={isMobile ? 36 : 48} color="#ccc" />
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                Nenhuma competição agendada
              </Typography>
            </Box>
          ) : (
            upcomingCompetitions.map((competition) => {
              const enrolled = isEnrolled(competition);
              const deadlinePassed = competition.registrationDeadline
                ? isPast(new Date(competition.registrationDeadline))
                : false;

              return (
                <Box
                  key={competition.id}
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
                        <Typography variant="body2" sx={{ color: '#166534', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          Você está inscrito nesta competição
                        </Typography>
                      </Box>
                      {!deadlinePassed && (
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          size={isMobile ? 'small' : 'medium'}
                          startIcon={<UserX size={16} />}
                          onClick={() => handleToggleEnrollment(competition)}
                          disabled={enrolling === competition.id}
                          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        >
                          {enrolling === competition.id ? 'Cancelando...' : 'Cancelar Inscrição'}
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      size={isMobile ? 'small' : 'medium'}
                      startIcon={<UserCheck size={16} />}
                      onClick={() => handleToggleEnrollment(competition)}
                      disabled={enrolling === competition.id || deadlinePassed}
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
                    >
                      {enrolling === competition.id
                        ? 'Inscrevendo...'
                        : deadlinePassed
                        ? 'Inscrições Encerradas'
                        : 'Quero Participar'}
                    </Button>
                  )}
                </Box>
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
            myEnrolledCompetitions.map((competition) => (
              <Box
                key={competition.id}
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
                </Box>
              </Box>
            ))
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
              <Trophy size={isMobile ? 36 : 48} color="#ccc" />
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                Nenhuma competição no histórico
              </Typography>
            </Box>
          ) : (
            pastCompetitions.map((competition) => {
              const result = getResult(competition.id);

              return (
                <Box
                  key={competition.id}
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

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: result || isEnrolled(competition) ? 2 : 0 }}>
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
                  ) : isEnrolled(competition) ? (
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
                        Resultado pendente
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}
