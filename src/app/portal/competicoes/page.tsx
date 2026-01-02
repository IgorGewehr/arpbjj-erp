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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Medal,
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
        <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 3 }} />
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Competições
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Veja as competições disponíveis e seus resultados
        </Typography>
      </Box>

      {/* Medal Stats */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Minhas Conquistas
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2">🥇</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#FFD700' }}>
                {medalStats.gold}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ouros
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2">🥈</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#C0C0C0' }}>
                {medalStats.silver}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pratas
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2">🥉</Typography>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#CD7F32' }}>
                {medalStats.bronze}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bronzes
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2">🎖️</Typography>
              <Typography variant="h4" fontWeight={700} color="text.secondary">
                {medalStats.participations}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Participações
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ px: 2 }}>
          <Tab label={`Próximas (${upcomingCompetitions.length})`} />
          <Tab label={`Minhas Inscrições (${myEnrolledCompetitions.length})`} />
          <Tab label={`Histórico (${pastCompetitions.length})`} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Box>
          {upcomingCompetitions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <Calendar size={48} color="#ccc" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                Nenhuma competição agendada
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {upcomingCompetitions.map((competition) => {
                const enrolled = isEnrolled(competition);
                const deadlinePassed = competition.registrationDeadline
                  ? isPast(new Date(competition.registrationDeadline))
                  : false;

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={competition.id}>
                    <Card sx={{ borderRadius: 3, height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Trophy size={24} color="#1976d2" />
                            <Typography variant="h6" fontWeight={600}>
                              {competition.name}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={statusConfig[competition.status].label}
                            color={statusConfig[competition.status].color}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                              {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                              {competition.location}
                            </Typography>
                          </Box>
                          {competition.registrationDeadline && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Clock size={16} color={deadlinePassed ? '#DC2626' : '#666'} />
                              <Typography
                                variant="body2"
                                color={deadlinePassed ? 'error.main' : 'text.secondary'}
                              >
                                Inscrição até {format(new Date(competition.registrationDeadline), 'dd/MM/yyyy')}
                                {deadlinePassed && ' (encerrada)'}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        {enrolled ? (
                          <Box>
                            <Alert
                              severity="success"
                              icon={<CheckCircle size={20} />}
                              sx={{ mb: 2 }}
                            >
                              Você está inscrito nesta competição
                            </Alert>
                            {!deadlinePassed && (
                              <Button
                                variant="outlined"
                                color="error"
                                fullWidth
                                startIcon={<UserX size={18} />}
                                onClick={() => handleToggleEnrollment(competition)}
                                disabled={enrolling === competition.id}
                              >
                                {enrolling === competition.id ? 'Cancelando...' : 'Cancelar Inscrição'}
                              </Button>
                            )}
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<UserCheck size={18} />}
                            onClick={() => handleToggleEnrollment(competition)}
                            disabled={enrolling === competition.id || deadlinePassed}
                          >
                            {enrolling === competition.id
                              ? 'Inscrevendo...'
                              : deadlinePassed
                              ? 'Inscrições Encerradas'
                              : 'Quero Participar'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          {myEnrolledCompetitions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <UserCheck size={48} color="#ccc" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                Você não está inscrito em nenhuma competição
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Confira as próximas competições e faça sua inscrição
              </Typography>
              <Button variant="contained" onClick={() => setTabValue(0)}>
                Ver Competições
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {myEnrolledCompetitions.map((competition) => (
                <Grid size={{ xs: 12, md: 6 }} key={competition.id}>
                  <Card sx={{ borderRadius: 3, border: '2px solid', borderColor: 'success.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Trophy size={24} color="#16A34A" />
                          <Typography variant="h6" fontWeight={600}>
                            {competition.name}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          icon={<CheckCircle size={14} />}
                          label="Inscrito"
                          color="success"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar size={16} color="#666" />
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MapPin size={16} color="#666" />
                          <Typography variant="body2" color="text.secondary">
                            {competition.location}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          {pastCompetitions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
              <Trophy size={48} color="#ccc" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                Nenhuma competição no histórico
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {pastCompetitions.map((competition) => {
                const result = getResult(competition.id);

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={competition.id}>
                    <Card sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Trophy size={24} color="#666" />
                            <Typography variant="h6" fontWeight={600}>
                              {competition.name}
                            </Typography>
                          </Box>
                          <Chip size="small" label="Concluída" />
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                              {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MapPin size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                              {competition.location}
                            </Typography>
                          </Box>
                        </Box>

                        {result ? (
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: 'grey.50',
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <Typography variant="h3">
                              {positionConfig[result.position].icon}
                            </Typography>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {positionConfig[result.position].label}
                              </Typography>
                              {(result.ageCategory || result.weightCategory) && (
                                <Typography variant="caption" color="text.secondary">
                                  {[result.ageCategory, result.weightCategory].filter(Boolean).join(' - ')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ) : isEnrolled(competition) ? (
                          <Alert severity="info" icon={<AlertCircle size={18} />}>
                            Resultado pendente
                          </Alert>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Você não participou desta competição
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
}
