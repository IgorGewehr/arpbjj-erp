'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Button,
  Skeleton,
  SelectChangeEvent,
  Card,
  CardContent,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  Collapse,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Users,
  CheckCircle,
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancial, usePlans, useStudents, useClasses } from '@/hooks';
import { useConfirmDialog } from '@/components/providers';
import { PaymentCard } from './PaymentCard';
import { MarkPaidDialog } from './MarkPaidDialog';
import { RevenueChart } from './RevenueChart';
import { GenerateTuitionsDialog } from './GenerateTuitionsDialog';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { getBeltChipColor } from '@/lib/theme';
import { Financial, PaymentStatus, Plan, Student } from '@/types';

// ============================================
// Status Filter Options
// ============================================
const statusOptions: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pagos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'overdue', label: 'Atrasados' },
  { value: 'cancelled', label: 'Cancelados' },
];

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
// KPI Card Component
// ============================================
interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  compact?: boolean;
}

function KPICard({ title, value, subtitle, icon, color, bgColor, compact }: KPICardProps) {
  return (
    <Paper sx={{ p: compact ? 2 : 3, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            sx={{ fontSize: compact ? '0.7rem' : '0.875rem' }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              color,
              fontSize: compact ? '1.1rem' : '2rem',
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: compact ? '0.6rem' : '0.75rem' }}
          >
            {subtitle}
          </Typography>
        </Box>
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
      </Box>
    </Paper>
  );
}

// ============================================
// Student Mini Card (for plan lists)
// ============================================
interface StudentMiniCardProps {
  student: Student;
  isInPlan: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function StudentMiniCard({ student, isInPlan, onToggle, disabled }: StudentMiniCardProps) {
  const beltColor = getBeltChipColor(student.currentBelt);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '2px solid',
        borderColor: isInPlan ? 'success.main' : 'transparent',
        bgcolor: isInPlan ? 'success.50' : 'background.paper',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <CardActionArea
        onClick={onToggle}
        disabled={disabled}
        sx={{ p: 1.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={student.photoUrl}
              sx={{
                width: 40,
                height: 40,
                bgcolor: beltColor.bg,
                color: beltColor.text,
                fontSize: '0.875rem',
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>
            {isInPlan && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                }}
              >
                <CheckCircle size={10} color="white" />
              </Box>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {student.nickname || student.fullName.split(' ')[0]}
            </Typography>
            <BeltDisplay
              belt={student.currentBelt}
              stripes={student.currentStripes}
              size="small"
            />
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

// ============================================
// Plan Card Component
// ============================================
interface PlanCardProps {
  plan: Plan;
  students: Student[];
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onManageStudents: (plan: Plan) => void;
  isDeleting: boolean;
}

function PlanCard({ plan, students, onEdit, onDelete, onManageStudents, isDeleting }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const enrolledStudents = useMemo(() => {
    return students.filter((s) => plan.studentIds?.includes(s.id));
  }, [students, plan.studentIds]);

  const expectedMonthlyRevenue = plan.monthlyValue * enrolledStudents.length;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" fontWeight={700}>
                {plan.name}
              </Typography>
              <Chip
                label={plan.isActive ? 'Ativo' : 'Inativo'}
                size="small"
                color={plan.isActive ? 'success' : 'default'}
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            </Box>
            {plan.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {plan.description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => onEdit(plan)}>
              <Edit2 size={16} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDelete(plan)}
              disabled={isDeleting}
              sx={{ color: '#525252' }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        </Box>

        {/* Plan Info */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f5f5f5', px: 1.5, py: 0.75, borderRadius: 1 }}>
            <DollarSign size={16} color="#1a1a1a" />
            <Typography variant="body2" fontWeight={600} color="primary.main">
              R$ {plan.monthlyValue.toLocaleString('pt-BR')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1 }}>
            <CreditCard size={16} />
            <Typography variant="body2">
              {plan.classesPerWeek === 0 ? 'Ilimitado' : `${plan.classesPerWeek}x/semana`}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 1 }}>
            <Users size={16} />
            <Typography variant="body2">
              {enrolledStudents.length} aluno{enrolledStudents.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>

        {/* Expected Revenue */}
        <Box sx={{ bgcolor: 'success.50', p: 1.5, borderRadius: 2, mb: 2 }}>
          <Typography variant="caption" color="success.dark">
            Receita Esperada/Mes
          </Typography>
          <Typography variant="h6" fontWeight={700} color="success.dark">
            R$ {expectedMonthlyRevenue.toLocaleString('pt-BR')}
          </Typography>
        </Box>

        {/* Manage Students Button */}
        <Button
          variant="outlined"
          size="small"
          fullWidth
          startIcon={<Users size={16} />}
          onClick={() => onManageStudents(plan)}
          sx={{ mb: 1 }}
        >
          Gerenciar Alunos
        </Button>

        {/* Enrolled Students Preview */}
        {enrolledStudents.length > 0 && (
          <Box>
            <Button
              variant="text"
              size="small"
              fullWidth
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              sx={{ justifyContent: 'space-between', color: 'text.secondary' }}
            >
              <Typography variant="caption">
                {expanded ? 'Ocultar alunos' : 'Ver alunos inscritos'}
              </Typography>
            </Button>
            <Collapse in={expanded}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {enrolledStudents.map((student) => {
                  const beltColor = getBeltChipColor(student.currentBelt);
                  return (
                    <Chip
                      key={student.id}
                      avatar={
                        <Avatar sx={{ bgcolor: beltColor.bg, color: beltColor.text, fontSize: '0.7rem' }}>
                          {student.fullName[0]}
                        </Avatar>
                      }
                      label={student.nickname || student.fullName.split(' ')[0]}
                      size="small"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Manage Students Dialog for Plans
// ============================================
interface ManagePlanStudentsDialogProps {
  open: boolean;
  plan: Plan | null;
  students: Student[];
  onClose: () => void;
  onToggleStudent: (planId: string, studentId: string) => void;
  isToggling: boolean;
}

function ManagePlanStudentsDialog({
  open,
  plan,
  students,
  onClose,
  onToggleStudent,
  isToggling,
}: ManagePlanStudentsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.nickname?.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const enrolledCount = useMemo(() => {
    return students.filter((s) => plan?.studentIds?.includes(s.id)).length;
  }, [students, plan]);

  if (!plan) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {plan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              R$ {plan.monthlyValue.toLocaleString('pt-BR')}/mes - {enrolledCount} aluno{enrolledCount !== 1 ? 's' : ''} inscrito{enrolledCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Chip
            label={`R$ ${(plan.monthlyValue * enrolledCount).toLocaleString('pt-BR')}/mes`}
            sx={{ bgcolor: '#1a1a1a', color: '#fff' }}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar aluno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Students Grid */}
        <Grid container spacing={1.5}>
          {filteredStudents.map((student) => {
            const isInPlan = plan.studentIds?.includes(student.id) || false;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={student.id}>
                <StudentMiniCard
                  student={student}
                  isInPlan={isInPlan}
                  onToggle={() => onToggleStudent(plan.id, student.id)}
                  disabled={isToggling}
                />
              </Grid>
            );
          })}
        </Grid>

        {filteredStudents.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">Nenhum aluno encontrado</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Plan Form Dialog
// ============================================
interface PlanFormDialogProps {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSave: (data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>) => Promise<void>;
  isSaving: boolean;
}

function PlanFormDialog({ open, plan, onClose, onSave, isSaving }: PlanFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyValue, setMonthlyValue] = useState('');
  const [classesPerWeek, setClassesPerWeek] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      if (plan) {
        setName(plan.name);
        setDescription(plan.description || '');
        setMonthlyValue(plan.monthlyValue.toString());
        setClassesPerWeek(plan.classesPerWeek.toString());
        setIsActive(plan.isActive);
      } else {
        setName('');
        setDescription('');
        setMonthlyValue('');
        setClassesPerWeek('0');
        setIsActive(true);
      }
    }
  });

  // Update when plan changes
  useMemo(() => {
    if (plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      setMonthlyValue(plan.monthlyValue.toString());
      setClassesPerWeek(plan.classesPerWeek.toString());
      setIsActive(plan.isActive);
    } else {
      setName('');
      setDescription('');
      setMonthlyValue('');
      setClassesPerWeek('0');
      setIsActive(true);
    }
  }, [plan]);

  const handleSubmit = async () => {
    if (!name.trim() || !monthlyValue) return;

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      monthlyValue: parseFloat(monthlyValue),
      classesPerWeek: parseInt(classesPerWeek),
      isActive,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{plan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nome do Plano"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Descricao"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Valor Mensal"
            type="number"
            value={monthlyValue}
            onChange={(e) => setMonthlyValue(e.target.value)}
            fullWidth
            required
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              },
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Aulas por Semana</InputLabel>
            <Select
              value={classesPerWeek}
              onChange={(e) => setClassesPerWeek(e.target.value)}
              label="Aulas por Semana"
            >
              <MenuItem value="0">Ilimitado (Livre)</MenuItem>
              <MenuItem value="1">1x por semana</MenuItem>
              <MenuItem value="2">2x por semana</MenuItem>
              <MenuItem value="3">3x por semana</MenuItem>
              <MenuItem value="4">4x por semana</MenuItem>
              <MenuItem value="5">5x por semana</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
              label="Status"
            >
              <MenuItem value="true">Ativo</MenuItem>
              <MenuItem value="false">Inativo</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSaving || !name.trim() || !monthlyValue}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// FinancialDashboard Component
// ============================================
export function FinancialDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const {
    financials,
    pendingPayments,
    overduePayments,
    monthlySummary,
    revenueStats,
    filters,
    setMonth,
    markAsPaid,
    cancelPayment,
    generateTuitions,
    isLoading,
    isMarkingPaid,
    isGenerating,
    refresh,
  } = useFinancial();

  const { activeStudents, students } = useStudents();
  const { classes } = useClasses();
  const {
    plans,
    createPlan,
    updatePlan,
    deletePlan,
    toggleStudent,
    isCreating,
    isUpdating,
    isDeleting,
    isTogglingStudent,
    refresh: refreshPlans,
  } = usePlans();
  const { confirm } = useConfirmDialog();

  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Financial | null>(null);

  // Plan state
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [managingPlan, setManagingPlan] = useState<Plan | null>(null);

  // ============================================
  // Current Month Navigation
  // ============================================
  const selectedMonth = filters.month || format(new Date(), 'yyyy-MM');
  const selectedMonthDate = parseISO(`${selectedMonth}-01`);

  const handlePreviousMonth = useCallback(() => {
    const newMonth = format(subMonths(selectedMonthDate, 1), 'yyyy-MM');
    setMonth(newMonth);
  }, [selectedMonthDate, setMonth]);

  const handleNextMonth = useCallback(() => {
    const newMonth = format(addMonths(selectedMonthDate, 1), 'yyyy-MM');
    setMonth(newMonth);
  }, [selectedMonthDate, setMonth]);

  // ============================================
  // Filter Financials
  // ============================================
  const filteredFinancials = useMemo(() => {
    let result = financials;

    // Filter by status
    if (statusFilter) {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Filter by class
    if (classFilter) {
      const selectedClass = classes.find(c => c.id === classFilter);
      if (selectedClass) {
        result = result.filter(f => selectedClass.studentIds?.includes(f.studentId));
      }
    }

    return result;
  }, [financials, statusFilter, classFilter, classes]);

  // Filtered pending payments by class
  const filteredPendingPayments = useMemo(() => {
    if (!classFilter) return pendingPayments;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return pendingPayments.filter(f => selectedClass.studentIds?.includes(f.studentId));
    }
    return pendingPayments;
  }, [pendingPayments, classFilter, classes]);

  // Filtered overdue payments by class
  const filteredOverduePayments = useMemo(() => {
    if (!classFilter) return overduePayments;
    const selectedClass = classes.find(c => c.id === classFilter);
    if (selectedClass) {
      return overduePayments.filter(f => selectedClass.studentIds?.includes(f.studentId));
    }
    return overduePayments;
  }, [overduePayments, classFilter, classes]);

  // ============================================
  // Handle Status Filter Change
  // ============================================
  const handleStatusFilterChange = useCallback((e: SelectChangeEvent<string>) => {
    setStatusFilter(e.target.value as PaymentStatus | '');
  }, []);

  const handleClassFilterChange = useCallback((e: SelectChangeEvent<string>) => {
    setClassFilter(e.target.value);
  }, []);

  // ============================================
  // Handle Mark as Paid Click
  // ============================================
  const handleMarkPaidClick = useCallback((payment: Financial) => {
    setSelectedPayment(payment);
    setMarkPaidDialogOpen(true);
  }, []);

  // ============================================
  // Handle Mark Paid Confirm
  // ============================================
  const handleMarkPaidConfirm = useCallback(
    async (method: Financial['method'], paymentDate?: Date) => {
      if (!selectedPayment || !method) return;

      await markAsPaid({
        id: selectedPayment.id,
        method,
        paymentDate,
      });

      setMarkPaidDialogOpen(false);
      setSelectedPayment(null);
    },
    [selectedPayment, markAsPaid]
  );

  // ============================================
  // Handle Cancel Payment
  // ============================================
  const handleCancelPayment = useCallback(
    async (payment: Financial) => {
      await cancelPayment(payment.id);
    },
    [cancelPayment]
  );

  // ============================================
  // Handle Generate Tuitions (only for students with plans)
  // ============================================
  const handleGenerateTuitions = useCallback(async () => {
    // Build student data ONLY from students enrolled in active plans
    const studentsWithPlans = new Map<string, { value: number; day: number }>();

    // Get values from plans - only students in active plans get tuitions
    for (const plan of plans) {
      if (plan.isActive) {
        for (const studentId of plan.studentIds) {
          const student = activeStudents.find(s => s.id === studentId);
          if (student && student.status === 'active') {
            studentsWithPlans.set(studentId, {
              value: plan.monthlyValue,
              day: student.tuitionDay || 10,
            });
          }
        }
      }
    }

    // NOTE: Students without a plan (projeto social/gratuito) are NOT included

    const studentsData = Array.from(studentsWithPlans.entries()).map(([id, data]) => {
      const student = activeStudents.find(s => s.id === id);
      return {
        id,
        fullName: student?.fullName || '',
        tuitionValue: data.value,
        tuitionDay: data.day,
      };
    });

    await generateTuitions({
      students: studentsData,
      month: selectedMonth,
    });

    setGenerateDialogOpen(false);
  }, [activeStudents, plans, selectedMonth, generateTuitions]);

  // ============================================
  // Plan Handlers
  // ============================================
  const handleCreatePlan = useCallback(() => {
    setEditingPlan(null);
    setPlanDialogOpen(true);
  }, []);

  const handleEditPlan = useCallback((plan: Plan) => {
    setEditingPlan(plan);
    setPlanDialogOpen(true);
  }, []);

  const handleDeletePlan = useCallback(async (plan: Plan) => {
    const confirmed = await confirm({
      title: 'Remover Plano',
      message: `Deseja remover o plano "${plan.name}"? Os alunos nao serao removidos do sistema.`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
    });

    if (confirmed) {
      await deletePlan(plan.id);
    }
  }, [confirm, deletePlan]);

  const handleSavePlan = useCallback(async (data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>) => {
    if (editingPlan) {
      await updatePlan({ id: editingPlan.id, data });
    } else {
      await createPlan(data);
    }
    setPlanDialogOpen(false);
    setEditingPlan(null);
  }, [editingPlan, createPlan, updatePlan]);

  const handleManagePlanStudents = useCallback((plan: Plan) => {
    setManagingPlan(plan);
  }, []);

  const handleToggleStudentInPlan = useCallback(async (planId: string, studentId: string) => {
    await toggleStudent({ planId, studentId });
    // Update local state optimistically
    setManagingPlan((prev) => {
      if (!prev || prev.id !== planId) return prev;
      const currentIds = prev.studentIds || [];
      const isInPlan = currentIds.includes(studentId);
      return {
        ...prev,
        studentIds: isInPlan
          ? currentIds.filter((id) => id !== studentId)
          : [...currentIds, studentId],
      };
    });
  }, [toggleStudent]);

  // ============================================
  // Calculate expected revenue from plans
  // ============================================
  const expectedRevenue = useMemo(() => {
    return plans.reduce((total, plan) => {
      if (plan.isActive) {
        return total + (plan.monthlyValue * plan.studentIds.length);
      }
      return total;
    }, 0);
  }, [plans]);

  // ============================================
  // Calculate students with plans (for tuition generation)
  // ============================================
  const studentsWithPlansCount = useMemo(() => {
    const studentIdsWithPlans = new Set<string>();
    for (const plan of plans) {
      if (plan.isActive) {
        for (const studentId of plan.studentIds) {
          const student = activeStudents.find(s => s.id === studentId);
          if (student && student.status === 'active') {
            studentIdsWithPlans.add(studentId);
          }
        }
      }
    }
    return studentIdsWithPlans.size;
  }, [plans, activeStudents]);

  // ============================================
  // Format Currency
  // ============================================
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          mb: { xs: 2, sm: 4 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            Financeiro
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '1rem' }, display: { xs: 'none', sm: 'block' } }}
          >
            Gerenciamento de planos, mensalidades e pagamentos
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={!isMobile && <RefreshCw size={18} />}
            onClick={() => { refresh(); refreshPlans(); }}
            size="small"
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            {isMobile ? <RefreshCw size={16} /> : 'Atualizar'}
          </Button>
          <Button
            variant="contained"
            startIcon={!isMobile && <Plus size={18} />}
            onClick={() => setGenerateDialogOpen(true)}
            size="small"
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            {isMobile ? 'Gerar' : 'Gerar Mensalidades'}
          </Button>
        </Box>
      </Box>

      {/* Month Navigation */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 3, mb: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1, sm: 2 } }}>
          <IconButton onClick={handlePreviousMonth} size={isMobile ? 'small' : 'medium'}>
            <ChevronLeft size={isMobile ? 20 : 24} />
          </IconButton>
          <Typography
            variant="h5"
            fontWeight={600}
            sx={{
              minWidth: { xs: 'auto', sm: 200 },
              textAlign: 'center',
              fontSize: { xs: '1rem', sm: '1.5rem' },
              textTransform: 'capitalize',
            }}
          >
            {format(selectedMonthDate, isMobile ? "MMM 'de' yyyy" : "MMMM 'de' yyyy", { locale: ptBR })}
          </Typography>
          <IconButton onClick={handleNextMonth} size={isMobile ? 'small' : 'medium'}>
            <ChevronRight size={isMobile ? 20 : 24} />
          </IconButton>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <KPICard
            title="Recebido"
            value={formatCurrency(monthlySummary?.paidAmount || 0)}
            subtitle={`${monthlySummary?.paid || 0} pag.`}
            icon={<DollarSign size={isMobile ? 18 : 24} />}
            color="#1a1a1a"
            bgColor="#f5f5f5"
            compact={isMobile}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <KPICard
            title="A Receber"
            value={formatCurrency(monthlySummary?.pendingAmount || 0)}
            subtitle={`${monthlySummary?.pending || 0} pend.`}
            icon={<Clock size={isMobile ? 18 : 24} />}
            color="#1a1a1a"
            bgColor="#f5f5f5"
            compact={isMobile}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <KPICard
            title="Atrasados"
            value={formatCurrency(monthlySummary?.overdueAmount || 0)}
            subtitle={`${monthlySummary?.overdue || 0} atras.`}
            icon={<AlertTriangle size={isMobile ? 18 : 24} />}
            color="#1a1a1a"
            bgColor="#f5f5f5"
            compact={isMobile}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <KPICard
            title={isMobile ? "Taxa" : "Taxa de Recebimento"}
            value={
              monthlySummary?.total
                ? `${Math.round(((monthlySummary?.paid || 0) / monthlySummary.total) * 100)}%`
                : '0%'
            }
            subtitle={`${monthlySummary?.paid || 0} de ${monthlySummary?.total || 0}`}
            icon={<TrendingUp size={isMobile ? 18 : 24} />}
            color="#1a1a1a"
            bgColor="#f5f5f5"
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
            <Tab label="Planos" />
            <Tab label={isMobile ? "Mes" : "Pagamentos do Mes"} />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isMobile ? 'Pend.' : 'Pendentes'}
                  {filteredPendingPayments.length > 0 && (
                    <Chip
                      label={filteredPendingPayments.length}
                      size="small"
                      sx={{ height: isMobile ? 18 : 20, fontSize: isMobile ? '0.6rem' : '0.75rem', bgcolor: '#f5f5f5', color: '#1a1a1a' }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isMobile ? 'Atras.' : 'Atrasados'}
                  {filteredOverduePayments.length > 0 && (
                    <Chip
                      label={filteredOverduePayments.length}
                      size="small"
                      sx={{ height: isMobile ? 18 : 20, fontSize: isMobile ? '0.6rem' : '0.75rem', bgcolor: '#1a1a1a', color: '#fff' }}
                    />
                  )}
                </Box>
              }
            />
            <Tab label={isMobile ? "Evol." : "Evolucao"} />
          </Tabs>
        </Box>

        {/* Tab: Planos */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Plans Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: { xs: 2, sm: 3 },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 },
              }}
            >
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Planos de Mensalidade
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Receita esperada: {formatCurrency(expectedRevenue)}/mes
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={!isMobile && <Plus size={18} />}
                onClick={handleCreatePlan}
                size={isMobile ? 'small' : 'medium'}
              >
                {isMobile ? 'Novo' : 'Novo Plano'}
              </Button>
            </Box>

            {/* Plans Grid */}
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {plans.map((plan) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.id}>
                  <PlanCard
                    plan={plan}
                    students={students}
                    onEdit={handleEditPlan}
                    onDelete={handleDeletePlan}
                    onManageStudents={handleManagePlanStudents}
                    isDeleting={isDeleting}
                  />
                </Grid>
              ))}
            </Grid>

            {plans.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <DollarSign size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
                <Typography variant="h6" gutterBottom>
                  Nenhum plano cadastrado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Crie planos para organizar as mensalidades dos alunos
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={handleCreatePlan}
                >
                  Criar Primeiro Plano
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Pagamentos do Mes */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            {/* Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  {statusOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={classFilter}
                  onChange={handleClassFilterChange}
                  label="Turma"
                >
                  <MenuItem value="">Todas as Turmas</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(statusFilter || classFilter) && (
                <Chip
                  label="Limpar filtros"
                  onClick={() => { setStatusFilter(''); setClassFilter(''); }}
                  onDelete={() => { setStatusFilter(''); setClassFilter(''); }}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}
                />
              )}
            </Box>

            {/* Payment List */}
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            ) : filteredFinancials.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  Nenhum pagamento encontrado para este mes
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredFinancials.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    onMarkPaid={handleMarkPaidClick}
                    onCancel={handleCancelPayment}
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Pendentes */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            {/* Class Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={classFilter}
                  onChange={handleClassFilterChange}
                  label="Turma"
                >
                  <MenuItem value="">Todas as Turmas</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {filteredPendingPayments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  Nenhum pagamento pendente
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredPendingPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    onMarkPaid={handleMarkPaidClick}
                    onCancel={handleCancelPayment}
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Atrasados */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            {/* Class Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Turma</InputLabel>
                <Select
                  value={classFilter}
                  onChange={handleClassFilterChange}
                  label="Turma"
                >
                  <MenuItem value="">Todas as Turmas</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {filteredOverduePayments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  Nenhum pagamento atrasado
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredOverduePayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    onMarkPaid={handleMarkPaidClick}
                    onCancel={handleCancelPayment}
                    showWhatsApp
                  />
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: Evolucao */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 3 }}>
            {revenueStats ? (
              <RevenueChart data={revenueStats} />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Carregando dados...</Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Mark Paid Dialog */}
      <MarkPaidDialog
        open={markPaidDialogOpen}
        payment={selectedPayment}
        onClose={() => {
          setMarkPaidDialogOpen(false);
          setSelectedPayment(null);
        }}
        onConfirm={handleMarkPaidConfirm}
        isLoading={isMarkingPaid}
      />

      {/* Generate Tuitions Dialog */}
      <GenerateTuitionsDialog
        open={generateDialogOpen}
        month={selectedMonth}
        studentsCount={studentsWithPlansCount}
        onClose={() => setGenerateDialogOpen(false)}
        onConfirm={handleGenerateTuitions}
        isLoading={isGenerating}
      />

      {/* Plan Form Dialog */}
      <PlanFormDialog
        open={planDialogOpen}
        plan={editingPlan}
        onClose={() => {
          setPlanDialogOpen(false);
          setEditingPlan(null);
        }}
        onSave={handleSavePlan}
        isSaving={isCreating || isUpdating}
      />

      {/* Manage Plan Students Dialog */}
      <ManagePlanStudentsDialog
        open={!!managingPlan}
        plan={managingPlan}
        students={activeStudents}
        onClose={() => setManagingPlan(null)}
        onToggleStudent={handleToggleStudentInPlan}
        isToggling={isTogglingStudent}
      />
    </Box>
  );
}

export default FinancialDashboard;
