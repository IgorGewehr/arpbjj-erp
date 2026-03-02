'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Skeleton, Paper } from '@mui/material';
import Image from 'next/image';
import {
  ArrowRight,
  AlertTriangle,
  ClipboardCheck,
  History,
  Trophy,
  Calendar,
  Award,
  Timer,
  Flame,
  Star,
  CreditCard,
  ShoppingBag,
  MapPin,
  CalendarDays,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, usePermissions } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createStudentService, createFinancialService, createClassService, createAssessmentService } from '@/services';
import { createPlanService } from '@/services/planService';
import { createAttendanceService } from '@/services/attendanceService';
import { createCompetitionService } from '@/services/competitionService';
import { createCheckinService, isInCheckinWindow } from '@/services/checkinService';
import { useAcademySettings } from '@/hooks/useAcademySettings';
import { GradeDisplay } from '@/components/shared/GradeDisplay';
import { AcademyIndicator } from '@/components/portal/AcademyIndicator';
import { PullToRefresh, FadeInView, ScaleOnPress } from '@/components/mobile';
import { getStudentSports, getStudentGrade, getStudentPrimarySport } from '@/types';
import { SPORTS, SportId } from '@/lib/constants/sports';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

const SCORE_LABELS: Record<string, string> = {
  respeito: 'Respeito',
  disciplina: 'Disciplina',
  pontualidade: 'Pontualidade',
  tecnica: 'Tecnica',
  esforco: 'Esforco',
};

const SCORE_COLORS: Record<string, string> = {
  respeito: '#3B82F6',
  disciplina: '#8B5CF6',
  pontualidade: '#F59E0B',
  tecnica: '#10B981',
  esforco: '#EF4444',
};

export default function PortalHomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { academyId } = useAcademy();
  const { linkedStudentIds } = usePermissions();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const { settings: academySettings } = useAcademySettings();

  const studentId = linkedStudentIds[0];

  // ============================================
  // Data Queries
  // ============================================

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student', studentId, academyId],
    queryFn: () => {
      if (!academyId) return null;
      return createStudentService(academyId).getById(studentId);
    },
    enabled: !!studentId && !!academyId,
  });

  const { data: systemAttendanceCount = 0 } = useQuery({
    queryKey: ['studentAttendance', studentId, academyId],
    queryFn: () => {
      if (!academyId) return 0;
      return createAttendanceService(academyId).getStudentAttendanceCount(studentId);
    },
    enabled: !!studentId && !!academyId,
  });

  const { data: competitionResults = [] } = useQuery({
    queryKey: ['studentCompetitionResults', studentId, academyId],
    queryFn: () => {
      if (!academyId) return [];
      return createCompetitionService(academyId).getResultsForStudent(studentId!);
    },
    enabled: !!studentId && !!academyId,
  });

  const { data: studentPlans = [] } = useQuery({
    queryKey: ['studentPlans', studentId, academyId],
    queryFn: () => {
      if (!academyId) return [];
      return createPlanService(academyId).getPlansForStudent(studentId);
    },
    enabled: !!studentId && !!academyId,
  });

  const hasPlan = studentPlans.length > 0;

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['studentPayments', studentId, academyId],
    queryFn: async () => {
      if (!academyId) return [];
      const payments = await createFinancialService(academyId).getByStudent(studentId);
      return payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
    },
    enabled: !!studentId && !!academyId && hasPlan,
  });

  // New: All classes (for next class card)
  const { data: allClasses = [] } = useQuery({
    queryKey: ['allClasses', academyId],
    queryFn: () => {
      if (!academyId) return [];
      return createClassService(academyId).list();
    },
    enabled: !!academyId,
  });

  // New: Attendance history (for streak + monthly count)
  const { data: attendanceHistory = [] } = useQuery({
    queryKey: ['studentAttendanceHistory', studentId, academyId],
    queryFn: () => {
      if (!academyId) return [];
      return createAttendanceService(academyId).getByStudent(studentId, 200);
    },
    enabled: !!studentId && !!academyId,
  });

  // New: Latest assessment (kids only)
  const isKidsCategory = student?.category === 'kids';
  const { data: latestAssessment } = useQuery({
    queryKey: ['latestAssessment', studentId, academyId],
    queryFn: () => {
      if (!academyId) return null;
      return createAssessmentService(academyId).getLatest(studentId);
    },
    enabled: !!studentId && !!academyId && isKidsCategory,
  });

  // New: Upcoming competitions
  const { data: upcomingCompetitions = [] } = useQuery({
    queryKey: ['upcomingCompetitions', academyId],
    queryFn: () => {
      if (!academyId) return [];
      return createCompetitionService(academyId).getUpcoming();
    },
    enabled: !!academyId,
  });

  // ============================================
  // Computed Values
  // ============================================

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

  const attendanceCount = systemAttendanceCount + (student?.initialAttendanceCount || 0);

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

  // Improved: Financial alert (overdue vs pending)
  const financialAlert = useMemo(() => {
    if (!hasPlan || pendingPayments.length === 0) return null;
    const overduePayments = pendingPayments.filter((p) => p.status === 'overdue');
    const totalAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount);
    const hasOverdue = overduePayments.length > 0;
    return {
      hasOverdue,
      count: hasOverdue ? overduePayments.length : pendingPayments.length,
      total: formattedTotal,
      label: hasOverdue ? 'em atraso' : (pendingPayments.length > 1 ? 'pendentes' : 'pendente'),
      bgColor: hasOverdue ? '#FEE2E2' : '#FEF3C7',
      textColor: hasOverdue ? '#991B1B' : '#92400E',
      iconColor: hasOverdue ? '#DC2626' : '#D97706',
    };
  }, [hasPlan, pendingPayments]);

  // New: Next class computation
  const nextClass = useMemo(() => {
    if (!studentId) return null;
    const studentClasses = allClasses.filter((c) => c.studentIds?.includes(studentId) && c.isActive);
    if (studentClasses.length === 0) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMin;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);
      const targetDow = targetDate.getDay();

      for (const cls of studentClasses) {
        if (!cls.schedule) continue;
        for (const sched of cls.schedule) {
          if (sched.dayOfWeek !== targetDow) continue;

          // If today, skip classes that already ended
          if (dayOffset === 0) {
            const [endH, endM] = sched.endTime.split(':').map(Number);
            if (currentTimeMinutes > endH * 60 + endM) continue;
          }

          return {
            class: cls,
            schedule: sched,
            date: targetDate,
            isToday: dayOffset === 0,
            dayLabel: dayOffset === 0 ? 'Hoje' : dayOffset === 1 ? 'Amanha' : DAY_LABELS[targetDow],
          };
        }
      }
    }
    return null;
  }, [allClasses, studentId]);

  // New: Check-in status
  const { data: hasCheckedIn = false } = useQuery({
    queryKey: ['checkinStatus', studentId, nextClass?.class.id, academyId],
    queryFn: () => {
      if (!academyId || !nextClass) return false;
      return createCheckinService(academyId).hasCheckin(studentId, nextClass.class.id, nextClass.date);
    },
    enabled: !!nextClass?.isToday && !!academySettings?.studentCheckinEnabled && !!academyId && !!studentId,
  });

  // New: Streak (consecutive weeks with >= 1 attendance)
  const streak = useMemo(() => {
    if (attendanceHistory.length === 0) return 0;

    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      // Adjust to Monday-based week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
      return `${d.getFullYear()}-${weekNum}`;
    };

    const weekKeys = new Set(attendanceHistory.map((a) => getWeekKey(new Date(a.date))));

    const now = new Date();
    let currentWeekKey = getWeekKey(now);
    let count = 0;

    // Start from current week, but if current week has no attendance yet, start from previous
    if (!weekKeys.has(currentWeekKey)) {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      currentWeekKey = getWeekKey(lastWeek);
      if (!weekKeys.has(currentWeekKey)) return 0;
    }

    // Count consecutive weeks backwards
    const checkDate = new Date(now);
    if (!weekKeys.has(getWeekKey(now))) {
      checkDate.setDate(checkDate.getDate() - 7);
    }

    for (let i = 0; i < 52; i++) {
      const d = new Date(checkDate);
      d.setDate(d.getDate() - i * 7);
      if (weekKeys.has(getWeekKey(d))) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }, [attendanceHistory]);

  // New: Monthly training count
  const monthlyTrainings = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return attendanceHistory.filter((a) => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [attendanceHistory]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { month: 'long' });
  }, []);

  // New: Next competition
  const nextCompetition = useMemo(() => {
    if (upcomingCompetitions.length === 0) return null;
    const sorted = [...upcomingCompetitions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const comp = sorted[0];
    const daysUntil = Math.ceil((new Date(comp.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isEnrolled = comp.enrolledStudentIds?.includes(studentId) || false;
    return { ...comp, daysUntil, isEnrolled };
  }, [upcomingCompetitions, studentId]);

  // New: Behavior summary (kids)
  const behaviorSummary = useMemo(() => {
    if (!latestAssessment) return null;
    const service = academyId ? createAssessmentService(academyId) : null;
    if (!service) return null;
    const overallScore = service.calculateOverallScore(latestAssessment.scores);
    const level = service.getPerformanceLevel(overallScore);
    return { overallScore, level, scores: latestAssessment.scores, date: latestAssessment.date };
  }, [latestAssessment, academyId]);

  // Stats carousel
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

  // Dynamic quick links
  const quickLinks = useMemo(() => {
    const links = [
      { label: 'Presencas', path: '/portal/presenca', icon: ClipboardCheck },
      { label: 'Jornada', path: '/portal/linha-do-tempo', icon: History },
      { label: 'Competicoes', path: '/portal/competicoes', icon: Trophy },
    ];
    if (!academySettings?.storePublished) {
      links.push({ label: 'Horarios', path: '/portal/horarios', icon: Calendar });
    }
    if (isKidsCategory) {
      links.push({ label: 'Comportamento', path: '/portal/comportamento', icon: Star });
    }
    if (hasPlan) {
      links.push({ label: 'Financeiro', path: '/portal/financeiro', icon: CreditCard });
    }
    if (academySettings?.storePublished) {
      links.push({ label: 'Loja', path: '/portal/loja', icon: ShoppingBag });
    }
    return links;
  }, [isKidsCategory, hasPlan, academySettings?.storePublished]);

  // ============================================
  // Handlers
  // ============================================

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['student', studentId] }),
      queryClient.invalidateQueries({ queryKey: ['studentAttendance', studentId] }),
      queryClient.invalidateQueries({ queryKey: ['studentCompetitionResults', studentId] }),
      queryClient.invalidateQueries({ queryKey: ['studentPayments', studentId] }),
      queryClient.invalidateQueries({ queryKey: ['allClasses'] }),
      queryClient.invalidateQueries({ queryKey: ['studentAttendanceHistory', studentId] }),
      queryClient.invalidateQueries({ queryKey: ['latestAssessment', studentId] }),
      queryClient.invalidateQueries({ queryKey: ['upcomingCompetitions'] }),
      queryClient.invalidateQueries({ queryKey: ['checkinStatus', studentId] }),
    ]);
  }, [queryClient, studentId]);

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

  // ============================================
  // Skeleton Loading
  // ============================================

  if (loadingStudent) {
    return (
      <Box>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={96} sx={{ mb: 2, borderRadius: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
          <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2.5 }} />
          <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2.5 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, overflow: 'hidden' }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={120} sx={{ minWidth: '70%', borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  // ============================================
  // Check-in helpers
  // ============================================

  const checkinAvailable = nextClass?.isToday &&
    academySettings?.studentCheckinEnabled &&
    nextClass.schedule &&
    isInCheckinWindow(nextClass.schedule, nextClass.date);

  // ============================================
  // Render
  // ============================================

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
        {/* 1. Academy Indicator */}
        <AcademyIndicator label="Portal de" icon={<Award size={16} />} />

        {/* 2. Header */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
              {student && [...getStudentSports(student)].sort((a, b) => {
                const primary = getStudentPrimarySport(student);
                if (a === primary) return -1;
                if (b === primary) return 1;
                return 0;
              }).map((sportId) => {
                const gradeInfo = getStudentGrade(student, sportId);
                if (!gradeInfo) return null;
                const sport = SPORTS[sportId];
                if (!sport || sport.gradeSystem === 'none') return null;
                const multiSport = getStudentSports(student).length > 1;
                return (
                  <Box key={sportId} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <GradeDisplay
                      sportId={sportId}
                      grade={gradeInfo.currentGrade}
                      stripes={gradeInfo.currentStripes}
                      size="small"
                      showLabel
                    />
                    {multiSport && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                        {sport.labelShort}
                      </Typography>
                    )}
                  </Box>
                );
              })}
              {!student && (
                <GradeDisplay sportId="bjj" grade="white" stripes={0} size="small" />
              )}
            </Box>
          </Box>
        </FadeInView>

        {/* 3. Financial Alert (improved) */}
        {financialAlert && (
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
                  bgcolor: financialAlert.bgColor,
                  borderRadius: 2.5,
                  cursor: 'pointer',
                }}
              >
                <AlertTriangle size={18} color={financialAlert.iconColor} />
                <Typography variant="body2" sx={{ flex: 1, color: financialAlert.textColor, fontSize: '0.8rem', fontWeight: 500 }}>
                  {financialAlert.count} pagamento{financialAlert.count > 1 ? 's' : ''} {financialAlert.label} - {financialAlert.total}
                </Typography>
                <ArrowRight size={16} color={financialAlert.iconColor} />
              </Paper>
            </ScaleOnPress>
          </FadeInView>
        )}

        {/* 4. Next Class Card */}
        <FadeInView direction="up" delay={150}>
          {nextClass ? (
            <ScaleOnPress>
              <Paper
                elevation={0}
                onClick={() => router.push('/portal/horarios')}
                sx={{
                  p: 2.5,
                  mb: 2.5,
                  borderRadius: 3,
                  bgcolor: checkinAvailable && !hasCheckedIn ? '#16A34A' : '#171717',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, fontSize: '0.65rem' }}>
                      Proxima aula
                    </Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mt: 0.5, fontSize: '1.1rem', lineHeight: 1.2 }}>
                      {nextClass.class.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5, fontSize: '0.8rem' }}>
                      {nextClass.dayLabel} • {nextClass.schedule.startTime} - {nextClass.schedule.endTime}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {hasCheckedIn ? <CheckCircle2 size={22} color="#fff" /> :
                     checkinAvailable ? <UserCheck size={22} color="#fff" /> :
                     <Calendar size={22} color="#fff" />}
                  </Box>
                </Box>

                {/* Check-in status */}
                {academySettings?.studentCheckinEnabled && nextClass.isToday && (
                  <Box sx={{ mt: 2 }}>
                    {hasCheckedIn ? (
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.2)',
                      }}>
                        <CheckCircle2 size={14} color="#fff" />
                        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}>
                          Check-in feito
                        </Typography>
                      </Box>
                    ) : checkinAvailable ? (
                      <Box sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.25)',
                      }}>
                        <UserCheck size={14} color="#fff" />
                        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}>
                          Fazer Check-in
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                )}
              </Paper>
            </ScaleOnPress>
          ) : (
            <Paper
              elevation={0}
              onClick={() => router.push('/portal/horarios')}
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: 3,
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: 'grey.200',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Calendar size={24} color="#999" style={{ marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                Ver horarios disponiveis
              </Typography>
            </Paper>
          )}
        </FadeInView>

        {/* 5. Streak + Monthly Cards (side by side) */}
        <FadeInView direction="up" delay={200}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2.5 }}>
            {/* Streak Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Box sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'rgba(255, 107, 53, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}>
                <Flame size={18} color="#FF6B35" />
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.75rem', lineHeight: 1, color: 'text.primary' }}>
                {streak}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                {streak === 1 ? 'semana' : 'semanas'} de sequencia
              </Typography>
              {streak > 0 ? (
                <Box sx={{
                  display: 'inline-flex',
                  mt: 1,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                }}>
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, fontSize: '0.6rem' }}>
                    Em alta!
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontSize: '0.6rem' }}>
                  Comece sua sequencia!
                </Typography>
              )}
            </Paper>

            {/* Monthly Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Box sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1,
              }}>
                <CalendarDays size={18} color="#3B82F6" />
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ fontSize: '1.75rem', lineHeight: 1, color: 'text.primary' }}>
                {monthlyTrainings}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                {monthlyTrainings === 1 ? 'treino' : 'treinos'} no mes
              </Typography>
              <Box sx={{
                display: 'inline-flex',
                mt: 1,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(59, 130, 246, 0.1)',
              }}>
                <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 600, fontSize: '0.6rem', textTransform: 'capitalize' }}>
                  {currentMonthName}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </FadeInView>

        {/* 6. Stats Carousel */}
        <FadeInView direction="up" delay={250}>
          <Box sx={{ mb: 2.5 }}>
            <Box
              ref={scrollContainerRef}
              onScroll={handleStatsScroll}
              sx={{
                display: { xs: 'flex', md: 'grid' },
                gridTemplateColumns: { md: 'repeat(3, 1fr)' },
                gap: 1.5,
                overflowX: { xs: 'auto', md: 'visible' },
                scrollSnapType: { xs: 'x mandatory', md: 'none' },
                scrollBehavior: 'smooth',
                pb: { xs: 1, md: 0 },
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
                      flex: { xs: '0 0 70%', md: 'unset' },
                      minWidth: { xs: '70%', md: 'unset' },
                      scrollSnapAlign: { xs: 'start', md: 'unset' },
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

            {/* Carousel Dots - Mobile Only */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', gap: 0.75, mt: 1.5 }}>
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

        {/* 7. Medals */}
        {medalStats.total > 0 && (
          <FadeInView direction="up" delay={300}>
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

        {/* 8. Behavior Card (kids only) */}
        {isKidsCategory && behaviorSummary && (
          <FadeInView direction="up" delay={350}>
            <ScaleOnPress>
              <Paper
                elevation={0}
                onClick={() => router.push('/portal/comportamento')}
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#fff',
                  border: '1px solid',
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Comportamento
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ fontSize: '2rem', lineHeight: 1, color: behaviorSummary.level.color }}>
                    {behaviorSummary.overallScore}
                  </Typography>
                  <Box sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: `${behaviorSummary.level.color}15`,
                  }}>
                    <Typography variant="caption" sx={{ color: behaviorSummary.level.color, fontWeight: 600, fontSize: '0.65rem' }}>
                      {behaviorSummary.level.label}
                    </Typography>
                  </Box>
                </Box>

                {/* Mini score bars */}
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {Object.entries(behaviorSummary.scores).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ width: 80, fontSize: '0.65rem', color: 'text.secondary' }}>
                        {SCORE_LABELS[key]}
                      </Typography>
                      <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'grey.100', overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%',
                          width: `${((value as number) / 5) * 100}%`,
                          borderRadius: 3,
                          bgcolor: SCORE_COLORS[key],
                          transition: 'width 0.3s ease',
                        }} />
                      </Box>
                      <Typography variant="caption" sx={{ width: 16, fontSize: '0.6rem', color: 'text.secondary', textAlign: 'right' }}>
                        {value as number}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5, fontSize: '0.6rem' }}>
                  Ultima avaliacao: {new Date(behaviorSummary.date).toLocaleDateString('pt-BR')}
                </Typography>
              </Paper>
            </ScaleOnPress>
          </FadeInView>
        )}

        {/* 9. Next Competition */}
        {nextCompetition && (
          <FadeInView direction="up" delay={400}>
            <ScaleOnPress>
              <Paper
                elevation={0}
                onClick={() => router.push('/portal/competicoes')}
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: 2.5,
                  bgcolor: '#fff',
                  border: '1px solid',
                  borderColor: 'grey.200',
                  cursor: 'pointer',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Trophy size={20} color="#8B5CF6" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}>
                      Proximo campeonato
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ mt: 0.25, fontSize: '0.9rem', lineHeight: 1.3 }} noWrap>
                      {nextCompetition.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontSize: '0.7rem' }}>
                      <Calendar size={12} />
                      {new Date(nextCompetition.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </Typography>
                    {nextCompetition.location && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, fontSize: '0.7rem' }}>
                        <MapPin size={12} />
                        {nextCompetition.location}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
                      <Box sx={{
                        display: 'inline-flex',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(139, 92, 246, 0.1)',
                      }}>
                        <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 600, fontSize: '0.6rem' }}>
                          Em {nextCompetition.daysUntil} dia{nextCompetition.daysUntil !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      {nextCompetition.isEnrolled && (
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.25,
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: 'rgba(22, 163, 74, 0.1)',
                        }}>
                          <CheckCircle2 size={10} color="#16A34A" />
                          <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 600, fontSize: '0.6rem' }}>
                            Inscrito
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </ScaleOnPress>
          </FadeInView>
        )}

        {/* 10. Quick Links Grid */}
        <FadeInView direction="up" delay={450}>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Acesso rapido
            </Typography>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: quickLinks.length > 4 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                md: `repeat(${Math.min(quickLinks.length, 4)}, 1fr)`,
              },
              gap: 1.5,
            }}>
              {quickLinks.map((item) => {
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
