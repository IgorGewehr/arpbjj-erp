'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Select,
  MenuItem,
  Skeleton,
  Alert,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  UserX,
  Shield,
  Heart,
  Clock,
  DollarSign,
  CalendarDays,
  Activity,
  Filter,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRetention } from '@/hooks/useRetention';
import { RiskLevel, StudentRiskScore } from '@/types';

// ============================================
// Risk Level Config
// ============================================
const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; chipColor: 'success' | 'warning' | 'error' | 'default' }> = {
  low: { label: 'Baixo', color: '#2e7d32', bgColor: '#e8f5e9', chipColor: 'success' },
  medium: { label: 'Medio', color: '#f57c00', bgColor: '#fff3e0', chipColor: 'warning' },
  high: { label: 'Alto', color: '#e65100', bgColor: '#fbe9e7', chipColor: 'error' },
  critical: { label: 'Critico', color: '#c62828', bgColor: '#ffebee', chipColor: 'error' },
};

// ============================================
// Risk Level Filter Options
// ============================================
const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
  { value: 'critical', label: 'Critico' },
];

// ============================================
// Suggested Actions by Risk Level
// ============================================
const SUGGESTED_ACTIONS: Record<RiskLevel, string[]> = {
  low: [
    'Manter acompanhamento regular',
    'Enviar mensagem de incentivo',
  ],
  medium: [
    'Entrar em contato para entender situacao',
    'Oferecer aula experimental em outro horario',
    'Verificar se ha problemas financeiros',
  ],
  high: [
    'Ligar diretamente para o aluno',
    'Oferecer desconto ou condicao especial',
    'Convidar para evento ou seminario gratuito',
    'Verificar pagamentos pendentes',
  ],
  critical: [
    'Contato URGENTE - risco iminente de evasao',
    'Reuniao presencial com o aluno',
    'Avaliar renegociacao de plano/valor',
    'Oferecer periodo de pausa ao inves de cancelamento',
    'Resolver pendencias financeiras imediatamente',
  ],
};

// ============================================
// KPI Card Component
// ============================================
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  isLoading?: boolean;
}

function KPICard({ title, value, icon, color, bgColor, isLoading }: KPICardProps) {
  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: bgColor,
            color,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================
// Risk Distribution Box
// ============================================
interface RiskBoxProps {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  isLoading?: boolean;
}

function RiskBox({ label, count, color, bgColor, isLoading }: RiskBoxProps) {
  if (isLoading) {
    return <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2, flex: 1 }} />;
  }

  return (
    <Box
      sx={{
        flex: 1,
        p: 2,
        borderRadius: 2,
        bgcolor: bgColor,
        textAlign: 'center',
        border: `1px solid ${color}20`,
      }}
    >
      <Typography variant="h5" fontWeight="bold" sx={{ color }}>
        {count}
      </Typography>
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ============================================
// Student Row Component
// ============================================
interface StudentRowProps {
  student: StudentRiskScore;
  onClick: () => void;
  compact?: boolean;
}

function StudentRow({ student, onClick, compact }: StudentRowProps) {
  const config = RISK_LEVEL_CONFIG[student.level];
  const initial = student.studentName.charAt(0).toUpperCase();

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1.5 : 2,
        p: compact ? 1.5 : 2,
        cursor: 'pointer',
        borderRadius: 2,
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          bgcolor: config.bgColor,
          color: config.color,
          width: compact ? 36 : 44,
          height: compact ? 36 : 44,
          fontSize: compact ? '0.875rem' : '1rem',
          fontWeight: 'bold',
        }}
      >
        {initial}
      </Avatar>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            variant={compact ? 'body2' : 'body1'}
            fontWeight="bold"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {student.studentName}
          </Typography>
          <Chip
            label={config.label}
            color={config.chipColor}
            size="small"
            sx={{ fontSize: '0.65rem', height: 22 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: compact ? 1 : 2, flexWrap: 'wrap', mt: 0.5 }}>
          {student.lastAttendance && (
            <Typography variant="caption" color="text.secondary">
              <CalendarDays size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {formatDistanceToNow(student.lastAttendance, { locale: ptBR, addSuffix: true })}
            </Typography>
          )}
          {student.daysSinceLastAttendance > 0 && student.daysSinceLastAttendance < 999 && (
            <Typography variant="caption" color="text.secondary">
              <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {student.daysSinceLastAttendance}d sem treinar
            </Typography>
          )}
          {student.overduePayments > 0 && (
            <Typography variant="caption" color="error.main">
              <DollarSign size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {student.overduePayments} em atraso
            </Typography>
          )}
        </Box>
      </Box>

      {/* Score Badge */}
      <Box
        sx={{
          bgcolor: config.bgColor,
          color: config.color,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          fontWeight: 'bold',
          fontSize: compact ? '0.8rem' : '0.9rem',
          minWidth: 40,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {student.score}
      </Box>

      {/* Arrow */}
      <ChevronRight size={18} color="#999" />
    </Box>
  );
}

// ============================================
// Student Detail Dialog
// ============================================
interface StudentDetailDialogProps {
  student: StudentRiskScore | null;
  open: boolean;
  onClose: () => void;
}

function StudentDetailDialog({ student, open, onClose }: StudentDetailDialogProps) {
  if (!student) return null;

  const config = RISK_LEVEL_CONFIG[student.level];
  const actions = SUGGESTED_ACTIONS[student.level];

  const getFactorIcon = (factorName: string) => {
    if (factorName.includes('Frequencia')) return <TrendingDown size={20} />;
    if (factorName.includes('Inatividade')) return <Clock size={20} />;
    if (factorName.includes('Pagamento')) return <DollarSign size={20} />;
    if (factorName.includes('Tempo')) return <CalendarDays size={20} />;
    return <Activity size={20} />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: config.bgColor,
              color: config.color,
              width: 48,
              height: 48,
              fontWeight: 'bold',
            }}
          >
            {student.studentName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {student.studentName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={config.label}
                color={config.chipColor}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
              <Typography variant="body2" color="text.secondary">
                Score: {student.score}/100
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Score Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Indice de Risco
          </Typography>
          <LinearProgress
            variant="determinate"
            value={student.score}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#f0f0f0',
              '& .MuiLinearProgress-bar': {
                bgcolor: config.color,
                borderRadius: 5,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">0 (Seguro)</Typography>
            <Typography variant="caption" color="text.secondary">100 (Critico)</Typography>
          </Box>
        </Box>

        {/* Summary Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Ultima Presenca</Typography>
            <Typography variant="body2" fontWeight="bold">
              {student.lastAttendance
                ? format(student.lastAttendance, 'dd/MM/yyyy', { locale: ptBR })
                : 'Sem registro'}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Dias Inativo</Typography>
            <Typography variant="body2" fontWeight="bold">
              {student.daysSinceLastAttendance < 999 ? student.daysSinceLastAttendance : 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Pagtos. Atrasados</Typography>
            <Typography variant="body2" fontWeight="bold" color={student.overduePayments > 0 ? 'error.main' : 'text.primary'}>
              {student.overduePayments}
            </Typography>
          </Box>
        </Box>

        {/* Risk Factors */}
        <Typography variant="subtitle2" gutterBottom>
          Fatores de Risco
        </Typography>
        <List disablePadding>
          {student.factors.map((factor, index) => (
            <ListItem
              key={index}
              sx={{
                px: 2,
                py: 1.5,
                mb: 1,
                bgcolor: factor.score > 0 ? `${config.bgColor}80` : 'grey.50',
                borderRadius: 2,
                border: factor.score > 0 ? `1px solid ${config.color}30` : '1px solid transparent',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: factor.score > 0 ? config.color : 'text.secondary' }}>
                {getFactorIcon(factor.name)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {factor.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{ color: factor.score > 0 ? config.color : 'text.secondary' }}
                    >
                      {factor.score}/{factor.weight}
                    </Typography>
                  </Box>
                }
                secondary={factor.details || factor.description}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>

        {/* Suggested Actions */}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield size={16} />
          Acoes Sugeridas
        </Typography>
        <List disablePadding>
          {actions.map((action, index) => (
            <ListItem key={index} sx={{ py: 0.5, px: 1 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Heart size={14} color={config.color} />
              </ListItemIcon>
              <ListItemText
                primary={action}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Retention Dashboard Component
// ============================================
export function RetentionDashboard({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const { atRiskStudents, metrics, isLoading, error } = useRetention();

  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskScore | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter students by risk level
  const filteredStudents = useMemo(() => {
    if (riskFilter === 'all') return atRiskStudents;
    return atRiskStudents.filter((s) => s.level === riskFilter);
  }, [atRiskStudents, riskFilter]);

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setRiskFilter(event.target.value);
  };

  const handleStudentClick = (student: StudentRiskScore) => {
    setSelectedStudent(student);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedStudent(null);
  };

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Erro ao carregar dados de retencao. Tente novamente mais tarde.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: embedded ? 0 : (isMobile ? 2 : 3) }}>
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Shield size={28} color={theme.palette.primary.main} />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
              Dashboard de Retencao
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Acompanhe o risco de evasao dos alunos e tome acoes preventivas para manter sua base ativa.
          </Typography>
        </Box>
      )}

      {/* ============================================ */}
      {/* KPI Cards */}
      {/* ============================================ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            title="Total em Risco"
            value={metrics.totalAtRisk}
            icon={<AlertTriangle size={24} />}
            color="#e65100"
            bgColor="#fbe9e7"
            isLoading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            title="Taxa de Evasao"
            value={`${metrics.atRiskPercentage.toFixed(1)}%`}
            icon={<UserX size={24} />}
            color="#f57c00"
            bgColor="#fff3e0"
            isLoading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            title="Frequencia Media"
            value={`${metrics.averageFrequency.toFixed(1)}x`}
            icon={<Activity size={24} />}
            color="#1565c0"
            bgColor="#e3f2fd"
            isLoading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            title="Adimplencia"
            value={`${metrics.paymentComplianceRate.toFixed(1)}%`}
            icon={<DollarSign size={24} />}
            color="#2e7d32"
            bgColor="#e8f5e9"
            isLoading={isLoading}
          />
        </Grid>
      </Grid>

      {/* ============================================ */}
      {/* Risk Distribution */}
      {/* ============================================ */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Distribuicao por Nivel de Risco
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <RiskBox
            label="Baixo"
            count={metrics.distributionByRisk.low}
            color="#2e7d32"
            bgColor="#e8f5e9"
            isLoading={isLoading}
          />
          <RiskBox
            label="Medio"
            count={metrics.distributionByRisk.medium}
            color="#f57c00"
            bgColor="#fff3e0"
            isLoading={isLoading}
          />
          <RiskBox
            label="Alto"
            count={metrics.distributionByRisk.high}
            color="#e65100"
            bgColor="#fbe9e7"
            isLoading={isLoading}
          />
          <RiskBox
            label="Critico"
            count={metrics.distributionByRisk.critical}
            color="#c62828"
            bgColor="#ffebee"
            isLoading={isLoading}
          />
        </Box>
      </Paper>

      {/* ============================================ */}
      {/* Filter + Student List */}
      {/* ============================================ */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Filter Bar */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Filter size={18} />
            Alunos ({filteredStudents.length})
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Nivel de Risco</InputLabel>
            <Select
              value={riskFilter}
              onChange={handleFilterChange}
              label="Nivel de Risco"
              sx={{ borderRadius: 2 }}
            >
              {FILTER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
                <Skeleton variant="rectangular" width={40} height={30} sx={{ borderRadius: 2 }} />
              </Box>
            ))}
          </Box>
        )}

        {/* Empty State */}
        {!isLoading && filteredStudents.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Shield size={48} color="#4caf50" style={{ marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              {riskFilter === 'all'
                ? 'Nenhum aluno em risco!'
                : `Nenhum aluno com risco ${RISK_LEVEL_CONFIG[riskFilter as RiskLevel]?.label || ''}`
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {riskFilter === 'all'
                ? 'Todos os alunos ativos estao com boa frequencia e pagamentos em dia.'
                : 'Tente selecionar outro filtro para ver mais resultados.'
              }
            </Typography>
          </Box>
        )}

        {/* Student List */}
        {!isLoading && filteredStudents.length > 0 && (
          <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
            {filteredStudents.map((student, index) => (
              <Box key={student.studentId}>
                <StudentRow
                  student={student}
                  onClick={() => handleStudentClick(student)}
                  compact={isMobile}
                />
                {index < filteredStudents.length - 1 && (
                  <Divider sx={{ mx: 2 }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* ============================================ */}
      {/* Info Note */}
      {/* ============================================ */}
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Info size={16} color="#999" style={{ marginTop: 2, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary">
          O score de risco e calculado com base em frequencia (40%), inatividade (30%),
          pagamentos em atraso (20%) e tempo na academia (10%). Alunos com score acima de 25
          sao considerados em risco.
        </Typography>
      </Box>

      {/* ============================================ */}
      {/* Student Detail Dialog */}
      {/* ============================================ */}
      <StudentDetailDialog
        student={selectedStudent}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </Box>
  );
}

export default RetentionDashboard;
