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
  QrCode,
  FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { GradeDisplay } from '@/components/shared/GradeDisplay';
import { useStudent, useStudents, useFinancial, usePlans, useAssessment, useStudentAssessment } from '@/hooks';
import { getBeltChipColor } from '@/lib/theme';
import { format, differenceInMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BeltColor, KidsBeltColor, Stripes, PaymentMethod, Financial, LinkCode, FinancialPaymentLink, Plan, getClassSport, getStudentGrade, getStudentPrimarySport } from '@/types';
import { SPORTS, getGradesForSport, getGradeLabel, SportId } from '@/lib/constants/sports';
import { getBeltLabel } from '@/lib/constants/belts';
import { generateAthleteCurriculumPDF } from '@/lib/pdfGenerator';
import { createFinancialService, createAttendanceService, createStudentService } from '@/services';
import { createClassService } from '@/services/classService';
import { getStudentDueDay } from '@/services/planService';
import { createAbacatePayService } from '@/services/abacatePayService';
import { Attendance } from '@/types';
import { createLinkCodeService } from '@/services/linkCodeService';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import QRCode from 'qrcode';

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

  const { user, firebaseUser } = useAuth();
  const { academy } = useAcademy();
  const { success: showSuccess, error: showError } = useFeedback();
  const { student, isLoading, refresh: refreshStudent } = useStudent(studentId);
  const { updateBelt, updateSportGrade } = useStudents({ autoLoad: false });
  const { markAsPaid, isMarkingPaid } = useFinancial({ autoLoad: false });
  const { plans, setCustomValue, removeCustomValue, isSettingCustomValue, setCustomDueDay, removeCustomDueDay } = usePlans();

  // Check if AbacatePay is enabled
  const [abacatePayEnabled, setAbacatePayEnabled] = useState(false);
  useEffect(() => {
    if (academy?.id) {
      const service = createAbacatePayService(academy.id);
      service.isEnabled().then(setAbacatePayEnabled);
    }
  }, [academy?.id]);

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
  const [attendanceSportFilter, setAttendanceSportFilter] = useState<SportId | ''>('');
  const [attendanceClasses, setAttendanceClasses] = useState<{ id: string; sport: SportId }[]>([]);

  // Financial state
  const [studentFinancials, setStudentFinancials] = useState<Financial[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Financial | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  // PIX Payment state
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [pixPaymentLink, setPixPaymentLink] = useState<FinancialPaymentLink | null>(null);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [pixCopied, setPixCopied] = useState(false);

  // Graduation dialog state
  const [graduationDialogOpen, setGraduationDialogOpen] = useState(false);
  const [newBelt, setNewBelt] = useState<BeltColor | KidsBeltColor>('white');
  const [newStripes, setNewStripes] = useState<Stripes>(0);
  const [graduationDate, setGraduationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savingGraduation, setSavingGraduation] = useState(false);

  // Curriculum PDF state
  const [generatingCurriculum, setGeneratingCurriculum] = useState(false);

  // Link code dialog state
  const [linkCodeDialogOpen, setLinkCodeDialogOpen] = useState(false);
  const [generatedLinkCode, setGeneratedLinkCode] = useState<LinkCode | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Custom value dialog state
  const [customValueDialogOpen, setCustomValueDialogOpen] = useState(false);
  const [customValuePlan, setCustomValuePlan] = useState<Plan | null>(null);
  const [customValueInput, setCustomValueInput] = useState('');
  const [customDueDayInput, setCustomDueDayInput] = useState('');

  // Student plans
  const studentPlans = useMemo(() => {
    if (!studentId) return [];
    return plans.filter(plan => plan.studentIds?.includes(studentId));
  }, [studentId, plans]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Determine if student is kids category
  const isKidsStudent = student?.category === 'kids';
  const beltOptions = isKidsStudent ? kidsBeltOptions : adultBeltOptions;

  // Always derive sports from current class memberships (keeps student.sports in sync)
  const [classSports, setClassSports] = useState<SportId[]>([]);
  const [classSportsLoaded, setClassSportsLoaded] = useState(false);
  useEffect(() => {
    if (!studentId || !academy?.id) return;
    const classService = createClassService(academy.id);
    classService.getByStudent(studentId).then((classes) => {
      const sports = [...new Set(classes.map((c) => getClassSport(c)))] as SportId[];
      setClassSports(sports);
      setClassSportsLoaded(true);
      // Sync back to keep student.sports current (including clearing stale values)
      const studentService = createStudentService(academy.id);
      studentService.update(studentId, { sports }).catch(() => {/* silent */});
    }).catch(() => { setClassSportsLoaded(true); });
  }, [studentId, academy?.id]);

  // Effective sports: current class-derived sports (always fresh)
  // Sorted so the primary sport comes first
  const effectiveSports = useMemo(() => {
    if (!classSportsLoaded) return [];  // wait for classes to load before deciding
    const sports: SportId[] = classSports;
    if (!student) return sports;
    const primary = getStudentPrimarySport(student);
    return [...sports].sort((a, b) => {
      if (a === primary) return -1;
      if (b === primary) return 1;
      return 0;
    });
  }, [student, classSports]);

  // Build tabs based on category and plan status
  const tabs = useMemo(() => {
    const baseTabs = ['Informacoes', 'Presenca'];
    // Only show Financeiro tab if student has a plan linked
    if (studentHasPlan) {
      baseTabs.push('Financeiro');
    }

    // Add a graduation tab for each sport the student practices
    effectiveSports.forEach((sportId) => {
      const sportName = SPORTS[sportId]?.label || sportId;
      baseTabs.push(`Graduação - ${sportName}`);
    });

    if (isKidsStudent) {
      baseTabs.push('Comportamento');
    }
    return baseTabs;
  }, [isKidsStudent, studentHasPlan, effectiveSports]);

  // Load student attendance when tab changes to Presenca
  useEffect(() => {
    const presencaTabIndex = tabs.indexOf('Presenca');
    if (activeTab === presencaTabIndex && presencaTabIndex !== -1 && studentId && academy?.id) {
      setLoadingAttendance(true);
      const attendanceService = createAttendanceService(academy.id);
      attendanceService.getByStudent(studentId, 100).then((data) => {
        setAttendanceRecords(data);
        setLoadingAttendance(false);
      }).catch(() => {
        setLoadingAttendance(false);
      });
      // Also load classes to build classId→sport map for attendance filtering
      const classService = createClassService(academy.id);
      classService.getByStudent(studentId).then((classes) => {
        setAttendanceClasses(classes.map((c) => ({ id: c.id, sport: getClassSport(c) })));
      }).catch(() => {/* silent */});
    }
  }, [activeTab, studentId, tabs, academy?.id]);

  // Attendance classId→sport map and filtered records
  const attendanceClassSportMap = useMemo(() => {
    const map: Record<string, SportId> = {};
    attendanceClasses.forEach((c) => { map[c.id] = c.sport; });
    return map;
  }, [attendanceClasses]);

  const attendanceSportsList = useMemo(() => {
    const sports = new Set<SportId>();
    attendanceRecords.forEach((r) => {
      sports.add(attendanceClassSportMap[r.classId] || 'bjj');
    });
    return [...sports];
  }, [attendanceRecords, attendanceClassSportMap]);

  const filteredAttendanceRecords = useMemo(() => {
    if (!attendanceSportFilter) return attendanceRecords;
    return attendanceRecords.filter((r) => {
      return (attendanceClassSportMap[r.classId] || 'bjj') === attendanceSportFilter;
    });
  }, [attendanceRecords, attendanceSportFilter, attendanceClassSportMap]);

  const showAttendanceSportFilter = attendanceSportsList.length > 1;

  // Load student financials when tab changes to Financeiro
  useEffect(() => {
    const financeiroTabIndex = tabs.indexOf('Financeiro');
    if (activeTab === financeiroTabIndex && financeiroTabIndex !== -1 && studentId && academy?.id) {
      setLoadingFinancials(true);
      const financialService = createFinancialService(academy.id);
      financialService.getByStudent(studentId).then((data) => {
        setStudentFinancials(data);
        setLoadingFinancials(false);
      });
    }
  }, [activeTab, studentId, tabs, academy?.id]);

  // Initialize graduation dialog with current values
  useEffect(() => {
    if (student) {
      setNewBelt(student.currentBelt);
      setNewStripes(student.currentStripes);
    }
  }, [student]);

  // Load total attendance count
  useEffect(() => {
    if (student && studentId && academy?.id) {
      const attendanceService = createAttendanceService(academy.id);
      attendanceService.getTotalStudentAttendanceCount(
        studentId,
        student.initialAttendanceCount || 0
      ).then(setTotalAttendanceCount).catch(() => setTotalAttendanceCount(null));
    }
  }, [student, studentId, academy?.id]);

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
    if (!selectedPayment || !academy?.id) return;
    try {
      await markAsPaid({ id: selectedPayment.id, method: paymentMethod });
      // Refresh financials
      const financialService = createFinancialService(academy.id);
      const data = await financialService.getByStudent(studentId);
      setStudentFinancials(data);
      setPaymentDialogOpen(false);
      setSelectedPayment(null);
    } catch {
      // Error handled by hook
    }
  }, [selectedPayment, paymentMethod, markAsPaid, studentId, academy?.id]);

  // Handle PIX payment generation
  const handleGeneratePix = useCallback(async (payment: Financial) => {
    if (!academy?.id || !student || !firebaseUser) return;

    setSelectedPayment(payment);
    setPixPaymentLink(null);
    setQrCodeUrl('');
    setPixDialogOpen(true);
    setGeneratingPix(true);

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/payments/create-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          academyId: academy.id,
          amount: Math.round(payment.amount * 100),
          description: payment.description || `Mensalidade - ${payment.referenceMonth || ''}`,
          financialId: payment.id,
          studentId,
          studentName: student.fullName || student.nickname || 'Aluno',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao gerar pagamento PIX');
      }

      const result = await response.json();
      const link = result.data as FinancialPaymentLink;
      setPixPaymentLink(link);

      // Generate QR code
      if (link?.pixCode) {
        const qr = await QRCode.toDataURL(link.pixCode, { width: 256 });
        setQrCodeUrl(qr);
      }
    } catch (err) {
      console.error('Error generating PIX payment:', err);
      showError(err instanceof Error ? err.message : 'Erro ao gerar pagamento PIX');
    } finally {
      setGeneratingPix(false);
    }
  }, [academy?.id, student, studentId, firebaseUser, showError]);

  const handleCopyPixCode = useCallback(() => {
    if (pixPaymentLink?.pixCode) {
      navigator.clipboard.writeText(pixPaymentLink.pixCode);
      setPixCopied(true);
      showSuccess('Codigo PIX copiado!');
      setTimeout(() => setPixCopied(false), 2000);
    }
  }, [pixPaymentLink?.pixCode, showSuccess]);

  // Handle graduation
  const [graduationSportId, setGraduationSportId] = useState<SportId | null>(null);

  const handleOpenGraduationDialog = useCallback((sportId: SportId) => {
    if (student) {
      setGraduationSportId(sportId);
      const gradeInfo = getStudentGrade(student, sportId);
      setNewBelt((gradeInfo?.currentGrade || 'white') as any);
      setNewStripes((gradeInfo?.currentStripes || 0) as Stripes);
      setGraduationDate(new Date().toISOString().split('T')[0]);
      setGraduationDialogOpen(true);
    }
  }, [student]);

  const handleSaveGraduation = useCallback(async () => {
    if (!student || !graduationSportId) return;
    setSavingGraduation(true);
    try {
      await updateSportGrade({
        id: studentId,
        sportId: graduationSportId,
        newGrade: newBelt,
        newStripes: newStripes,
        graduationDate: new Date(graduationDate + 'T12:00:00'),
      });
      refreshStudent();
      setGraduationDialogOpen(false);
      setGraduationSportId(null);
    } catch {
      // Error handled by hook
    } finally {
      setSavingGraduation(false);
    }
  }, [student, studentId, graduationSportId, newBelt, newStripes, updateSportGrade, refreshStudent]);

  // Handle generate curriculum PDF
  const handleGenerateCurriculumPDF = useCallback(async () => {
    if (!student) return;
    setGeneratingCurriculum(true);
    try {
      // Convert photo to base64 if available
      let photoBase64: string | undefined;
      if (student.photoUrl) {
        try {
          const response = await fetch(student.photoUrl);
          const blob = await response.blob();
          photoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          // Photo fetch failed, proceed without
        }
      }

      // Get student classes
      const classService = createClassService(academy?.id || 'default');
      const studentClasses = await classService.getByStudent(studentId);

      // Build sports data
      const sportsData = (student.sports || []).map(sportId => {
        const sportConfig = SPORTS[sportId];
        const sportData = student.sportData?.[sportId];
        return {
          sportName: sportConfig?.label || sportId,
          currentGrade: sportData?.currentGrade ? getBeltLabel(sportData.currentGrade) : getBeltLabel(student.currentBelt),
          currentStripes: sportData?.currentStripes ?? student.currentStripes,
        };
      });

      // Calculate age
      let age: number | undefined;
      if (student.birthDate) {
        const today = new Date();
        const birth = student.birthDate instanceof Date ? student.birthDate : new Date(student.birthDate);
        age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
      }

      const doc = generateAthleteCurriculumPDF({
        academyName: academy?.name || 'Academia',
        student: {
          fullName: student.fullName,
          nickname: student.nickname,
          photoBase64,
          birthDate: student.birthDate ? (student.birthDate instanceof Date ? student.birthDate : new Date(student.birthDate)) : undefined,
          age,
          cpf: student.cpf,
          rg: student.rg,
          phone: student.phone,
          email: student.email,
          category: student.category,
          weight: student.weight,
          address: student.address,
          guardian: student.guardian,
          currentBelt: student.currentBelt,
          currentStripes: student.currentStripes,
          jiujitsuStartDate: student.jiujitsuStartDate ? (student.jiujitsuStartDate instanceof Date ? student.jiujitsuStartDate : new Date(student.jiujitsuStartDate)) : undefined,
          startDate: student.startDate ? (student.startDate instanceof Date ? student.startDate : new Date(student.startDate)) : undefined,
          attendanceCount: (student.initialAttendanceCount || 0) + (student.attendanceCount || 0),
          bloodType: student.bloodType,
          allergies: student.allergies,
          healthNotes: student.healthNotes,
          emergencyContact: student.emergencyContact,
          beltHistory: student.beltHistory?.map(h => ({
            belt: h.belt,
            stripes: h.stripes,
            date: h.date instanceof Date ? h.date : new Date(h.date),
            notes: h.notes,
          })),
          sports: sportsData.length > 0 ? sportsData : undefined,
          classes: studentClasses.map(c => c.name),
          status: student.status,
        },
      });

      const fileName = `Curriculo_${student.fullName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar currículo:', err);
    } finally {
      setGeneratingCurriculum(false);
    }
  }, [student, studentId, academy]);

  // Handle generate link code
  const handleGenerateLinkCode = useCallback(async () => {
    if (!student || !user || !academy?.id) return;
    setGeneratingCode(true);
    try {
      const linkCodeService = createLinkCodeService(academy.id);
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
  }, [student, studentId, user, showError, academy?.id]);

  // Handle copy link code
  const handleCopyLinkCode = useCallback(() => {
    if (generatedLinkCode) {
      navigator.clipboard.writeText(generatedLinkCode.code);
      showSuccess('Código copiado!');
    }
  }, [generatedLinkCode, showSuccess]);

  // Handle delete student
  const handleDeleteStudent = useCallback(async () => {
    if (!student || !academy?.id) return;

    setDeleting(true);
    try {
      const studentService = createStudentService(academy.id);
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
        <AppLayout>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
        <AppLayout>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={handleBack} size="small">
                <ArrowLeft size={20} />
              </IconButton>
              <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>
                Perfil do Aluno
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleGenerateCurriculumPDF}
              disabled={generatingCurriculum || !student}
              startIcon={generatingCurriculum ? <CircularProgress size={16} color="inherit" /> : <FileText size={16} />}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {generatingCurriculum ? 'Gerando...' : 'Currículo do Atleta'}
            </Button>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Left Column - Profile Card */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
                {/* Mobile: horizontal layout; Desktop: vertical centered */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    alignItems: { xs: 'center', md: 'center' },
                    gap: { xs: 2, md: 0 },
                    textAlign: { xs: 'left', md: 'center' },
                    mb: { xs: 2, md: 0 },
                  }}
                >
                  {/* Avatar */}
                  <Avatar
                    src={student.photoUrl}
                    sx={{
                      width: { xs: 72, md: 120 },
                      height: { xs: 72, md: 120 },
                      bgcolor: beltColor.bg,
                      color: beltColor.text,
                      fontSize: { xs: '1.5rem', md: '2.5rem' },
                      fontWeight: 600,
                      mx: { xs: 0, md: 'auto' },
                      mb: { xs: 0, md: 2 },
                      flexShrink: 0,
                    }}
                  >
                    {student.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </Avatar>

                  {/* Name + Grades */}
                  <Box sx={{ flex: { xs: 1, md: 'none' }, minWidth: 0 }}>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      gutterBottom
                      sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' }, mb: 0.5 }}
                    >
                      {student.nickname || student.fullName.split(' ')[0]}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      noWrap
                      sx={{ display: { xs: 'block', md: 'block' } }}
                    >
                      {student.fullName}
                    </Typography>

                    {/* Grades — inline on mobile */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'row', md: 'column' },
                        alignItems: { xs: 'center', md: 'center' },
                        justifyContent: { xs: 'flex-start', md: 'center' },
                        gap: 1,
                        flexWrap: 'wrap',
                        mt: { xs: 0.5, md: 2 },
                        mb: { xs: 0, md: 2 },
                      }}
                    >
                      {effectiveSports.map((sportId) => {
                        const gradeInfo = getStudentGrade(student, sportId);
                        if (!gradeInfo?.currentGrade) return null;
                        return (
                          <GradeDisplay
                            key={sportId}
                            sportId={sportId}
                            grade={gradeInfo.currentGrade}
                            stripes={gradeInfo.currentStripes}
                            size="medium"
                            showLabel
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </Box>

                {/* Status + Training Time */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                    mb: 2,
                    justifyContent: { xs: 'flex-start', md: 'center' },
                  }}
                >
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
                  />
                  {trainingTime && (
                    <Chip
                      icon={<Clock size={12} />}
                      label={trainingTime}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Phone size={16} />}
                    onClick={handleWhatsApp}
                    fullWidth
                    color="success"
                    size="small"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Edit size={16} />}
                    onClick={handleEdit}
                    fullWidth
                    size="small"
                  >
                    Editar
                  </Button>
                </Box>

                {/* Delete Button */}
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 size={16} />}
                    onClick={() => setDeleteDialogOpen(true)}
                    fullWidth
                    size="small"
                  >
                    Excluir Aluno
                  </Button>
                </Box>

                {/* Link Code Button */}
                {!student.linkedUserId && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={generatingCode ? <CircularProgress size={16} /> : <Link size={16} />}
                      onClick={handleGenerateLinkCode}
                      fullWidth
                      disabled={generatingCode}
                      size="small"
                    >
                      {generatingCode ? 'Gerando...' : 'Gerar Código de Acesso'}
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                      Gere um código para o aluno criar sua conta
                    </Typography>
                  </Box>
                )}

                {student.linkedUserId && (
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: 'success.50', borderRadius: 2, textAlign: 'center' }}>
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
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {tabs.map((tab, index) => (
                      <Tab key={index} label={tab} />
                    ))}
                  </Tabs>
                </Box>

                {/* Tab: Informacoes */}
                <TabPanel value={activeTab} index={0}>
                  <Box sx={{ px: { xs: 1.5, sm: 3 } }}>
                    <Grid container spacing={{ xs: 2, sm: 4 }}>
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

                      {/* Sports Info — dynamic per sport */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        {effectiveSports.map((sportId, idx) => {
                          const sportDef = SPORTS[sportId];
                          const gradeInfo = getStudentGrade(student, sportId);
                          const sportStartDate =
                            student.sportData?.[sportId]?.startDate ??
                            (idx === 0 ? student.startDate : undefined);
                          const hasGrade = sportDef.gradeSystem !== 'none';

                          return (
                            <Box key={sportId}>
                              {idx > 0 && <Divider sx={{ my: 2 }} />}
                              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                {sportDef.label.toUpperCase()}
                              </Typography>

                              {sportStartDate && (
                                <InfoItem
                                  icon={Calendar}
                                  label="Início do Treino"
                                  value={format(sportStartDate, 'dd/MM/yyyy', { locale: ptBR })}
                                />
                              )}

                              {hasGrade && gradeInfo && (
                                <InfoItem
                                  icon={Award}
                                  label={sportId === 'bjj' ? 'Faixa Atual' : 'Graduação Atual'}
                                  value={
                                    sportDef.supportsStripes
                                      ? `${getGradeLabel(sportId, gradeInfo.currentGrade)} - ${gradeInfo.currentStripes} grau`
                                      : getGradeLabel(sportId, gradeInfo.currentGrade)
                                  }
                                />
                              )}

                              {sportId === 'bjj' && (
                                <InfoItem
                                  icon={User}
                                  label="Categoria"
                                  value={student.category === 'kids' ? 'Kids' : 'Adulto'}
                                />
                              )}
                            </Box>
                          );
                        })}

                        <Divider sx={{ my: 2 }} />

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
                  <Box sx={{ px: { xs: 1.5, sm: 3 } }}>
                    {/* Sport Filter Chips */}
                    {showAttendanceSportFilter && (
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label="Todos"
                          size="small"
                          variant={attendanceSportFilter === '' ? 'filled' : 'outlined'}
                          color={attendanceSportFilter === '' ? 'primary' : 'default'}
                          onClick={() => setAttendanceSportFilter('')}
                        />
                        {attendanceSportsList.map((sportId) => (
                          <Chip
                            key={sportId}
                            label={SPORTS[sportId]?.labelShort || sportId}
                            size="small"
                            variant={attendanceSportFilter === sportId ? 'filled' : 'outlined'}
                            color={attendanceSportFilter === sportId ? 'primary' : 'default'}
                            onClick={() => setAttendanceSportFilter(sportId)}
                          />
                        ))}
                      </Box>
                    )}

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
                              {!attendanceSportFilter && totalAttendanceCount !== null ? totalAttendanceCount : filteredAttendanceRecords.length}
                            </Typography>
                            {!attendanceSportFilter && student?.initialAttendanceCount ? (
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
                              {filteredAttendanceRecords.filter(a => {
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
                    ) : filteredAttendanceRecords.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <ClipboardCheck size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma presença registrada no sistema
                        </Typography>
                        {!attendanceSportFilter && student?.initialAttendanceCount ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            (Possui {student.initialAttendanceCount} treinos anteriores cadastrados)
                          </Typography>
                        ) : null}
                      </Box>
                    ) : (
                      <List disablePadding>
                        {filteredAttendanceRecords.map((record) => {
                          const recordSport = attendanceClassSportMap[record.classId];
                          const sportLabel = recordSport && showAttendanceSportFilter ? SPORTS[recordSport]?.labelShort : null;
                          return (
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
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {record.className || 'Treino'}
                                    </Typography>
                                    {sportLabel && (
                                      <Chip
                                        label={sportLabel}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.6rem', height: 18, '& .MuiChip-label': { px: 0.75 } }}
                                      />
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                  </Box>
                </TabPanel>

                {/* Tab: Financeiro - Only shown if student has a plan */}
                {studentHasPlan && (
                  <TabPanel value={activeTab} index={tabs.indexOf('Financeiro')}>
                    <Box sx={{ px: { xs: 1.5, sm: 3 } }}>
                      {/* Plan & Value Section */}
                      {studentPlans.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
                            Plano e Valor
                          </Typography>
                          {studentPlans.map((plan) => {
                            const studentValue = plan.customValues?.[studentId] ?? plan.monthlyValue;
                            const hasCustomValue = plan.customValues?.[studentId] !== undefined;
                            const studentDueDay = getStudentDueDay(plan, studentId);
                            const hasCustomDueDay = plan.customDueDays?.[studentId] !== undefined;
                            return (
                              <Card key={plan.id} sx={{ mt: 1, mb: 1, borderRadius: 2 }} variant="outlined">
                                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={600}>{plan.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Valor padrão: R$ {plan.monthlyValue.toLocaleString('pt-BR')}
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Typography variant="body2" fontWeight={700} color={hasCustomValue ? 'success.main' : 'text.primary'}>
                                          Valor do aluno: R$ {studentValue.toLocaleString('pt-BR')}
                                        </Typography>
                                        {hasCustomValue && (
                                          <Chip
                                            label="Valor personalizado"
                                            size="small"
                                            color="success"
                                            sx={{ height: 20, fontSize: '0.6rem' }}
                                          />
                                        )}
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Typography variant="body2" fontWeight={700} color={hasCustomDueDay ? 'success.main' : 'text.primary'}>
                                          Vencimento: dia {studentDueDay}
                                        </Typography>
                                        {hasCustomDueDay && (
                                          <Chip
                                            label="Personalizado"
                                            size="small"
                                            color="success"
                                            sx={{ height: 20, fontSize: '0.6rem' }}
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setCustomValuePlan(plan);
                                        setCustomValueInput(studentValue.toString());
                                        setCustomDueDayInput(studentDueDay.toString());
                                        setCustomValueDialogOpen(true);
                                      }}
                                    >
                                      <Edit size={16} />
                                    </IconButton>
                                  </Box>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Box>
                      )}

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
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    {abacatePayEnabled && (
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<QrCode size={14} />}
                                        onClick={() => handleGeneratePix(payment)}
                                      >
                                        Gerar PIX
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      startIcon={<CreditCard size={14} />}
                                      onClick={() => handleOpenPaymentDialog(payment)}
                                    >
                                      Dar Baixa
                                    </Button>
                                  </Box>
                                )
                              }
                            >
                              <ListItemText
                                primaryTypographyProps={{ component: 'div' }}
                                secondaryTypographyProps={{ component: 'div' }}
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

                {/* Tabs: Graduação por Esporte */}
                {effectiveSports.map((sportId) => {
                  const sportName = SPORTS[sportId]?.label || sportId;
                  const tabName = `Graduação - ${sportName}`;
                  const tabIndex = tabs.indexOf(tabName);

                  if (tabIndex === -1) return null;

                  const gradeInfo = getStudentGrade(student, sportId);
                  const currentGrade = gradeInfo?.currentGrade;
                  const currentStripes = gradeInfo?.currentStripes || 0;

                  const sportGrades = getGradesForSport(sportId, isKidsStudent ? 'kids' : 'adult');

                  return (
                    <TabPanel key={sportId} value={activeTab} index={tabIndex}>
                      <Box sx={{ px: { xs: 1.5, sm: 3 } }}>
                        {/* Current Grade */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Graduação Atual
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {currentGrade ? (
                                <GradeDisplay
                                  sportId={sportId}
                                  grade={currentGrade}
                                  stripes={currentStripes}
                                  size="large"
                                  showLabel
                                />
                              ) : (
                                <Typography variant="body1" color="text.secondary">
                                  Nenhuma graduação registrada
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            startIcon={<TrendingUp size={18} />}
                            onClick={() => {
                              handleOpenGraduationDialog(sportId);
                            }}
                          >
                            Graduar
                          </Button>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {/* Grade Progression */}
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                          Progressão - {isKidsStudent ? 'Kids' : 'Adulto'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {sportGrades.map((gradeDef, index) => {
                            const isCurrent = gradeDef.id === currentGrade;
                            const isPassed = currentGrade ? sportGrades.findIndex(g => g.id === currentGrade) > index : false;

                            return (
                              <Box
                                key={gradeDef.id}
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
                                <GradeDisplay
                                  sportId={sportId}
                                  grade={gradeDef.id}
                                  stripes={isCurrent ? currentStripes : 0}
                                  size="medium"
                                />
                                <Typography variant="caption" fontWeight={isCurrent ? 700 : 400}>
                                  {gradeDef.label}
                                </Typography>
                                {isPassed && <CheckCircle size={16} color="#16A34A" />}
                                {isCurrent && <Typography variant="caption" color="primary">Atual</Typography>}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </TabPanel>
                  );
                })}

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

        {/* PIX Payment Dialog */}
        <Dialog open={pixDialogOpen} onClose={() => setPixDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={600}>
                Pagamento PIX
              </Typography>
              {selectedPayment && (
                <Typography variant="body2" color="text.secondary">
                  {selectedPayment.description} - R$ {selectedPayment.amount.toLocaleString('pt-BR')}
                </Typography>
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {generatingPix ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Gerando QR Code...
                </Typography>
              </Box>
            ) : pixPaymentLink?.pixCode ? (
              <Box sx={{ textAlign: 'center' }}>
                {qrCodeUrl ? (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'white',
                      borderRadius: 2,
                      display: 'inline-block',
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'grey.200',
                    }}
                  >
                    <img src={qrCodeUrl} alt="QR Code PIX" style={{ display: 'block' }} />
                  </Box>
                ) : (
                  <Skeleton variant="rectangular" width={256} height={256} sx={{ mx: 'auto', mb: 2 }} />
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Escaneie o QR Code ou copie o codigo PIX
                </Typography>

                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={pixCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
                  onClick={handleCopyPixCode}
                  color={pixCopied ? 'success' : 'primary'}
                >
                  {pixCopied ? 'Copiado!' : 'Copiar Codigo PIX'}
                </Button>

                <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                  Apos o pagamento, o status sera atualizado automaticamente via webhook.
                </Alert>
              </Box>
            ) : (
              <Alert severity="error">
                Erro ao gerar pagamento. Tente novamente.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setPixDialogOpen(false)} fullWidth>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Graduation Dialog */}
        <Dialog open={graduationDialogOpen} onClose={() => {
          setGraduationDialogOpen(false);
          setGraduationSportId(null);
        }} maxWidth="xs" fullWidth>
          <DialogTitle>Atualizar Graduação {graduationSportId ? `- ${SPORTS[graduationSportId]?.label}` : ''}</DialogTitle>
          <DialogContent>
            {graduationSportId && (
              <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <GradeDisplay
                    sportId={graduationSportId}
                    grade={newBelt}
                    stripes={newStripes}
                    size="large"
                    showLabel
                  />
                </Box>
                <FormControl fullWidth>
                  <InputLabel>Nova Graduação</InputLabel>
                  <Select
                    value={newBelt}
                    label="Nova Graduação"
                    onChange={(e) => setNewBelt(e.target.value as any)}
                  >
                    {getGradesForSport(graduationSportId, isKidsStudent ? 'kids' : 'adult').map((opt) => (
                      <MenuItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {SPORTS[graduationSportId]?.supportsStripes && (
                  <FormControl fullWidth>
                    <InputLabel>Graus</InputLabel>
                    <Select
                      value={newStripes}
                      label="Graus"
                      onChange={(e) => setNewStripes(Number(e.target.value) as Stripes)}
                    >
                      {[0, 1, 2, 3, 4].map((stripe) => {
                        const maxStripe = getGradesForSport(graduationSportId, isKidsStudent ? 'kids' : 'adult').find(g => g.id === newBelt)?.maxStripes || 0;
                        if (stripe > maxStripe) return null;
                        return (
                          <MenuItem key={stripe} value={stripe}>
                            {stripe} grau{stripe !== 1 ? 's' : ''}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                )}
                <TextField
                  fullWidth
                  label="Data da Graduação"
                  type="date"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => {
              setGraduationDialogOpen(false);
              setGraduationSportId(null);
            }}>Cancelar</Button>
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
        {/* Custom Value Dialog */}
        <Dialog
          open={customValueDialogOpen}
          onClose={() => setCustomValueDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            Valor e Vencimento - {customValuePlan?.name}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Valor padrão do plano: R$ {customValuePlan?.monthlyValue.toLocaleString('pt-BR')}
            </Typography>
            <TextField
              fullWidth
              label="Valor do aluno"
              type="number"
              value={customValueInput}
              onChange={(e) => setCustomValueInput(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
              }}
              sx={{ mb: 1 }}
            />
            {customValuePlan?.customValues?.[studentId] !== undefined && (
              <Button
                size="small"
                startIcon={<History size={14} />}
                onClick={async () => {
                  if (!customValuePlan) return;
                  setCustomValueDialogOpen(false);
                  await removeCustomValue({ planId: customValuePlan.id, studentId });
                }}
                disabled={isSettingCustomValue}
              >
                Restaurar valor do plano
              </Button>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
              Vencimento padrão do plano: dia {customValuePlan?.defaultDueDay}
            </Typography>
            <TextField
              fullWidth
              label="Dia de vencimento"
              type="number"
              value={customDueDayInput}
              onChange={(e) => setCustomDueDayInput(e.target.value)}
              inputProps={{ min: 1, max: 31 }}
              sx={{ mb: 1 }}
            />
            {customValuePlan?.customDueDays?.[studentId] !== undefined && (
              <Button
                size="small"
                startIcon={<History size={14} />}
                onClick={async () => {
                  if (!customValuePlan) return;
                  setCustomValueDialogOpen(false);
                  await removeCustomDueDay({ planId: customValuePlan.id, studentId });
                }}
                disabled={isSettingCustomValue}
              >
                Restaurar vencimento do plano
              </Button>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCustomValueDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!customValuePlan) return;
                const value = parseFloat(customValueInput);
                if (isNaN(value) || value <= 0) return;
                const dueDay = parseInt(customDueDayInput);
                if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) return;
                setCustomValueDialogOpen(false);
                // Save value
                if (value === customValuePlan.monthlyValue) {
                  await removeCustomValue({ planId: customValuePlan.id, studentId });
                } else {
                  await setCustomValue({ planId: customValuePlan.id, studentId, value });
                }
                // Save due day
                if (dueDay === customValuePlan.defaultDueDay) {
                  await removeCustomDueDay({ planId: customValuePlan.id, studentId });
                } else {
                  await setCustomDueDay({ planId: customValuePlan.id, studentId, day: dueDay });
                }
              }}
              disabled={isSettingCustomValue}
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>
      </AppLayout>
    </ProtectedRoute>
  );
}
