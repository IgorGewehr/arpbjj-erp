'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Skeleton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
  Alert,
} from '@mui/material';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Award,
  ClipboardCheck,
  DollarSign,
  Edit,
  AlertCircle,
  CheckCircle,
  User,
  Heart,
  Clock,
  Star,
  Save,
  CreditCard,
  TrendingUp,
  Link,
  Copy,
  Trophy,
  History,
  Trash2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { useStudent, useStudents, useFinancial, usePlans, useAssessment, useStudentAssessment } from '@/hooks';
import { getBeltChipColor } from '@/lib/theme';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BeltColor, KidsBeltColor, Stripes, PaymentMethod, Financial, LinkCode } from '@/types';
import { financialService, attendanceService, studentService } from '@/services';
import { Attendance } from '@/types';
import { linkCodeService } from '@/services/linkCodeService';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';

// ============================================
// Assessment Score Types
// ============================================
interface AssessmentScores {
  respeito: number;
  disciplina: number;
  pontualidade: number;
  tecnica: number;
  esforco: number;
}

const assessmentCategories = [
  { key: 'respeito' as const, label: 'Respeito', description: 'Respeito aos colegas, professores e regras' },
  { key: 'disciplina' as const, label: 'Disciplina', description: 'Comportamento durante as aulas' },
  { key: 'pontualidade' as const, label: 'Pontualidade', description: 'Chegada no horario e consistencia' },
  { key: 'tecnica' as const, label: 'Tecnica', description: 'Desenvolvimento tecnico e aprendizado' },
  { key: 'esforco' as const, label: 'Esforco', description: 'Dedicacao e empenho durante os treinos' },
];

const getScoreLabel = (value: number): string => {
  if (value === 5) return 'Excelente';
  if (value === 4) return 'Muito Bom';
  if (value === 3) return 'Bom';
  if (value === 2) return 'Regular';
  return 'Precisa Melhorar';
};

// ============================================
// Belt Options
// ============================================
const adultBeltOptions: { value: BeltColor; label: string }[] = [
  { value: 'white', label: 'Branca' },
  { value: 'blue', label: 'Azul' },
  { value: 'purple', label: 'Roxa' },
  { value: 'brown', label: 'Marrom' },
  { value: 'black', label: 'Preta' },
];

const kidsBeltOptions: { value: KidsBeltColor; label: string }[] = [
  { value: 'white', label: 'Branca' },
  { value: 'grey', label: 'Cinza' },
  { value: 'yellow', label: 'Amarela' },
  { value: 'orange', label: 'Laranja' },
  { value: 'green', label: 'Verde' },
];

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartao Credito' },
  { value: 'debit_card', label: 'Cartao Debito' },
  { value: 'bank_transfer', label: 'Transferencia' },
];

// ============================================
// Star Rating Component
// ============================================
interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description: string;
  disabled?: boolean;
}

function StarRating({ value, onChange, label, description, disabled }: StarRatingProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            color: value >= 4 ? 'success.main' : value >= 3 ? 'warning.main' : 'error.main',
          }}
        >
          {getScoreLabel(value)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Box
            key={star}
            onClick={() => !disabled && onChange(star)}
            sx={{
              cursor: disabled ? 'default' : 'pointer',
              transition: 'transform 0.2s',
              opacity: disabled ? 0.7 : 1,
              '&:hover': disabled ? {} : { transform: 'scale(1.2)' },
            }}
          >
            <Star
              size={28}
              fill={star <= value ? '#EAB308' : 'none'}
              color={star <= value ? '#EAB308' : '#D1D5DB'}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

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
// Tab Panel Component
// ============================================
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ py: 3 }}>
      {value === index && children}
    </Box>
  );
}

// ============================================
// Info Item Component
// ============================================
function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value || '-'}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================
// StudentProfilePage Component
// ============================================
export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useFeedback();
  const { student, isLoading, refresh: refreshStudent } = useStudent(studentId);
  const { updateBelt } = useStudents({ autoLoad: false });
  const { markAsPaid, isMarkingPaid } = useFinancial({ autoLoad: false });
  const { plans } = usePlans();

  // Assessment hooks
  const { createAssessment, isCreating: isSavingAssessment } = useAssessment();
  const { assessments: studentAssessments, isLoading: isLoadingAssessments, refresh: refreshAssessments, calculateOverallScore, getPerformanceLevel } = useStudentAssessment(studentId);

  // Check if student is enrolled in any active plan (has financial obligations)
  const studentHasPlan = useMemo(() => {
    if (!studentId) return false;
    return plans.some(plan => plan.isActive && plan.studentIds?.includes(studentId));
  }, [studentId, plans]);

  const [activeTab, setActiveTab] = useState(0);
  const [totalAttendanceCount, setTotalAttendanceCount] = useState<number | null>(null);
  const [assessmentScores, setAssessmentScores] = useState<AssessmentScores>({
    respeito: 3,
    disciplina: 3,
    pontualidade: 3,
    tecnica: 3,
    esforco: 3,
  });
  const [assessmentNotes, setAssessmentNotes] = useState('');

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Financial state
  const [studentFinancials, setStudentFinancials] = useState<Financial[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Financial | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  // Graduation dialog state
  const [graduationDialogOpen, setGraduationDialogOpen] = useState(false);
  const [newBelt, setNewBelt] = useState<BeltColor | KidsBeltColor>('white');
  const [newStripes, setNewStripes] = useState<Stripes>(0);
  const [savingGraduation, setSavingGraduation] = useState(false);

  // Link code dialog state
  const [linkCodeDialogOpen, setLinkCodeDialogOpen] = useState(false);
  const [generatedLinkCode, setGeneratedLinkCode] = useState<LinkCode | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Determine if student is kids category
  const isKidsStudent = student?.category === 'kids';
  const beltOptions = isKidsStudent ? kidsBeltOptions : adultBeltOptions;

  // Build tabs based on category and plan status
  const tabs = useMemo(() => {
    const baseTabs = ['Informacoes', 'Presenca'];
    // Only show Financeiro tab if student has a plan linked
    if (studentHasPlan) {
      baseTabs.push('Financeiro');
    }
    baseTabs.push('Graduacao');
    if (isKidsStudent) {
      baseTabs.push('Comportamento');
    }
    return baseTabs;
  }, [isKidsStudent, studentHasPlan]);

  // Load student attendance when tab changes to Presenca
  useEffect(() => {
    const presencaTabIndex = tabs.indexOf('Presenca');
    if (activeTab === presencaTabIndex && presencaTabIndex !== -1 && studentId) {
      setLoadingAttendance(true);
      attendanceService.getByStudent(studentId, 100).then((data) => {
        setAttendanceRecords(data);
        setLoadingAttendance(false);
      }).catch(() => {
        setLoadingAttendance(false);
      });
    }
  }, [activeTab, studentId, tabs]);

  // Load student financials when tab changes to Financeiro
  useEffect(() => {
    const financeiroTabIndex = tabs.indexOf('Financeiro');
    if (activeTab === financeiroTabIndex && financeiroTabIndex !== -1 && studentId) {
      setLoadingFinancials(true);
      financialService.getByStudent(studentId).then((data) => {
        setStudentFinancials(data);
        setLoadingFinancials(false);
      });
    }
  }, [activeTab, studentId, tabs]);

  // Initialize graduation dialog with current values
  useEffect(() => {
    if (student) {
      setNewBelt(student.currentBelt);
      setNewStripes(student.currentStripes);
    }
  }, [student]);

  // Load total attendance count
  useEffect(() => {
    if (student && studentId) {
      attendanceService.getTotalStudentAttendanceCount(
        studentId,
        student.initialAttendanceCount || 0
      ).then(setTotalAttendanceCount).catch(() => setTotalAttendanceCount(null));
    }
  }, [student, studentId]);

  // Handle assessment score change
  const handleScoreChange = useCallback((key: keyof AssessmentScores, value: number) => {
    setAssessmentScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Calculate overall score
  const overallScore = useMemo(() => {
    const { respeito, disciplina, pontualidade, tecnica, esforco } = assessmentScores;
    return (respeito + disciplina + pontualidade + tecnica + esforco) / 5;
  }, [assessmentScores]);

  // Save assessment
  const handleSaveAssessment = useCallback(async () => {
    if (!student || !user) return;

    try {
      await createAssessment({
        studentId: studentId,
        studentName: student.fullName,
        date: new Date(),
        scores: assessmentScores,
        notes: assessmentNotes || undefined,
        evaluatedBy: user.id,
        evaluatedByName: user.displayName || user.email || 'Professor',
      });

      // Reset form after successful save
      setAssessmentScores({
        respeito: 3,
        disciplina: 3,
        pontualidade: 3,
        tecnica: 3,
        esforco: 3,
      });
      setAssessmentNotes('');
      refreshAssessments();
    } catch {
      // Error already handled by hook
    }
  }, [student, user, studentId, assessmentScores, assessmentNotes, createAssessment, refreshAssessments]);

  const beltColor = student ? getBeltChipColor(student.currentBelt) : { bg: '#F5F5F5', text: '#171717' };

  // Calculate training time
  const trainingTime = useMemo(() => {
    if (!student) return null;
    const months = differenceInMonths(new Date(), student.startDate);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0) {
      return `${years} ano${years > 1 ? 's' : ''} e ${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}`;
    }
    return `${months} mes${months !== 1 ? 'es' : ''}`;
  }, [student]);

  // Calculate age
  const age = useMemo(() => {
    if (!student || !student.birthDate) return null;
    return differenceInYears(new Date(), student.birthDate);
  }, [student]);

  // Handle tab change
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Handle back
  const handleBack = useCallback(() => {
    router.push('/alunos');
  }, [router]);

  // Handle edit
  const handleEdit = useCallback(() => {
    router.push(`/alunos/${studentId}/editar`);
  }, [router, studentId]);

  // Handle WhatsApp
  const handleWhatsApp = useCallback(() => {
    if (student && student.phone) {
      const phone = student.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  }, [student]);

  // Handle mark as paid
  const handleOpenPaymentDialog = useCallback((payment: Financial) => {
    setSelectedPayment(payment);
    setPaymentMethod('pix');
    setPaymentDialogOpen(true);
  }, []);

  const handleConfirmPayment = useCallback(async () => {
    if (!selectedPayment) return;
    try {
      await markAsPaid({ id: selectedPayment.id, method: paymentMethod });
      // Refresh financials
      const data = await financialService.getByStudent(studentId);
      setStudentFinancials(data);
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
    } catch {
      // Error handled by hook
    }
  }, [selectedPayment, paymentMethod, markAsPaid, studentId]);

  // Handle graduation
  const handleOpenGraduationDialog = useCallback(() => {
    if (student) {
      setNewBelt(student.currentBelt);
      setNewStripes(student.currentStripes);
      setGraduationDialogOpen(true);
    }
  }, [student]);

  const handleSaveGraduation = useCallback(async () => {
    if (!student) return;
    setSavingGraduation(true);
    try {
      await updateBelt({ id: studentId, belt: newBelt, stripes: newStripes });
      refreshStudent();
      setGraduationDialogOpen(false);
    } catch {
      // Error handled by hook
    } finally {
      setSavingGraduation(false);
    }
  }, [student, studentId, newBelt, newStripes, updateBelt, refreshStudent]);

  // Handle generate link code
  const handleGenerateLinkCode = useCallback(async () => {
    if (!student || !user) return;
    setGeneratingCode(true);
    try {
      const linkCode = await linkCodeService.generate(studentId, student.fullName, user.id);
      setGeneratedLinkCode(linkCode);
      setLinkCodeDialogOpen(true);
    } catch (err) {
      console.error('Erro ao gerar código de acesso:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar código de acesso';
      showError(errorMessage);
    } finally {
      setGeneratingCode(false);
    }
  }, [student, studentId, user, showError]);

  // Handle copy link code
  const handleCopyLinkCode = useCallback(() => {
    if (generatedLinkCode) {
      navigator.clipboard.writeText(generatedLinkCode.code);
      showSuccess('Código copiado!');
    }
  }, [generatedLinkCode, showSuccess]);

  // Handle delete student
  const handleDeleteStudent = useCallback(async () => {
    if (!student) return;

    setDeleting(true);
    try {
      await studentService.hardDelete(studentId);
      showSuccess('Aluno excluido com sucesso!');
      router.push('/alunos');
    } catch (err) {
      console.error('Erro ao excluir aluno:', err);
      showError('Erro ao excluir aluno. Tente novamente.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
    }
  }, [student, studentId, router, showSuccess, showError]);

  // Financial stats
  const financialStats = useMemo(() => {
    const paid = studentFinancials.filter((f) => f.status === 'paid');
    const pending = studentFinancials.filter((f) => f.status === 'pending');
    const overdue = studentFinancials.filter((f) => f.status === 'overdue');
    return {
      paidCount: paid.length,
      paidAmount: paid.reduce((acc, f) => acc + f.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((acc, f) => acc + f.amount, 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((acc, f) => acc + f.amount, 0),
    };
  }, [studentFinancials]);

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout title="Perfil do Aluno">
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={200} height={32} />
                <Skeleton variant="text" width={150} height={20} />
              </Box>
            </Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
              </Grid>
            </Grid>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  // Not found
  if (!student) {
    return (
      <ProtectedRoute>
        <AppLayout title="Aluno nao encontrado">
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <User size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Aluno nao encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              O aluno que voce esta procurando nao existe ou foi removido.
            </Typography>
            <Button variant="contained" onClick={handleBack}>
              Voltar para Lista
            </Button>
          </Paper>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout title="Perfil do Aluno">
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <IconButton onClick={handleBack}>
              <ArrowLeft size={24} />
            </IconButton>
            <Typography variant="h4" fontWeight={700}>
              Perfil do Aluno
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Left Column - Profile Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                {/* Avatar */}
                <Avatar
                  src={student.photoUrl}
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: beltColor.bg,
                    color: beltColor.text,
                    fontSize: '2.5rem',
                    fontWeight: 600,
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {student.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </Avatar>

                {/* Name */}
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  {student.nickname || student.fullName.split(' ')[0]}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {student.fullName}
                </Typography>

                {/* Belt */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                  <BeltDisplay
                    belt={student.currentBelt}
                    stripes={student.currentStripes}
                    size="large"
                    showLabel
                  />
                </Box>

                {/* Status */}
                <Chip
                  icon={student.status === 'active' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  label={
                    student.status === 'active'
                      ? 'Ativo'
                      : student.status === 'injured'
                      ? 'Lesionado'
                      : student.status === 'suspended'
                      ? 'Suspenso'
                      : 'Inativo'
                  }
                  color={
                    student.status === 'active'
                      ? 'success'
                      : student.status === 'injured'
                      ? 'warning'
                      : 'default'
                  }
                  size="small"
                  sx={{ mb: 3 }}
                />

                {/* Training Time */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    mb: 3,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                  }}
                >
                  <Clock size={18} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" color="text.secondary">
                      Tempo de treino
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {trainingTime}
                    </Typography>
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Phone size={18} />}
                    onClick={handleWhatsApp}
                    fullWidth
                    color="success"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Edit size={18} />}
                    onClick={handleEdit}
                    fullWidth
                  >
                    Editar
                  </Button>
                </Box>

                {/* Delete Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 size={18} />}
                    onClick={() => setDeleteDialogOpen(true)}
                    fullWidth
                  >
                    Excluir Aluno
                  </Button>
                </Box>

                {/* Link Code Button */}
                {!student.linkedUserId && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={generatingCode ? <CircularProgress size={18} /> : <Link size={18} />}
                      onClick={handleGenerateLinkCode}
                      fullWidth
                      disabled={generatingCode}
                    >
                      {generatingCode ? 'Gerando...' : 'Gerar Código de Acesso'}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                      Gere um código para o aluno criar sua conta
                    </Typography>
                  </Box>
                )}

                {student.linkedUserId && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.50', borderRadius: 2, textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <CheckCircle size={16} color="#16A34A" />
                      <Typography variant="body2" color="success.dark" fontWeight={600}>
                        Conta vinculada
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Right Column - Details */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper sx={{ borderRadius: 3 }}>
                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={activeTab} onChange={handleTabChange}>
                    {tabs.map((tab, index) => (
                      <Tab key={index} label={tab === 'Informacoes' ? 'Informacoes' : tab === 'Presenca' ? 'Presenca' : tab === 'Graduacao' ? 'Graduacao' : tab} />
                    ))}
                  </Tabs>
                </Box>

                {/* Tab: Informacoes */}
                <TabPanel value={activeTab} index={0}>
                  <Box sx={{ px: 3 }}>
                    <Grid container spacing={4}>
                      {/* Personal Info */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                          DADOS PESSOAIS
                        </Typography>

                        {student.birthDate && (
                          <InfoItem
                            icon={Calendar}
                            label="Data de Nascimento"
                            value={`${format(student.birthDate, 'dd/MM/yyyy', { locale: ptBR })}${age !== null ? ` (${age} anos)` : ''}`}
                          />
                        )}
                        {student.phone && (
                          <InfoItem
                            icon={Phone}
                            label="Telefone"
                            value={student.phone}
                          />
                        )}
                        {student.email && (
                          <InfoItem
                            icon={Mail}
                            label="Email"
                            value={student.email}
                          />
                        )}
                        {student.cpf && (
                          <InfoItem
                            icon={User}
                            label="CPF"
                            value={student.cpf}
                          />
                        )}
                      </Grid>

                      {/* Jiu-Jitsu Info */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                          JIU-JITSU
                        </Typography>

                        <InfoItem
                          icon={Calendar}
                          label="Inicio do Treino"
                          value={format(student.startDate, 'dd/MM/yyyy', { locale: ptBR })}
                        />
                        <InfoItem
                          icon={Award}
                          label="Faixa Atual"
                          value={`${beltLabels[student.currentBelt]} - ${student.currentStripes} grau`}
                        />
                        <InfoItem
                          icon={User}
                          label="Categoria"
                          value={student.category === 'kids' ? 'Kids' : 'Adulto'}
                        />
                        <InfoItem
                          icon={ClipboardCheck}
                          label="Total de Treinos"
                          value={totalAttendanceCount !== null ? `${totalAttendanceCount} treinos` : 'Carregando...'}
                        />
                        {studentHasPlan ? (
                          <InfoItem
                            icon={DollarSign}
                            label="Mensalidade"
                            value={`R$ ${student.tuitionValue?.toLocaleString('pt-BR') || '0'} - Dia ${student.tuitionDay}`}
                          />
                        ) : (
                          <InfoItem
                            icon={DollarSign}
                            label="Plano"
                            value="Projeto Social (Gratuito)"
                          />
                        )}
                      </Grid>

                      {/* Address */}
                      {student.address && (
                        <Grid size={12}>
                          <Divider sx={{ mb: 2 }} />
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            ENDERECO
                          </Typography>
                          <InfoItem
                            icon={MapPin}
                            label="Endereco"
                            value={
                              `${student.address.street}, ${student.address.number}` +
                              (student.address.complement ? ` - ${student.address.complement}` : '') +
                              ` - ${student.address.neighborhood}, ${student.address.city}/${student.address.state}`
                            }
                          />
                        </Grid>
                      )}

                      {/* Guardian (Kids) */}
                      {student.guardian && (
                        <Grid size={12}>
                          <Divider sx={{ mb: 2 }} />
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            RESPONSAVEL
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <InfoItem
                                icon={User}
                                label="Nome"
                                value={student.guardian.name}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <InfoItem
                                icon={Phone}
                                label="Telefone"
                                value={student.guardian.phone}
                              />
                            </Grid>
                          </Grid>
                        </Grid>
                      )}

                      {/* Medical Info */}
                      {(student.healthNotes || student.bloodType || student.allergies?.length) && (
                        <Grid size={12}>
                          <Divider sx={{ mb: 2 }} />
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            INFORMACOES MEDICAS
                          </Typography>
                          {student.bloodType && (
                            <InfoItem
                              icon={Heart}
                              label="Tipo Sanguineo"
                              value={student.bloodType}
                            />
                          )}
                          {student.allergies && student.allergies.length > 0 && (
                            <InfoItem
                              icon={AlertCircle}
                              label="Alergias"
                              value={student.allergies.join(', ')}
                            />
                          )}
                          {student.healthNotes && (
                            <InfoItem
                              icon={Heart}
                              label="Observacoes de Saude"
                              value={student.healthNotes}
                            />
                          )}
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </TabPanel>

                {/* Tab: Presenca */}
                <TabPanel value={activeTab} index={tabs.indexOf('Presenca')}>
                  <Box sx={{ px: 3 }}>
                    {/* Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Card sx={{ bgcolor: 'primary.50', borderRadius: 2 }}>
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <ClipboardCheck size={18} color="#1976d2" />
                              <Typography variant="body2" color="primary.dark">Total de Presenças</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} color="primary.dark">
                              {totalAttendanceCount !== null ? totalAttendanceCount : '-'}
                            </Typography>
                            {student?.initialAttendanceCount ? (
                              <Typography variant="caption" color="text.secondary">
                                ({attendanceRecords.length} no sistema + {student.initialAttendanceCount} anteriores)
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                treinos registrados
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Card sx={{ bgcolor: 'success.50', borderRadius: 2 }}>
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Calendar size={18} color="#16A34A" />
                              <Typography variant="body2" color="success.dark">Este Mês</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} color="success.dark">
                              {attendanceRecords.filter(a => {
                                const date = new Date(a.date);
                                const now = new Date();
                                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                              }).length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              presenças
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Divider sx={{ mb: 2 }} />

                    {/* Attendance List */}
                    {loadingAttendance ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : attendanceRecords.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <ClipboardCheck size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma presença registrada no sistema
                        </Typography>
                        {student?.initialAttendanceCount ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            (Possui {student.initialAttendanceCount} treinos anteriores cadastrados)
                          </Typography>
                        ) : null}
                      </Box>
                    ) : (
                      <List disablePadding>
                        {attendanceRecords.map((record) => (
                          <ListItem
                            key={record.id}
                            sx={{
                              px: 2,
                              py: 1.5,
                              borderRadius: 2,
                              mb: 1,
                              bgcolor: 'action.hover',
                            }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                bgcolor: 'success.100',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mr: 2,
                              }}
                            >
                              <CheckCircle size={18} color="#16A34A" />
                            </Box>
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight={600}>
                                  {format(new Date(record.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {record.className || 'Treino'}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </TabPanel>

                {/* Tab: Financeiro - Only shown if student has a plan */}
                {studentHasPlan && (
                <TabPanel value={activeTab} index={tabs.indexOf('Financeiro')}>
                  <Box sx={{ px: 3 }}>
                    {/* Financial Stats */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card sx={{ bgcolor: 'success.50', borderRadius: 2 }}>
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <CheckCircle size={18} color="#16A34A" />
                              <Typography variant="body2" color="success.dark">Pago</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} color="success.dark">
                              R$ {financialStats.paidAmount.toLocaleString('pt-BR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {financialStats.paidCount} pagamentos
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card sx={{ bgcolor: 'warning.50', borderRadius: 2 }}>
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Clock size={18} color="#CA8A04" />
                              <Typography variant="body2" color="warning.dark">Pendente</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} color="warning.dark">
                              R$ {financialStats.pendingAmount.toLocaleString('pt-BR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {financialStats.pendingCount} pendentes
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Card sx={{ bgcolor: 'error.50', borderRadius: 2 }}>
                          <CardContent sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <AlertCircle size={18} color="#DC2626" />
                              <Typography variant="body2" color="error.dark">Atrasado</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={700} color="error.dark">
                              R$ {financialStats.overdueAmount.toLocaleString('pt-BR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {financialStats.overdueCount} atrasados
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Divider sx={{ mb: 2 }} />

                    {/* Financial List */}
                    {loadingFinancials ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : studentFinancials.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <DollarSign size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          Nenhum registro financeiro
                        </Typography>
                      </Box>
                    ) : (
                      <List disablePadding>
                        {studentFinancials.map((payment) => (
                          <ListItem
                            key={payment.id}
                            sx={{
                              px: 2,
                              py: 1.5,
                              bgcolor: payment.status === 'overdue' ? 'error.50' : payment.status === 'pending' ? 'warning.50' : 'transparent',
                              borderRadius: 2,
                              mb: 1,
                            }}
                            secondaryAction={
                              payment.status !== 'paid' && payment.status !== 'cancelled' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<CreditCard size={14} />}
                                  onClick={() => handleOpenPaymentDialog(payment)}
                                >
                                  Dar Baixa
                                </Button>
                              )
                            }
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {payment.description}
                                  </Typography>
                                  <Chip
                                    label={payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : payment.status === 'overdue' ? 'Atrasado' : 'Cancelado'}
                                    size="small"
                                    color={payment.status === 'paid' ? 'success' : payment.status === 'pending' ? 'warning' : payment.status === 'overdue' ? 'error' : 'default'}
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Venc: {format(payment.dueDate, 'dd/MM/yyyy')}
                                    {payment.paymentDate && ` | Pago: ${format(payment.paymentDate, 'dd/MM/yyyy')}`}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700}>
                                    R$ {payment.amount.toLocaleString('pt-BR')}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </TabPanel>
                )}

                {/* Tab: Graduacao */}
                <TabPanel value={activeTab} index={tabs.indexOf('Graduacao')}>
                  <Box sx={{ px: 3 }}>
                    {/* Current Belt */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Faixa Atual
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <BeltDisplay
                            belt={student.currentBelt}
                            stripes={student.currentStripes}
                            size="large"
                            showLabel
                          />
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<TrendingUp size={18} />}
                        onClick={handleOpenGraduationDialog}
                      >
                        Graduar
                      </Button>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Belt Progression */}
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Progressao de Faixas - {isKidsStudent ? 'Kids' : 'Adulto'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {beltOptions.map((belt, index) => {
                        const isCurrent = belt.value === student.currentBelt;
                        const isPassed = beltOptions.findIndex(b => b.value === student.currentBelt) > index;
                        return (
                          <Box
                            key={belt.value}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 1,
                              p: 2,
                              borderRadius: 2,
                              bgcolor: isCurrent ? 'primary.50' : isPassed ? 'success.50' : 'action.hover',
                              border: isCurrent ? '2px solid' : 'none',
                              borderColor: 'primary.main',
                              opacity: isPassed || isCurrent ? 1 : 0.5,
                            }}
                          >
                            <BeltDisplay belt={belt.value} stripes={isCurrent ? student.currentStripes : 0} size="medium" />
                            <Typography variant="caption" fontWeight={isCurrent ? 700 : 400}>
                              {belt.label}
                            </Typography>
                            {isPassed && <CheckCircle size={16} color="#16A34A" />}
                            {isCurrent && <Typography variant="caption" color="primary">Atual</Typography>}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </TabPanel>

                {/* Tab: Comportamento (Kids only) */}
                {isKidsStudent && (
                  <TabPanel value={activeTab} index={tabs.indexOf('Comportamento')}>
                    <Box sx={{ px: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            Nova Avaliacao de Comportamento
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Avalie o desempenho e comportamento do aluno
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">
                            Nota Geral
                          </Typography>
                          <Typography
                            variant="h4"
                            fontWeight={700}
                            sx={{
                              color: overallScore >= 4 ? 'success.main' : overallScore >= 3 ? 'warning.main' : 'error.main',
                            }}
                          >
                            {overallScore.toFixed(1)}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ mb: 3 }} />

                      {/* Assessment Categories */}
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 8 }}>
                          {assessmentCategories.map((category) => (
                            <StarRating
                              key={category.key}
                              value={assessmentScores[category.key]}
                              onChange={(value) => handleScoreChange(category.key, value)}
                              label={category.label}
                              description={category.description}
                            />
                          ))}
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                          <Card sx={{ bgcolor: 'action.hover', height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Resumo
                              </Typography>
                              <List dense disablePadding>
                                {assessmentCategories.map((category) => (
                                  <ListItem key={category.key} disablePadding sx={{ py: 0.5 }}>
                                    <ListItemText
                                      primary={category.label}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Star size={14} fill="#EAB308" color="#EAB308" />
                                      <Typography variant="body2" fontWeight={600}>
                                        {assessmentScores[category.key]}
                                      </Typography>
                                    </Box>
                                  </ListItem>
                                ))}
                              </List>
                              <Divider sx={{ my: 2 }} />
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  Media
                                </Typography>
                                <Typography
                                  variant="h6"
                                  fontWeight={700}
                                  sx={{
                                    color: overallScore >= 4 ? 'success.main' : overallScore >= 3 ? 'warning.main' : 'error.main',
                                  }}
                                >
                                  {overallScore.toFixed(1)}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>

                      {/* Notes */}
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Observacoes
                        </Typography>
                        <Box
                          component="textarea"
                          value={assessmentNotes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssessmentNotes(e.target.value)}
                          placeholder="Adicione observacoes sobre o comportamento do aluno..."
                          sx={{
                            width: '100%',
                            minHeight: 100,
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            fontFamily: 'inherit',
                            fontSize: '0.875rem',
                            resize: 'vertical',
                            '&:focus': {
                              outline: 'none',
                              borderColor: 'primary.main',
                            },
                          }}
                        />
                      </Box>

                      {/* Save Button */}
                      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          startIcon={isSavingAssessment ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
                          onClick={handleSaveAssessment}
                          disabled={isSavingAssessment}
                        >
                          {isSavingAssessment ? 'Salvando...' : 'Salvar Avaliacao'}
                        </Button>
                      </Box>

                      {/* Assessment History */}
                      <Divider sx={{ my: 4 }} />
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <History size={20} />
                          <Typography variant="h6" fontWeight={600}>
                            Historico de Avaliacoes
                          </Typography>
                        </Box>

                        {isLoadingAssessments ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                          </Box>
                        ) : studentAssessments.length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Star size={40} style={{ color: '#9ca3af', marginBottom: 8 }} />
                            <Typography variant="body2" color="text.secondary">
                              Nenhuma avaliacao registrada ainda
                            </Typography>
                          </Box>
                        ) : (
                          <List disablePadding>
                            {studentAssessments.map((assessment) => {
                              const avgScore = calculateOverallScore(assessment.scores);
                              const performance = getPerformanceLevel(avgScore);
                              return (
                                <ListItem
                                  key={assessment.id}
                                  sx={{
                                    px: 2,
                                    py: 2,
                                    mb: 1,
                                    bgcolor: 'action.hover',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Box sx={{ width: '100%' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Calendar size={14} color="#666" />
                                        <Typography variant="body2" fontWeight={600}>
                                          {format(new Date(assessment.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </Typography>
                                      </Box>
                                      <Chip
                                        label={performance.label}
                                        size="small"
                                        sx={{
                                          bgcolor: performance.color,
                                          color: 'white',
                                          fontWeight: 600,
                                          fontSize: '0.7rem',
                                        }}
                                      />
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                                      {assessmentCategories.map((cat) => (
                                        <Box key={cat.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Typography variant="caption" color="text.secondary">
                                            {cat.label}:
                                          </Typography>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                            <Star size={12} fill="#EAB308" color="#EAB308" />
                                            <Typography variant="caption" fontWeight={600}>
                                              {assessment.scores[cat.key]}
                                            </Typography>
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                    {assessment.notes && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        &quot;{assessment.notes}&quot;
                                      </Typography>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                      Avaliado por: {assessment.evaluatedByName || 'Professor'}
                                    </Typography>
                                  </Box>
                                </ListItem>
                              );
                            })}
                          </List>
                        )}
                      </Box>
                    </Box>
                  </TabPanel>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedPayment.description}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                  R$ {selectedPayment.amount.toLocaleString('pt-BR')}
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Forma de Pagamento</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="Forma de Pagamento"
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirmPayment}
              disabled={isMarkingPaid}
              startIcon={isMarkingPaid ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
            >
              {isMarkingPaid ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Graduation Dialog */}
        <Dialog open={graduationDialogOpen} onClose={() => setGraduationDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Atualizar Graduacao</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <BeltDisplay belt={newBelt} stripes={newStripes} size="large" showLabel />
              </Box>
              <FormControl fullWidth>
                <InputLabel>Nova Faixa</InputLabel>
                <Select
                  value={newBelt}
                  label="Nova Faixa"
                  onChange={(e) => setNewBelt(e.target.value as BeltColor | KidsBeltColor)}
                >
                  {beltOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Graus</InputLabel>
                <Select
                  value={newStripes}
                  label="Graus"
                  onChange={(e) => setNewStripes(e.target.value as Stripes)}
                >
                  {[0, 1, 2, 3, 4].map((stripe) => (
                    <MenuItem key={stripe} value={stripe}>
                      {stripe} grau{stripe !== 1 ? 's' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setGraduationDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleSaveGraduation}
              disabled={savingGraduation}
              startIcon={savingGraduation ? <CircularProgress size={16} color="inherit" /> : <Award size={16} />}
            >
              {savingGraduation ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Link Code Dialog */}
        <Dialog open={linkCodeDialogOpen} onClose={() => setLinkCodeDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Link size={28} color="#1976d2" />
              </Box>
              Código de Acesso Gerado
            </Box>
          </DialogTitle>
          <DialogContent>
            {generatedLinkCode && (
              <Box sx={{ textAlign: 'center', pt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Compartilhe este código com <strong>{generatedLinkCode.studentName}</strong> para criar a conta:
                </Typography>

                <Box
                  sx={{
                    p: 3,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={700}
                    color="primary"
                    sx={{ letterSpacing: '0.3rem', fontFamily: 'monospace' }}
                  >
                    {generatedLinkCode.code}
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<Copy size={18} />}
                  onClick={handleCopyLinkCode}
                  sx={{ mb: 3 }}
                >
                  Copiar Código
                </Button>

                <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                  <Typography variant="caption" color="warning.dark">
                    Este código expira em 24 horas. O aluno deve acessar{' '}
                    <strong>/criar-conta</strong> e inserir o código para criar sua conta.
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => setLinkCodeDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeleteConfirmText('');
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trash2 size={24} />
            Excluir Aluno
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Esta acao e irreversivel!
              </Typography>
              <Typography variant="body2">
                Todos os dados do aluno serao permanentemente excluidos, incluindo historico de presencas e graduacoes.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Para confirmar a exclusao de <strong>{student?.fullName}</strong>, digite{' '}
              <strong>&quot;EXCLUIR&quot;</strong> no campo abaixo:
            </Typography>

            <TextField
              fullWidth
              placeholder="Digite EXCLUIR para confirmar"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              error={deleteConfirmText.length > 0 && deleteConfirmText !== 'EXCLUIR'}
              helperText={
                deleteConfirmText.length > 0 && deleteConfirmText !== 'EXCLUIR'
                  ? 'Digite exatamente "EXCLUIR" para confirmar'
                  : ''
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteStudent}
              disabled={deleteConfirmText !== 'EXCLUIR' || deleting}
              startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
            >
              {deleting ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogActions>
        </Dialog>
      </AppLayout>
    </ProtectedRoute>
  );
}
