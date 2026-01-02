'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  Chip,
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
}

function TimelineItem({ achievement, isLast }: TimelineItemProps) {
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
    <Box sx={{ display: 'flex', gap: 3 }}>
      {/* Timeline Line */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: config.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid',
            borderColor: config.color,
            zIndex: 1,
          }}
        >
          <Icon size={24} color={config.color} />
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 3,
              flex: 1,
              bgcolor: 'grey.200',
              mt: 1,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, pb: isLast ? 0 : 4 }}>
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: 2,
              borderColor: config.color,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
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
                fontSize: '0.7rem',
              }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {description}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar size={14} color="#999" />
            <Typography variant="caption" color="text.secondary">
              {format(new Date(achievement.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Typography>
          </Box>

          {/* Extra info for competition */}
          {achievement.type === 'competition' && achievement.position && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5">
                {achievement.position === 'gold'
                  ? '🥇'
                  : achievement.position === 'silver'
                  ? '🥈'
                  : achievement.position === 'bronze'
                  ? '🥉'
                  : '🎖️'}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {positionLabels[achievement.position]}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

// ============================================
// Main Component
// ============================================
export default function TimelinePage() {
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
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={300} height={24} />
        </Box>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 3, mb: 3 }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Skeleton variant="rounded" sx={{ flex: 1 }} height={120} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Linha do Tempo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sua jornada no jiu-jitsu
        </Typography>
      </Box>

      {/* Stats Summary */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Resumo das Conquistas
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: achievementConfig.graduation.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={20} color={achievementConfig.graduation.color} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {achievements.filter((a) => a.type === 'graduation').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Graduações
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: achievementConfig.stripe.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={20} color={achievementConfig.stripe.color} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {achievements.filter((a) => a.type === 'stripe').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Graus
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: achievementConfig.competition.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={20} color={achievementConfig.competition.color} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {achievements.filter((a) => a.type === 'competition').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Competições
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: achievementConfig.milestone.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={20} color={achievementConfig.milestone.color} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {achievements.filter((a) => a.type === 'milestone').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Marcos
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Timeline */}
      {achievements.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <History size={48} color="#ccc" />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Sua linha do tempo está vazia
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Suas conquistas aparecerão aqui conforme você progride
          </Typography>
        </Paper>
      ) : (
        years.map((year) => (
          <Box key={year} sx={{ mb: 4 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                mb: 3,
                pb: 1,
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                display: 'inline-block',
              }}
            >
              {year}
            </Typography>

            {groupedByYear[year].map((achievement, index) => (
              <TimelineItem
                key={achievement.id}
                achievement={achievement}
                isLast={index === groupedByYear[year].length - 1}
              />
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}
