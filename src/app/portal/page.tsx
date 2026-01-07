'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Skeleton, Paper, useTheme } from '@mui/material';
import Image from 'next/image';
import { ArrowRight, AlertTriangle, ClipboardCheck, History, Trophy, Calendar, Award, Timer, Flame } from 'lucide-react';
import { useAuth, usePermissions } from '@/components/providers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services';
import { attendanceService } from '@/services/attendanceService';
import { financialService } from '@/services';
import { competitionService } from '@/services/competitionService';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { PullToRefresh, FadeInView, ScaleOnPress } from '@/components/mobile';

const BELT_LABELS: Record<string, string> = {
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

export default function PortalHomePage() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { linkedStudentIds } = usePermissions();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeStatIndex, setActiveStatIndex] = useState(0);

  const studentId = linkedStudentIds[0];

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['student', studentId] });
    await queryClient.invalidateQueries({ queryKey: ['studentAttendance', studentId] });
    await queryClient.invalidateQueries({ queryKey: ['studentCompetitionResults', studentId] });
    await queryClient.invalidateQueries({ queryKey: ['studentPayments', studentId] });
  }, [queryClient, studentId]);

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  const { data: systemAttendanceCount = 0 } = useQuery({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => attendanceService.getStudentAttendanceCount(studentId),
    enabled: !!studentId,
  });

  // Get competition results for medals
  const { data: competitionResults = [] } = useQuery({
    queryKey: ['studentCompetitionResults', studentId],
    queryFn: () => competitionService.getResultsForStudent(studentId!),
    enabled: !!studentId,
  });

  // Calculate medal stats
  const medalStats = useMemo(() => {
    const stats = { gold: 0, silver: 0, bronze: 0, total: 0 };
    competitionResults.forEach((result) => {
      if (result.position === 'gold') stats.gold++;
      else if (result.position === 'silver') stats.silver++;
      else if (result.position === 'bronze') stats.bronze++;
    });
    stats.total = stats.gold + stats.silver + stats.bronze;
    return stats;
  }, [competitionResults]);

  // Total attendance = system count + initial count (previous workouts from other gyms/periods)
  const attendanceCount = systemAttendanceCount + (student?.initialAttendanceCount || 0);

  const hasPlan = !!student?.planId;

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['studentPayments', studentId],
    queryFn: async () => {
      const payments = await financialService.getByStudent(studentId);
      return payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
    },
    enabled: !!studentId && hasPlan,
  });

  const trainingMonths = useMemo(() => {
    if (!student) return 0;
    const start = new Date(student.startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }, [student]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const displayName = student?.nickname || student?.fullName?.split(' ')[0] || user?.displayName || 'Aluno';

  // Stats for carousel
  const statsCards = useMemo(() => [
    {
      id: 'attendance',
      value: attendanceCount,
      label: 'Treinos',
      icon: Flame,
      color: '#FF6B35',
      bgColor: 'rgba(255, 107, 53, 0.1)',
    },
    {
      id: 'months',
      value: trainingMonths,
      label: 'Meses de Tatame',
      icon: Timer,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    {
      id: 'competitions',
      value: competitionResults.length,
      label: 'Competicoes',
      icon: Trophy,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
  ], [attendanceCount, trainingMonths, competitionResults.length]);

  // Handle scroll for stats carousel
  const handleStatsScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth * 0.7 + 12;
    const newIndex = Math.round(container.scrollLeft / cardWidth);
    if (newIndex !== activeStatIndex && newIndex >= 0 && newIndex < statsCards.length) {
      setActiveStatIndex(newIndex);
    }
  }, [activeStatIndex, statsCards.length]);

  const scrollToStatIndex = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth * 0.7 + 12;
    container.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
  }, []);

  const quickLinks = [
    { label: 'Presencas', path: '/portal/presenca', icon: ClipboardCheck },
    { label: 'Historico', path: '/portal/linha-do-tempo', icon: History },
    { label: 'Competicoes', path: '/portal/competicoes', icon: Trophy },
    { label: 'Horarios', path: '/portal/horarios', icon: Calendar },
  ];

  if (loadingStudent) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box sx={{ position: 'relative', minHeight: '100%', overflowY: { xs: 'hidden', md: 'visible' } }}>
        {/* Background Logo - Mobile Only */}
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80vw',
            height: '80vw',
            maxWidth: 350,
            maxHeight: 350,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.04,
          }}
        >
          <Image
            src="/logo_login.png"
            alt=""
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </Box>

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <FadeInView direction="down" delay={0}>
          <Box sx={{ mb: 2.5 }}>
            <Typography
              variant="h5"
              fontWeight={700}
              color="text.primary"
              sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
            >
              {greeting}, {displayName}!
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <BeltDisplay belt={student?.currentBelt || 'white'} stripes={student?.currentStripes || 0} size="small" />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Faixa {BELT_LABELS[student?.currentBelt || 'white']}
                {(student?.currentStripes || 0) > 0 && ` • ${student?.currentStripes} grau${(student?.currentStripes || 0) > 1 ? 's' : ''}`}
              </Typography>
            </Box>
          </Box>
        </FadeInView>

        {/* Pending Payment Alert */}
        {hasPlan && pendingPayments.length > 0 && (
          <FadeInView direction="up" delay={100}>
            <ScaleOnPress>
              <Paper
                elevation={0}
                onClick={() => router.push('/portal/financeiro')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  mb: 2.5,
                  bgcolor: '#FEF3C7',
                  borderRadius: 2.5,
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={18} color="#D97706" />
                <Typography variant="body2" sx={{ flex: 1, color: '#92400E', fontSize: '0.8rem', fontWeight: 500 }}>
                  {pendingPayments.length} pagamento{pendingPayments.length > 1 ? 's' : ''} pendente{pendingPayments.length > 1 ? 's' : ''}
                </Typography>
                <ArrowRight size={16} color="#D97706" />
              </Paper>
            </ScaleOnPress>
          </FadeInView>
        )}

        {/* Stats Carousel */}
        <FadeInView direction="up" delay={150}>
          <Box sx={{ mb: 2.5 }}>
            <Box
              ref={scrollContainerRef}
              onScroll={handleStatsScroll}
              sx={{
                display: 'flex',
                gap: 1.5,
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                pb: 1,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}
            >
              {statsCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Paper
                    key={stat.id}
                    elevation={0}
                    sx={{
                      flex: '0 0 70%',
                      minWidth: '70%',
                      scrollSnapAlign: 'start',
                      p: 2.5,
                      borderRadius: 3,
                      bgcolor: '#fff',
                      border: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: stat.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5,
                      }}
                    >
                      <Icon size={22} color={stat.color} />
                    </Box>
                    <Typography variant="h3" fontWeight={700} sx={{ color: 'text.primary', fontSize: '2rem', lineHeight: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {stat.label}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>

            {/* Carousel Dots */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
              {statsCards.map((stat, index) => (
                <Box
                  key={stat.id}
                  onClick={() => scrollToStatIndex(index)}
                  sx={{
                    width: index === activeStatIndex ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: index === activeStatIndex ? '#111' : 'grey.300',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </Box>
          </Box>
        </FadeInView>

        {/* Medals Display (only if has medals) */}
        {medalStats.total > 0 && (
          <FadeInView direction="up" delay={200}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 2.5,
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Medalhas
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, mt: 1.5 }}>
                {medalStats.gold > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ fontSize: '1.5rem' }}>🥇</Box>
                    <Typography variant="h6" fontWeight={700}>{medalStats.gold}</Typography>
                  </Box>
                )}
                {medalStats.silver > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ fontSize: '1.5rem' }}>🥈</Box>
                    <Typography variant="h6" fontWeight={700}>{medalStats.silver}</Typography>
                  </Box>
                )}
                {medalStats.bronze > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ fontSize: '1.5rem' }}>🥉</Box>
                    <Typography variant="h6" fontWeight={700}>{medalStats.bronze}</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </FadeInView>
        )}

        {/* Quick Links Grid */}
        <FadeInView direction="up" delay={250}>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Acesso rapido
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {quickLinks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <ScaleOnPress key={item.path}>
                    <Paper
                      elevation={0}
                      onClick={() => router.push(item.path)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 2.5,
                        px: 2,
                        bgcolor: '#fff',
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: 'grey.50', borderColor: 'grey.300' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1,
                        }}
                      >
                        <Icon size={24} color="#444" strokeWidth={1.5} />
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ fontWeight: 500, fontSize: '0.85rem' }}
                      >
                        {item.label}
                      </Typography>
                    </Paper>
                  </ScaleOnPress>
                );
              })}
            </Box>
          </Box>
        </FadeInView>
        </Box>
      </Box>
    </PullToRefresh>
  );
}
