'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tab,
  Tabs,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Award, Users, TrendingUp, History } from 'lucide-react';
import { useBeltProgression } from '@/hooks';
import { EligibleStudentCard } from './EligibleStudentCard';
import { PromotionDialog } from './PromotionDialog';
import { BeltDistributionChart } from './BeltDistributionChart';
import { PromotionHistoryCard } from './PromotionHistoryCard';
import { Student, BeltColor, Stripes } from '@/types';

// ============================================
// Tab Interface
// ============================================
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// ============================================
// Stats Card Component
// ============================================
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  compact?: boolean;
}

function StatsCard({ title, value, icon, color, bgColor, compact }: StatsCardProps) {
  return (
    <Paper sx={{ p: compact ? 2 : 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1 : 2 }}>
        <Box
          sx={{
            p: compact ? 1 : 1.5,
            borderRadius: 2,
            bgcolor: bgColor,
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: compact ? '0.65rem' : '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ fontSize: compact ? '1.25rem' : '2rem' }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================
// GraduationDashboard Component
// ============================================
export function GraduationDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    eligibleStudents,
    beltDistribution,
    recentPromotions,
    promoteStudent,
    addStripe,
    changeBelt,
    isLoadingEligible,
    isPromoting,
    getBeltLabel,
  } = useBeltProgression();

  const [tabValue, setTabValue] = useState(0);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    student: Student;
    nextPromotion: { belt: BeltColor; stripes: Stripes };
  } | null>(null);

  // ============================================
  // Handle Promote Click
  // ============================================
  const handlePromoteClick = useCallback(
    (student: Student, nextPromotion: { belt: BeltColor; stripes: Stripes }) => {
      setSelectedStudent({ student, nextPromotion });
      setPromotionDialogOpen(true);
    },
    []
  );

  // ============================================
  // Handle Confirm Promotion
  // ============================================
  const handleConfirmPromotion = useCallback(
    async (type: 'stripe' | 'belt', notes?: string) => {
      if (!selectedStudent) return;

      if (type === 'stripe') {
        await addStripe({
          studentId: selectedStudent.student.id,
          notes,
        });
      } else {
        await changeBelt({
          studentId: selectedStudent.student.id,
          newBelt: selectedStudent.nextPromotion.belt,
          notes,
        });
      }

      setPromotionDialogOpen(false);
      setSelectedStudent(null);
    },
    [selectedStudent, addStripe, changeBelt]
  );

  // ============================================
  // Calculate Stats
  // ============================================
  const totalStudents = beltDistribution
    ? Object.values(beltDistribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          Sistema de Graduacao
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8rem', sm: '1rem' }, display: { xs: 'none', sm: 'block' } }}
        >
          Gerencie as graduacoes e acompanhe a evolucao dos alunos
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <StatsCard
            title={isMobile ? "Elegiveis" : "Elegiveis para Graduacao"}
            value={eligibleStudents.length}
            icon={<Award size={isMobile ? 18 : 24} />}
            color="#16a34a"
            bgColor="#dcfce7"
            compact={isMobile}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <StatsCard
            title="Total de Alunos"
            value={totalStudents}
            icon={<Users size={isMobile ? 18 : 24} />}
            color="#2563eb"
            bgColor="#dbeafe"
            compact={isMobile}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <StatsCard
            title={isMobile ? "Recentes" : "Graduacoes Recentes"}
            value={recentPromotions.length}
            icon={<TrendingUp size={isMobile ? 18 : 24} />}
            color="#7c3aed"
            bgColor="#ede9fe"
            compact={isMobile}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <StatsCard
            title="Faixas Pretas"
            value={beltDistribution?.black || 0}
            icon={<Award size={isMobile ? 18 : 24} />}
            color="#171717"
            bgColor="#e5e5e5"
            compact={isMobile}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 'auto', sm: 90 },
                px: { xs: 1.5, sm: 2 },
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Award size={isMobile ? 14 : 18} />
                  {isMobile ? `(${eligibleStudents.length})` : `Elegiveis (${eligibleStudents.length})`}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Users size={isMobile ? 14 : 18} />
                  {isMobile ? 'Faixas' : 'Distribuicao por Faixa'}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <History size={isMobile ? 14 : 18} />
                  Historico
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab: Eligible Students */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {isLoadingEligible ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            ) : eligibleStudents.length === 0 ? (
              <Alert severity="info">
                Nenhum aluno elegivel para graduacao no momento.
                Os alunos precisam atingir o numero minimo de aulas para serem elegiveis.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {eligibleStudents.map(({ student, nextPromotion, totalClasses }) => (
                  <EligibleStudentCard
                    key={student.id}
                    student={student}
                    nextPromotion={nextPromotion}
                    totalClasses={totalClasses}
                    onPromote={() => handlePromoteClick(student, nextPromotion)}
                    getBeltLabel={getBeltLabel}
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Belt Distribution */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            {beltDistribution ? (
              <BeltDistributionChart distribution={beltDistribution} getBeltLabel={getBeltLabel} />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Carregando dados...</Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: History */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            {recentPromotions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  Nenhuma graduacao registrada ainda
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentPromotions.map((promotion) => (
                  <PromotionHistoryCard
                    key={promotion.id}
                    promotion={promotion}
                    getBeltLabel={getBeltLabel}
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Promotion Dialog */}
      {selectedStudent && (
        <PromotionDialog
          open={promotionDialogOpen}
          student={selectedStudent.student}
          nextPromotion={selectedStudent.nextPromotion}
          onClose={() => {
            setPromotionDialogOpen(false);
            setSelectedStudent(null);
          }}
          onConfirm={handleConfirmPromotion}
          isLoading={isPromoting}
          getBeltLabel={getBeltLabel}
        />
      )}
    </Box>
  );
}

export default GraduationDashboard;
