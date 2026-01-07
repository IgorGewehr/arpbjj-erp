'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Award,
  Trophy,
  Target,
  Calendar,
  Star,
  Dumbbell,
  Clock,
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { achievementService } from '@/services/achievementService';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { competitionService } from '@/services/competitionService';
import { Achievement } from '@/types';
import { FadeIn, ListItemAnimation } from '@/components/common/AnimatedComponents';
import { TimelineSkeleton, StatsCardSkeleton } from '@/components/common/SkeletonComponents';
import { EmptyTimelineIllustration } from '@/components/common/EmptyStateIllustrations';

// ============================================
// Achievement Icon Config
// ============================================
const achievementConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  graduation: { icon: Award, color: '#7C3AED', bgColor: '#EDE9FE' },
  stripe: { icon: Star, color: '#EAB308', bgColor: '#FEF9C3' },
  competition: { icon: Trophy, color: '#F59E0B', bgColor: '#FEF3C7' },
  milestone: { icon: Target, color: '#10B981', bgColor: '#D1FAE5' },
};

// ============================================
// Belt Labels
// ============================================
const beltLabels: Record<string, string> = {
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
  grey: 'Cinza',
  'grey-white': 'Cinza/Branca',
  'grey-black': 'Cinza/Preta',
  yellow: 'Amarela',
  'yellow-white': 'Amarela/Branca',
  'yellow-black': 'Amarela/Preta',
  orange: 'Laranja',
  'orange-white': 'Laranja/Branca',
  'orange-black': 'Laranja/Preta',
  green: 'Verde',
  'green-white': 'Verde/Branca',
  'green-black': 'Verde/Preta',
};

// ============================================
// Position Config
// ============================================
const positionLabels: Record<string, string> = {
  gold: 'Ouro',
  silver: 'Prata',
  bronze: 'Bronze',
  participant: 'Participante',
};

// ============================================
// Timeline Item Component
// ============================================
interface TimelineItemProps {
  achievement: Achievement;
  isLast: boolean;
  isMobile: boolean;
}

function TimelineItem({ achievement, isLast, isMobile }: TimelineItemProps) {
  const config = achievementConfig[achievement.type] || achievementConfig.milestone;
  const Icon = config.icon;

  // Build description based on type
  let description = achievement.description || '';
  if (!description) {
    if (achievement.type === 'graduation') {
      description = `Graduação para Faixa ${beltLabels[achievement.toBelt || ''] || achievement.toBelt}`;
    } else if (achievement.type === 'stripe') {
      const stripeNum = achievement.toStripes || 0;
      description = `${stripeNum}º grau na Faixa ${beltLabels[achievement.toBelt || achievement.fromBelt || ''] || ''}`;
    } else if (achievement.type === 'competition') {
      description = achievement.competitionName
        ? `${positionLabels[achievement.position || 'participant']} - ${achievement.competitionName}`
        : achievement.title;
    } else {
      description = achievement.title;
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 3 } }}>
      {/* Timeline Line */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            width: { xs: 36, sm: 48 },
            height: { xs: 36, sm: 48 },
            borderRadius: '50%',
            bgcolor: config.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid',
            borderColor: config.color,
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <Icon size={isMobile ? 18 : 24} color={config.color} />
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: 'grey.200',
              mt: 1,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, pb: isLast ? 0 : 3, minWidth: 0 }}>
        <Box
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            borderRadius: 2,
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
            <Typography
              variant="body1"
              fontWeight={600}
              sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, flex: 1, minWidth: 0 }}
            >
              {achievement.title}
            </Typography>
            <Chip
              size="small"
              label={
                achievement.type === 'graduation'
                  ? 'Graduação'
                  : achievement.type === 'stripe'
                  ? 'Grau'
                  : achievement.type === 'competition'
                  ? 'Competição'
                  : 'Marco'
              }
              sx={{
                bgcolor: config.bgColor,
                color: config.color,
                fontWeight: 600,
                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                height: { xs: 20, sm: 24 },
                flexShrink: 0,
              }}
            />
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            {description}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Calendar size={12} color="#999" />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
              {format(new Date(achievement.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Typography>
          </Box>

          {/* Extra info for competition */}
          {achievement.type === 'competition' && achievement.position && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, lineHeight: 1 }}>
                {achievement.position === 'gold'
                  ? '🥇'
                  : achievement.position === 'silver'
                  ? '🥈'
                  : achievement.position === 'bronze'
                  ? '🥉'
                  : '🎖️'}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                {positionLabels[achievement.position]}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ============================================
// Format training time helper
// ============================================
function formatTrainingTime(startDate: Date): string {
  const now = new Date();
  const years = differenceInYears(now, startDate);
  const totalMonths = differenceInMonths(now, startDate);
  const months = totalMonths % 12;

  if (years === 0) {
    if (months === 0) return 'Menos de 1 mes';
    return months === 1 ? '1 mes' : `${months} meses`;
  }

  if (months === 0) {
    return years === 1 ? '1 ano' : `${years} anos`;
  }

  const yearText = years === 1 ? '1 ano' : `${years} anos`;
  const monthText = months === 1 ? '1 mes' : `${months} meses`;
  return `${yearText} e ${monthText}`;
}

// ============================================
// Main Component
// ============================================
export default function TimelinePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { error: showError } = useFeedback();

  const studentId = user?.studentId;

  // Fetch student data
  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId!),
    enabled: !!studentId,
  });

  // Fetch system attendance count
  const { data: systemAttendanceCount = 0 } = useQuery({
    queryKey: ['studentAttendanceCount', studentId],
    queryFn: () => attendanceService.getStudentAttendanceCount(studentId!),
    enabled: !!studentId,
  });

  // Calculate total attendance (system + initial)
  const totalAttendance = useMemo(() => {
    return systemAttendanceCount + (student?.initialAttendanceCount || 0);
  }, [systemAttendanceCount, student?.initialAttendanceCount]);

  // Calculate training time
  const trainingTime = useMemo(() => {
    const startDate = student?.jiujitsuStartDate || student?.startDate;
    if (!startDate) return null;
    return formatTrainingTime(new Date(startDate));
  }, [student?.jiujitsuStartDate, student?.startDate]);

  // Get the start date for display
  const startDateDisplay = useMemo(() => {
    const startDate = student?.jiujitsuStartDate || student?.startDate;
    if (!startDate) return null;
    return format(new Date(startDate), "MMMM 'de' yyyy", { locale: ptBR });
  }, [student?.jiujitsuStartDate, student?.startDate]);

  // Fetch competition results
  const { data: competitionResults = [] } = useQuery({
    queryKey: ['studentCompetitionResults', studentId],
    queryFn: () => competitionService.getResultsForStudent(studentId!),
    enabled: !!studentId,
  });

  // Calculate medal stats
  const medalStats = useMemo(() => {
    const stats = { gold: 0, silver: 0, bronze: 0, total: 0, competitions: 0 };
    if (!competitionResults.length) return stats;

    stats.competitions = competitionResults.length;
    competitionResults.forEach((r) => {
      if (r.position === 'gold') stats.gold++;
      else if (r.position === 'silver') stats.silver++;
      else if (r.position === 'bronze') stats.bronze++;
    });
    stats.total = stats.gold + stats.silver + stats.bronze;
    return stats;
  }, [competitionResults]);

  // Check if has any medals (for conditional display)
  const hasMedals = medalStats.total > 0;

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Load achievements
  useEffect(() => {
    const loadData = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        const data = await achievementService.getByStudent(studentId);
        // Sort by date descending
        const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAchievements(sorted);
      } catch (err) {
        showError('Erro ao carregar conquistas');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, showError]);

  // Group achievements by year
  const groupedByYear = achievements.reduce(
    (acc, achievement) => {
      const year = new Date(achievement.date).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(achievement);
      return acc;
    },
    {} as Record<number, Achievement[]>
  );

  const years = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a);

  if (loading) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ width: '50%', height: 24, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
          <Box sx={{ width: '60%', height: 16, bgcolor: 'grey.100', borderRadius: 1 }} />
        </Box>
        <StatsCardSkeleton />
        <Box sx={{ mt: 3 }}>
          <TimelineSkeleton count={3} />
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
            Linha do Tempo
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Sua jornada no jiu-jitsu
          </Typography>
        </Box>

      {/* Journey Card */}
      {student && (
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
            Sua Jornada
          </Typography>

          {/* Main Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 2, sm: 2.5 } }}>
            {/* Current Belt + Stripes */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 44 },
                  height: { xs: 36, sm: 44 },
                  borderRadius: 2,
                  bgcolor: '#EDE9FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={isMobile ? 18 : 22} color="#7C3AED" />
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                  {beltLabels[student.currentBelt] || student.currentBelt}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  {student.currentStripes > 0 ? `${student.currentStripes} grau${student.currentStripes > 1 ? 's' : ''}` : 'Faixa Atual'}
                </Typography>
              </Box>
            </Box>

            {/* Total Workouts */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 44 },
                  height: { xs: 36, sm: 44 },
                  borderRadius: 2,
                  bgcolor: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Dumbbell size={isMobile ? 18 : 22} color="#16A34A" />
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.35rem' }, lineHeight: 1.2 }}>
                  {totalAttendance}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Treinos
                </Typography>
              </Box>
            </Box>

            {/* Training Time */}
            {trainingTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
                <Box
                  sx={{
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                    borderRadius: 2,
                    bgcolor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={isMobile ? 18 : 22} color="#2563EB" />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' }, lineHeight: 1.2 }}>
                    {trainingTime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    Tempo de Tatame
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Competitions Count */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
              <Box
                sx={{
                  width: { xs: 36, sm: 44 },
                  height: { xs: 36, sm: 44 },
                  borderRadius: 2,
                  bgcolor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trophy size={isMobile ? 18 : 22} color="#D97706" />
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.35rem' }, lineHeight: 1.2 }}>
                  {medalStats.competitions}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  Campeonatos
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Medal Display - Only show if has medals */}
          {hasMedals && (
            <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid', borderColor: 'grey.100' }}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  display: 'block',
                  fontSize: { xs: '0.65rem', sm: '0.7rem' },
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Medalhas
              </Typography>
              <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
                {medalStats.gold > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1 }}>
                      🥇
                    </Typography>
                    <Box>
                      <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, lineHeight: 1 }}>
                        {medalStats.gold}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        Ouro
                      </Typography>
                    </Box>
                  </Box>
                )}
                {medalStats.silver > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1 }}>
                      🥈
                    </Typography>
                    <Box>
                      <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, lineHeight: 1 }}>
                        {medalStats.silver}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        Prata
                      </Typography>
                    </Box>
                  </Box>
                )}
                {medalStats.bronze > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, lineHeight: 1 }}>
                      🥉
                    </Typography>
                    <Box>
                      <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, lineHeight: 1 }}>
                        {medalStats.bronze}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
                        Bronze
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Timeline */}
      {achievements.length === 0 ? (
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
          <EmptyTimelineIllustration size={isMobile ? 80 : 100} />
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 2, fontSize: { xs: '0.9rem', sm: '1rem' } }}
          >
            Sua linha do tempo está vazia
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Suas conquistas aparecerão aqui conforme você progride
          </Typography>
        </Box>
      ) : (
        years.map((year) => (
          <Box key={year} sx={{ mb: 3 }}>
            <Typography
              variant="body1"
              fontWeight={700}
              sx={{
                mb: 2,
                pb: 0.75,
                borderBottom: '2px solid',
                borderColor: '#111',
                display: 'inline-block',
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
              }}
            >
              {year}
            </Typography>

            {groupedByYear[year].map((achievement, index) => (
              <ListItemAnimation key={achievement.id} index={index}>
                <TimelineItem
                  achievement={achievement}
                  isLast={index === groupedByYear[year].length - 1}
                  isMobile={isMobile}
                />
              </ListItemAnimation>
            ))}
          </Box>
        ))
      )}
      </Box>
    </FadeIn>
  );
}
