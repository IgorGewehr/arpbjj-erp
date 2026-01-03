'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Skeleton,
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
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { achievementService } from '@/services/achievementService';
import { Achievement } from '@/types';

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
  yellow: 'Amarela',
  orange: 'Laranja',
  green: 'Verde',
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
// Main Component
// ============================================
export default function TimelinePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { error: showError } = useFeedback();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  // Load achievements
  useEffect(() => {
    const loadData = async () => {
      if (!user?.studentId) {
        setLoading(false);
        return;
      }

      try {
        const data = await achievementService.getByStudent(user.studentId);
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
  }, [user?.studentId, showError]);

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
        <Skeleton variant="text" width="50%" height={28} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="60%" height={18} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={80} sx={{ mb: 3, borderRadius: 2 }} />
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: { xs: 1.5, sm: 3 }, mb: 2 }}>
            <Skeleton variant="circular" width={isMobile ? 36 : 48} height={isMobile ? 36 : 48} />
            <Skeleton variant="rounded" sx={{ flex: 1 }} height={isMobile ? 80 : 100} />
          </Box>
        ))}
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

      {/* Stats Summary */}
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
          Resumo das Conquistas
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'center' }, gap: { xs: 0.5, sm: 1 } }}>
            <Box
              sx={{
                width: { xs: 28, sm: 36 },
                height: { xs: 28, sm: 36 },
                borderRadius: 1.5,
                bgcolor: achievementConfig.graduation.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={isMobile ? 14 : 20} color={achievementConfig.graduation.color} />
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
                {achievements.filter((a) => a.type === 'graduation').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                Graduações
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'center' }, gap: { xs: 0.5, sm: 1 } }}>
            <Box
              sx={{
                width: { xs: 28, sm: 36 },
                height: { xs: 28, sm: 36 },
                borderRadius: 1.5,
                bgcolor: achievementConfig.stripe.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Star size={isMobile ? 14 : 20} color={achievementConfig.stripe.color} />
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
                {achievements.filter((a) => a.type === 'stripe').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                Graus
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'center' }, gap: { xs: 0.5, sm: 1 } }}>
            <Box
              sx={{
                width: { xs: 28, sm: 36 },
                height: { xs: 28, sm: 36 },
                borderRadius: 1.5,
                bgcolor: achievementConfig.competition.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Trophy size={isMobile ? 14 : 20} color={achievementConfig.competition.color} />
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
                {achievements.filter((a) => a.type === 'competition').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                Competições
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'center' }, gap: { xs: 0.5, sm: 1 } }}>
            <Box
              sx={{
                width: { xs: 28, sm: 36 },
                height: { xs: 28, sm: 36 },
                borderRadius: 1.5,
                bgcolor: achievementConfig.milestone.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Target size={isMobile ? 14 : 20} color={achievementConfig.milestone.color} />
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="body1" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.2 }}>
                {achievements.filter((a) => a.type === 'milestone').length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                Marcos
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

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
          <History size={isMobile ? 36 : 48} color="#ccc" />
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
              <TimelineItem
                key={achievement.id}
                achievement={achievement}
                isLast={index === groupedByYear[year].length - 1}
                isMobile={isMobile}
              />
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}
