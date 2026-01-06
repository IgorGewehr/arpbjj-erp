'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Card,
  CardContent,
  Skeleton,
  LinearProgress,
  Divider,
  Button,
  IconButton,
} from '@mui/material';
import {
  Award,
  Calendar,
  Clock,
  Trophy,
  Medal,
  Target,
  TrendingUp,
  Share2,
  Download,
  ExternalLink,
  CheckCircle,
  GraduationCap,
  Users,
} from 'lucide-react';
import { studentService } from '@/services';
import { achievementService } from '@/services/achievementService';
import { attendanceService } from '@/services/attendanceService';
import { Student, Achievement, BeltColor, KidsBeltColor } from '@/types';

// ============================================
// Constants
// ============================================
const BELT_COLORS: Record<BeltColor | KidsBeltColor, { bg: string; text: string; label: string }> = {
  white: { bg: '#f5f5f5', text: '#333', label: 'Branca' },
  blue: { bg: '#1E40AF', text: '#fff', label: 'Azul' },
  purple: { bg: '#7C3AED', text: '#fff', label: 'Roxa' },
  brown: { bg: '#78350F', text: '#fff', label: 'Marrom' },
  black: { bg: '#171717', text: '#fff', label: 'Preta' },
  grey: { bg: '#6B7280', text: '#fff', label: 'Cinza' },
  'grey-white': { bg: '#6B7280', text: '#fff', label: 'Cinza/Branca' },
  yellow: { bg: '#EAB308', text: '#333', label: 'Amarela' },
  'yellow-white': { bg: '#EAB308', text: '#333', label: 'Amarela/Branca' },
  orange: { bg: '#EA580C', text: '#fff', label: 'Laranja' },
  'orange-white': { bg: '#EA580C', text: '#fff', label: 'Laranja/Branca' },
  green: { bg: '#16A34A', text: '#fff', label: 'Verde' },
  'green-white': { bg: '#16A34A', text: '#fff', label: 'Verde/Branca' },
};

// ============================================
// Loading Skeleton
// ============================================
function ProfileSkeleton() {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2, py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
          <Skeleton variant="circular" width={120} height={120} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="30%" />
          </Box>
        </Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}

// ============================================
// Belt Badge Component
// ============================================
interface BeltBadgeProps {
  belt: BeltColor | KidsBeltColor;
  stripes: number;
  size?: 'small' | 'medium' | 'large';
}

function BeltBadge({ belt, stripes, size = 'medium' }: BeltBadgeProps) {
  const beltInfo = BELT_COLORS[belt] || BELT_COLORS.white;
  const sizeMap = {
    small: { px: 2, py: 0.5, fontSize: '0.75rem' },
    medium: { px: 3, py: 1, fontSize: '0.9rem' },
    large: { px: 4, py: 1.5, fontSize: '1rem' },
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: beltInfo.bg,
        color: beltInfo.text,
        borderRadius: 2,
        fontWeight: 600,
        border: belt === 'white' ? '2px solid #e5e5e5' : 'none',
        ...sizeMap[size],
      }}
    >
      <Award size={size === 'small' ? 14 : size === 'medium' ? 18 : 22} />
      <span>Faixa {beltInfo.label}</span>
      {stripes > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, ml: 0.5 }}>
          {Array.from({ length: stripes }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: size === 'small' ? 6 : 8,
                height: size === 'small' ? 2 : 3,
                bgcolor: 'currentColor',
                opacity: 0.9,
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ============================================
// Stat Card Component
// ============================================
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, sublabel, color = '#2563EB' }: StatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' },
      }}
    >
      <CardContent sx={{ textAlign: 'center' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
          }}
        >
          <Icon size={24} color={color} />
        </Box>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {sublabel && (
          <Typography variant="caption" color="text.disabled">
            {sublabel}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Achievement Card Component
// ============================================
interface AchievementCardProps {
  achievement: Achievement;
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const getMedalColor = (medal?: string) => {
    switch (medal) {
      case 'gold':
        return '#EAB308';
      case 'silver':
        return '#9CA3AF';
      case 'bronze':
        return '#B45309';
      default:
        return '#2563EB';
    }
  };

  const isCompetition = achievement.type === 'competition';
  const color = isCompetition ? getMedalColor(achievement.position) : '#16A34A';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}15`,
            }}
          >
            {isCompetition ? (
              <Trophy size={24} color={color} />
            ) : (
              <Medal size={24} color={color} />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {achievement.title}
            </Typography>
            {achievement.description && (
              <Typography variant="body2" color="text.secondary">
                {achievement.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              {new Date(achievement.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================
export default function PublicProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch student data
        const studentData = await studentService.getById(studentId);
        if (!studentData) {
          setError('Perfil nao encontrado');
          return;
        }
        setStudent(studentData);

        // Fetch public achievements
        const achievementsData = await achievementService.getPublic(studentId);
        setAchievements(achievementsData);

        // Fetch attendance count
        const count = await attendanceService.getStudentAttendanceCount(studentId);
        setAttendanceCount(count);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      loadData();
    }
  }, [studentId]);

  // Share functionality
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: `Perfil de ${student?.fullName}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !student) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {error || 'Perfil nao encontrado'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            O perfil que voce esta procurando nao existe ou nao esta disponivel publicamente.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Calculate training duration
  const startDate = new Date(student.startDate);
  const now = new Date();
  const monthsTraining = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const yearsTraining = Math.floor(monthsTraining / 12);
  const remainingMonths = monthsTraining % 12;

  // Medal counts
  const medals = {
    gold: achievements.filter((a) => a.position === 'gold').length,
    silver: achievements.filter((a) => a.position === 'silver').length,
    bronze: achievements.filter((a) => a.position === 'bronze').length,
  };
  const totalMedals = medals.gold + medals.silver + medals.bronze;
  const promotions = achievements.filter((a) => a.type === 'graduation' || a.type === 'stripe').length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: 2 }}>
        {/* Header */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Avatar
                src={student.photoUrl}
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: '3rem',
                  bgcolor: 'primary.main',
                }}
              >
                {student.fullName[0]}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {student.fullName}
                </Typography>
                {student.nickname && (
                  <Typography variant="h6" color="text.secondary">
                    "{student.nickname}"
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <BeltBadge
                    belt={student.currentBelt as BeltColor | KidsBeltColor}
                    stripes={student.currentStripes}
                    size="large"
                  />
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleShare}>
                <Share2 size={20} />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Stats Grid */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                icon={Calendar}
                label="Tempo de Treino"
                value={yearsTraining > 0 ? `${yearsTraining}a ${remainingMonths}m` : `${monthsTraining}m`}
                sublabel={`Desde ${startDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                icon={CheckCircle}
                label="Presencas"
                value={attendanceCount}
                color="#16A34A"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                icon={Trophy}
                label="Medalhas"
                value={totalMedals}
                sublabel={totalMedals > 0 ? `${medals.gold}O ${medals.silver}P ${medals.bronze}B` : undefined}
                color="#EAB308"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                icon={TrendingUp}
                label="Graduacoes"
                value={promotions}
                color="#7C3AED"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Medal Summary */}
        {totalMedals > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Medalhas em Competicoes
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: '#FEF3C7',
                    borderRadius: 2,
                  }}
                >
                  <Trophy size={32} color="#EAB308" />
                  <Typography variant="h4" fontWeight={700} color="#B45309">
                    {medals.gold}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ouro
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: '#F3F4F6',
                    borderRadius: 2,
                  }}
                >
                  <Trophy size={32} color="#9CA3AF" />
                  <Typography variant="h4" fontWeight={700} color="#6B7280">
                    {medals.silver}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prata
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: '#FEF3E2',
                    borderRadius: 2,
                  }}
                >
                  <Trophy size={32} color="#B45309" />
                  <Typography variant="h4" fontWeight={700} color="#92400E">
                    {medals.bronze}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bronze
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Achievements Timeline */}
        {achievements.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Conquistas
            </Typography>
            <Grid container spacing={2}>
              {achievements.map((achievement) => (
                <Grid key={achievement.id} size={{ xs: 12, sm: 6 }}>
                  <AchievementCard achievement={achievement} />
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {achievements.length === 0 && (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Target size={48} color="#9CA3AF" />
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
              Nenhuma conquista publica ainda
            </Typography>
            <Typography variant="body2" color="text.disabled">
              As conquistas aparecerao aqui quando forem publicadas.
            </Typography>
          </Paper>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.7 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <GraduationCap size={20} />
            <Typography variant="body2" color="text.secondary">
              Powered by MarcusJJ Academia
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
