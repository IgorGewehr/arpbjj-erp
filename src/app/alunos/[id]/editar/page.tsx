'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Autocomplete,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Save, User, X, Plus, CreditCard, GraduationCap, MapPin, Shield, Heart, Award } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStudent, useStudents, usePlans, useClasses } from '@/hooks';
import { BeltColor, KidsBeltColor, StudentCategory, StudentStatus, Stripes, getStudentSports, getStudentPrimarySport, getClassSport } from '@/types';
import { SportId, SPORTS, getGradesForSport } from '@/lib/constants/sports';
import { GradeDisplay } from '@/components/shared/GradeDisplay';
import { createClassService } from '@/services/classService';
import { useAcademy } from '@/contexts/AcademyContext';
import {
  InputField,
  PhoneInput,
  CPFInput,
  CEPInput,
  BeltSelect,
  FormSection,
  FormDivider,
  FormRow,
  FormTabs,
  FormTabPanel,
} from '@/components/ui';
import { ADULT_BELT_OPTIONS, KIDS_BELT_OPTIONS } from '@/lib/constants/belts';

// ============================================
// Tabs Configuration (base — sport tabs are injected dynamically)
// ============================================
const BASE_TABS_BEFORE = [
  { key: 'personal', label: 'Dados Pessoais', icon: User },
];
const BASE_TABS_AFTER = [
  { key: 'plans', label: 'Plano e Turmas', icon: CreditCard },
  { key: 'address', label: 'Endereço', icon: MapPin },
  { key: 'health', label: 'Saúde', icon: Heart },
];

// ============================================
// Options
// ============================================
const statusOptions: { value: StudentStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'injured', label: 'Lesionado' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'suspended', label: 'Suspenso' },
];

const relationshipOptions = [
  'Pai', 'Mãe', 'Avô', 'Avó', 'Tio(a)', 'Irmão(ã)', 'Responsável Legal', 'Outro',
];

const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// ============================================
// Form Data Interface
// ============================================
interface BeltHistoryEntry {
  belt: BeltColor | KidsBeltColor;
  stripes: Stripes;
  date: string;
  notes: string;
}

interface SportGradeEntry {
  currentGrade: string;
  currentStripes: number;
  startDate: string;
  gradeHistory: Array<{ grade: string; stripes: number; date: string; notes: string }>;
}

interface FormData {
  fullName: string;
  nickname: string;
  birthDate: string;
  cpf: string;
  rg: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianCpf: string;
  guardianRelationship: string;
  startDate: string;
  jiujitsuStartDate: string;
  category: StudentCategory;
  currentBelt: BeltColor | KidsBeltColor;
  currentStripes: Stripes;
  status: StudentStatus;
  statusNote: string;
  tuitionValue: string;
  tuitionDay: string;
  weight: string;
  initialAttendanceCount: string;
  beltHistory: BeltHistoryEntry[];
  sportGrades: Record<string, SportGradeEntry>;
  primarySport: string;
  bloodType: string;
  healthNotes: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

// ============================================
// StudentEditPage Component
// ============================================
export default function StudentEditPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { academyId } = useAcademy();

  const { student, isLoading } = useStudent(studentId);
  const { updateStudent, isUpdating } = useStudents({ autoLoad: false });
  const { activePlans, toggleStudent: togglePlanStudent, getPlansForStudent } = usePlans();
  const { classes } = useClasses();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('personal');
  const [currentPlanIds, setCurrentPlanIds] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [newAllergy, setNewAllergy] = useState('');

  // Derive effective sports from student or classes
  const [classSports, setClassSports] = useState<SportId[]>([]);
  useEffect(() => {
    if (!studentId || !academyId || student?.sports?.length) return;
    const classService = createClassService(academyId);
    classService.getByStudent(studentId).then((cls) => {
      const sports = [...new Set(cls.map((c) => getClassSport(c)))];
      if (sports.length > 0) setClassSports(sports);
    }).catch(() => {/* silent */});
  }, [studentId, academyId, student?.sports?.length]);

  const effectiveSports = useMemo((): SportId[] => {
    if (student?.sports?.length) return student.sports as SportId[];
    if (classSports.length) return classSports;
    return ['bjj'];
  }, [student?.sports, classSports]);

  // Dynamic tabs: [Personal] [BJJ] [Muay Thai] [Karatê] ... [Plans] [Address] [Health]
  const formTabs = useMemo(() => {
    const sportTabs = effectiveSports.map((sportId) => ({
      key: `sport_${sportId}`,
      label: SPORTS[sportId]?.labelShort || sportId,
      icon: sportId === 'bjj' ? Shield : Award,
    }));
    return [...BASE_TABS_BEFORE, ...sportTabs, ...BASE_TABS_AFTER];
  }, [effectiveSports]);

  // Load student's current plans and classes
  useEffect(() => {
    if (student && studentId) {
      getPlansForStudent(studentId).then((plans) => {
        setCurrentPlanIds(plans.map((p) => p.id));
      });
      const studentClasses = classes.filter((c) => c.studentIds?.includes(studentId));
      setSelectedClasses(studentClasses.map((c) => c.id));
    }
  }, [student, studentId, classes, getPlansForStudent]);

  // Initialize form data from student
  useEffect(() => {
    if (student && !formData) {
      // Build sportGrades from student.sportData for non-BJJ sports
      const sportGrades: Record<string, SportGradeEntry> = {};
      effectiveSports.forEach((sportId) => {
        if (sportId === 'bjj') return; // BJJ uses legacy fields
        const data = student.sportData?.[sportId];
        sportGrades[sportId] = {
          currentGrade: data?.currentGrade || 'white',
          currentStripes: data?.currentStripes || 0,
          startDate: data?.startDate ? formatDateForInput(data.startDate) : '',
          gradeHistory: data?.gradeHistory?.map((h: any) => ({
            grade: h.grade,
            stripes: h.stripes,
            date: h.date ? formatDateForInput(h.date) : '',
            notes: h.notes || '',
          })) || [],
        };
      });

      setFormData({
        fullName: student.fullName,
        nickname: student.nickname || '',
        birthDate: student.birthDate ? formatDateForInput(student.birthDate) : '',
        cpf: student.cpf ? formatCPF(student.cpf) : '',
        rg: student.rg || '',
        phone: student.phone ? formatPhone(student.phone) : '',
        email: student.email || '',
        street: student.address?.street || '',
        number: student.address?.number || '',
        complement: student.address?.complement || '',
        neighborhood: student.address?.neighborhood || '',
        city: student.address?.city || '',
        state: student.address?.state || 'SP',
        zipCode: student.address?.zipCode ? formatCEP(student.address.zipCode) : '',
        guardianName: student.guardian?.name || '',
        guardianPhone: student.guardian?.phone ? formatPhone(student.guardian.phone) : '',
        guardianEmail: student.guardian?.email || '',
        guardianCpf: student.guardian?.cpf ? formatCPF(student.guardian.cpf) : '',
        guardianRelationship: student.guardian?.relationship || '',
        startDate: formatDateForInput(student.startDate),
        jiujitsuStartDate: student.jiujitsuStartDate ? formatDateForInput(student.jiujitsuStartDate) : '',
        category: student.category,
        currentBelt: student.currentBelt,
        currentStripes: student.currentStripes,
        status: student.status,
        statusNote: student.statusNote || '',
        tuitionValue: student.tuitionValue?.toString() || '0',
        tuitionDay: student.tuitionDay?.toString() || '10',
        weight: student.weight?.toString() || '',
        initialAttendanceCount: student.initialAttendanceCount?.toString() || '',
        beltHistory: student.beltHistory?.map(entry => ({
          belt: entry.belt,
          stripes: entry.stripes,
          date: formatDateForInput(entry.date),
          notes: entry.notes || '',
        })) || [],
        sportGrades,
        primarySport: student.primarySport || getStudentPrimarySport(student),
        bloodType: student.bloodType || '',
        healthNotes: student.healthNotes || '',
        allergies: student.allergies || [],
        emergencyContactName: student.emergencyContact?.name || '',
        emergencyContactPhone: student.emergencyContact?.phone ? formatPhone(student.emergencyContact.phone) : '',
        emergencyContactRelationship: student.emergencyContact?.relationship || '',
      });
    }
  }, [student, formData, effectiveSports]);

  // ============================================
  // Calculate form progress
  // ============================================
  const progress = useMemo(() => {
    if (!formData) return 0;
    const fields = [
      formData.fullName,
      formData.nickname,
      formData.birthDate,
      formData.phone,
      formData.email,
      formData.street,
      formData.city,
      formData.currentBelt,
      formData.bloodType,
      formData.emergencyContactName,
    ];
    const filled = fields.filter(f => f && String(f).trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  // ============================================
  // Tabs with error state
  // ============================================
  const tabsWithErrors = useMemo(() => {
    return formTabs.map(tab => ({
      ...tab,
      hasErrors: tab.key === 'personal' && formData ? !formData.fullName.trim() : false,
    }));
  }, [formData, formTabs]);

  // ============================================
  // Handle Field Change
  // ============================================
  const handleChange = useCallback((field: keyof FormData, value: string | string[] | number | BeltHistoryEntry[]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  // Handle sport grade field change (for non-BJJ sports)
  const handleSportGradeChange = useCallback((sportId: string, field: keyof SportGradeEntry, value: any) => {
    setFormData(prev => {
      if (!prev) return null;
      const current = prev.sportGrades[sportId] || { currentGrade: 'white', currentStripes: 0, startDate: '', gradeHistory: [] };
      return {
        ...prev,
        sportGrades: {
          ...prev.sportGrades,
          [sportId]: { ...current, [field]: value },
        },
      };
    });
  }, []);

  // ============================================
  // Add/Remove Allergy
  // ============================================
  const handleAddAllergy = useCallback(() => {
    if (formData && newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      handleChange('allergies', [...formData.allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  }, [newAllergy, formData, handleChange]);

  const handleRemoveAllergy = useCallback((allergy: string) => {
    if (formData) {
      handleChange('allergies', formData.allergies.filter(a => a !== allergy));
    }
  }, [formData, handleChange]);

  // ============================================
  // Validate Form
  // ============================================
  const validateForm = useCallback((): boolean => {
    if (!formData) return false;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nome completo é obrigatório';
      setActiveTab('personal');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================
  // Handle Submit
  // ============================================
  const handleSubmit = useCallback(async () => {
    if (!formData || !validateForm()) return;

    try {
      const studentData = {
        fullName: formData.fullName.trim(),
        nickname: formData.nickname.trim() || undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
        cpf: formData.cpf.replace(/\D/g, '') || undefined,
        rg: formData.rg.trim() || undefined,
        phone: formData.phone.replace(/\D/g, '') || undefined,
        email: formData.email.trim() || undefined,
        address: formData.street ? {
          street: formData.street.trim(),
          number: formData.number.trim(),
          complement: formData.complement.trim() || undefined,
          neighborhood: formData.neighborhood.trim(),
          city: formData.city.trim(),
          state: formData.state,
          zipCode: formData.zipCode.replace(/\D/g, ''),
        } : undefined,
        guardian: formData.guardianName ? {
          name: formData.guardianName.trim(),
          phone: formData.guardianPhone.replace(/\D/g, ''),
          email: formData.guardianEmail.trim() || undefined,
          cpf: formData.guardianCpf.replace(/\D/g, '') || undefined,
          relationship: formData.guardianRelationship,
        } : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
        jiujitsuStartDate: formData.jiujitsuStartDate ? new Date(formData.jiujitsuStartDate) : undefined,
        category: formData.category,
        currentBelt: formData.currentBelt,
        currentStripes: formData.currentStripes,
        status: formData.status,
        statusNote: formData.statusNote.trim() || undefined,
        tuitionValue: parseFloat(formData.tuitionValue) || 0,
        tuitionDay: parseInt(formData.tuitionDay) || 10,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        initialAttendanceCount: formData.initialAttendanceCount ? parseInt(formData.initialAttendanceCount) : undefined,
        beltHistory: formData.beltHistory.filter(entry => entry.date).length > 0
          ? formData.beltHistory.filter(entry => entry.date).map(entry => ({
              belt: entry.belt,
              stripes: entry.stripes,
              date: new Date(entry.date),
              notes: entry.notes || undefined,
            }))
          : undefined,
        // Multi-sport: persist sportData, sports array, and primary sport
        primarySport: (formData.primarySport || 'bjj') as SportId,
        sports: effectiveSports,
        sportData: Object.keys(formData.sportGrades).length > 0
          ? Object.fromEntries(
              Object.entries(formData.sportGrades).map(([sportId, sg]) => [
                sportId,
                {
                  currentGrade: sg.currentGrade,
                  currentStripes: sg.currentStripes,
                  startDate: sg.startDate ? new Date(sg.startDate) : undefined,
                  gradeHistory: sg.gradeHistory.filter(h => h.date).map(h => ({
                    grade: h.grade,
                    stripes: h.stripes,
                    date: new Date(h.date),
                    notes: h.notes || undefined,
                  })),
                },
              ])
            )
          : undefined,
        bloodType: formData.bloodType || undefined,
        healthNotes: formData.healthNotes.trim() || undefined,
        allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.replace(/\D/g, ''),
          relationship: formData.emergencyContactRelationship,
        } : undefined,
      };

      await updateStudent({ id: studentId, data: studentData });
      router.push(`/alunos/${studentId}`);
    } catch {
      // Error handled by mutation
    }
  }, [formData, validateForm, updateStudent, studentId, router, effectiveSports]);

  // Loading state
  if (isLoading || !formData) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={200} height={40} />
            </Box>
            <Skeleton variant="rounded" height={600} sx={{ borderRadius: 3 }} />
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
              Aluno não encontrado
            </Typography>
            <Button variant="contained" onClick={() => router.push('/alunos')}>
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
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.back()} sx={{ bgcolor: 'grey.100' }}>
              <ArrowLeft size={20} />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Editar Aluno
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {student.fullName}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={isUpdating ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
              onClick={handleSubmit}
              disabled={isUpdating}
              sx={{
                bgcolor: '#171717',
                '&:hover': { bgcolor: '#333' },
                borderRadius: 2,
                px: 3,
              }}
            >
              {isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>

          {/* Form with Tabs */}
          <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <FormTabs
              tabs={tabsWithErrors}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              progress={progress}
            >
              {/* ====================================== */}
              {/* Tab: Dados Pessoais */}
              {/* ====================================== */}
              <FormTabPanel tabKey="personal" activeTab={activeTab}>
                <FormSection title="Identificação" icon={User}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <InputField
                        label="Nome Completo"
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        required
                        error={!!errors.fullName}
                        helperText={errors.fullName}
                        startIcon={User}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <InputField
                        label="Apelido"
                        value={formData.nickname}
                        onChange={(e) => handleChange('nickname', e.target.value)}
                        placeholder="Como prefere ser chamado"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="Data de Nascimento"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleChange('birthDate', e.target.value)}
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <CPFInput
                        label="CPF"
                        value={formData.cpf}
                        onChange={(e) => handleChange('cpf', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <InputField
                        label="RG"
                        value={formData.rg}
                        onChange={(e) => handleChange('rg', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </FormSection>

                <FormDivider spacing="medium" />

                <FormSection title="Contato">
                  <FormRow>
                    <PhoneInput
                      label="Telefone (WhatsApp)"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    <InputField
                      label="E-mail"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </FormRow>
                </FormSection>

                {/* Guardian (for kids) */}
                {formData.category === 'kids' && (
                  <>
                    <FormDivider label="Responsável" spacing="medium" />

                    <FormSection
                      title="Dados do Responsável"
                      subtitle="Recomendado para alunos menores de idade"
                    >
                      <Grid container spacing={2.5}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <InputField
                            label="Nome do Responsável"
                            value={formData.guardianName}
                            onChange={(e) => handleChange('guardianName', e.target.value)}
                            startIcon={User}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <PhoneInput
                            label="WhatsApp do Responsável"
                            value={formData.guardianPhone}
                            onChange={(e) => handleChange('guardianPhone', e.target.value)}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <InputField
                            label="E-mail do Responsável"
                            type="email"
                            value={formData.guardianEmail}
                            onChange={(e) => handleChange('guardianEmail', e.target.value)}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <CPFInput
                            label="CPF do Responsável"
                            value={formData.guardianCpf}
                            onChange={(e) => handleChange('guardianCpf', e.target.value)}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Autocomplete
                            value={formData.guardianRelationship}
                            onChange={(_, value) => handleChange('guardianRelationship', value || '')}
                            options={relationshipOptions}
                            freeSolo
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Parentesco"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </FormSection>
                  </>
                )}
              </FormTabPanel>

              {/* ====================================== */}
              {/* Tab: BJJ (dynamic — only if student practices BJJ) */}
              {/* ====================================== */}
              {effectiveSports.includes('bjj') && (
              <FormTabPanel tabKey="sport_bjj" activeTab={activeTab}>
                <FormSection title="Graduação — Jiu-Jitsu" icon={Shield}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel>Categoria</InputLabel>
                        <Select
                          value={formData.category}
                          onChange={(e) => {
                            const newCategory = e.target.value as StudentCategory;
                            handleChange('category', newCategory);
                            handleChange('currentBelt', 'white');
                            handleChange('currentStripes', 0);
                          }}
                          label="Categoria"
                          sx={{ borderRadius: 1.5 }}
                        >
                          <MenuItem value="kids">Kids (até 15 anos)</MenuItem>
                          <MenuItem value="adult">Adulto</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <BeltSelect
                        value={formData.currentBelt}
                        onChange={(value) => handleChange('currentBelt', value)}
                        category={formData.category}
                        label="Faixa Atual"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Graus</InputLabel>
                        <Select
                          value={formData.currentStripes}
                          onChange={(e) => handleChange('currentStripes', e.target.value as Stripes)}
                          label="Graus"
                          sx={{ borderRadius: 1.5 }}
                        >
                          {[0, 1, 2, 3, 4].map(stripe => (
                            <MenuItem key={stripe} value={stripe}>
                              {stripe} grau{stripe !== 1 ? 's' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <InputField
                        label="Peso (kg)"
                        type="number"
                        value={formData.weight}
                        onChange={(e) => handleChange('weight', e.target.value)}
                        placeholder="Ex: 75"
                      />
                    </Grid>
                  </Grid>
                </FormSection>

                <FormDivider spacing="medium" />

                <FormSection title="Datas e Status">
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="Início na Academia"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        helperText="Quando começou nesta academia"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="Início no Jiu-Jitsu"
                        type="date"
                        value={formData.jiujitsuStartDate}
                        onChange={(e) => handleChange('jiujitsuStartDate', e.target.value)}
                        fullWidth
                        slotProps={{ inputLabel: { shrink: true } }}
                        helperText="Quando começou a treinar"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={formData.status}
                          onChange={(e) => handleChange('status', e.target.value)}
                          label="Status"
                          sx={{ borderRadius: 1.5 }}
                        >
                          {statusOptions.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <InputField
                        label="Treinos Anteriores"
                        type="number"
                        value={formData.initialAttendanceCount}
                        onChange={(e) => handleChange('initialAttendanceCount', e.target.value)}
                        placeholder="Ex: 150"
                        helperText="Total de treinos já realizados"
                      />
                    </Grid>

                    {effectiveSports.length > 1 && (
                      <Grid size={{ xs: 12, md: 4 }}>
                        <FormControl fullWidth>
                          <InputLabel>Esporte principal</InputLabel>
                          <Select
                            value={formData.primarySport}
                            onChange={(e) => handleChange('primarySport', e.target.value)}
                            label="Esporte principal"
                            sx={{ borderRadius: 1.5 }}
                          >
                            {effectiveSports.map((sportId) => (
                              <MenuItem key={sportId} value={sportId}>
                                {SPORTS[sportId]?.label || sportId}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    {formData.status !== 'active' && (
                      <Grid size={{ xs: 12, md: 8 }}>
                        <InputField
                          label="Observação de Status"
                          value={formData.statusNote}
                          onChange={(e) => handleChange('statusNote', e.target.value)}
                          placeholder="Ex: Lesão no joelho, viagem, etc"
                        />
                      </Grid>
                    )}
                  </Grid>
                </FormSection>

                <FormDivider label="Histórico de Graduações" spacing="medium" />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Adicione graduações anteriores para a linha do tempo
                  </Typography>

                  {formData.beltHistory.map((entry, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 3 }}>
                          <BeltSelect
                            value={entry.belt}
                            onChange={(value) => {
                              const newHistory = [...formData.beltHistory];
                              newHistory[index].belt = value as BeltColor | KidsBeltColor;
                              handleChange('beltHistory', newHistory);
                            }}
                            category={formData.category}
                            label="Faixa"
                            size="small"
                          />
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Graus</InputLabel>
                            <Select
                              value={entry.stripes}
                              onChange={(e) => {
                                const newHistory = [...formData.beltHistory];
                                newHistory[index].stripes = e.target.value as Stripes;
                                handleChange('beltHistory', newHistory);
                              }}
                              label="Graus"
                              sx={{ borderRadius: 1.5 }}
                            >
                              {[0, 1, 2, 3, 4].map(s => (
                                <MenuItem key={s} value={s}>{s}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <TextField
                            label="Data"
                            type="date"
                            size="small"
                            value={entry.date}
                            onChange={(e) => {
                              const newHistory = [...formData.beltHistory];
                              newHistory[index].date = e.target.value;
                              handleChange('beltHistory', newHistory);
                            }}
                            fullWidth
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 10, md: 3 }}>
                          <TextField
                            label="Observação"
                            size="small"
                            value={entry.notes}
                            onChange={(e) => {
                              const newHistory = [...formData.beltHistory];
                              newHistory[index].notes = e.target.value;
                              handleChange('beltHistory', newHistory);
                            }}
                            fullWidth
                            placeholder="Ex: Promovido por Mestre X"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 2, md: 1 }}>
                          <IconButton
                            onClick={() => {
                              const newHistory = formData.beltHistory.filter((_, i) => i !== index);
                              handleChange('beltHistory', newHistory);
                            }}
                            color="error"
                            size="small"
                          >
                            <X size={18} />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}

                  <Button
                    startIcon={<Plus size={18} />}
                    onClick={() => {
                      handleChange('beltHistory', [
                        ...formData.beltHistory,
                        { belt: 'white' as BeltColor, stripes: 0 as Stripes, date: '', notes: '' }
                      ]);
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Adicionar Graduação
                  </Button>
                </Box>
              </FormTabPanel>
              )}

              {/* ====================================== */}
              {/* Tabs: Other Sports (Muay Thai, Karatê, etc.) */}
              {/* ====================================== */}
              {effectiveSports.filter(s => s !== 'bjj').map((sportId) => {
                const sport = SPORTS[sportId];
                if (!sport) return null;
                const sg = formData.sportGrades[sportId] || { currentGrade: 'white', currentStripes: 0, startDate: '', gradeHistory: [] };
                const grades = getGradesForSport(sportId as SportId, 'adult');
                const selectedGrade = grades.find(g => g.id === sg.currentGrade);
                const maxStripes = selectedGrade?.maxStripes || 0;

                return (
                  <FormTabPanel key={sportId} tabKey={`sport_${sportId}`} activeTab={activeTab}>
                    {sport.gradeSystem === 'none' ? (
                      <FormSection title={`${sport.label}`} icon={Award}>
                        <Typography variant="body2" color="text.secondary">
                          Este esporte não possui sistema de graduação.
                        </Typography>
                      </FormSection>
                    ) : (
                      <>
                        <FormSection title={`Graduação — ${sport.label}`} icon={Award}>
                          <Grid container spacing={2.5}>
                            {/* Grade preview */}
                            <Grid size={{ xs: 12 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <GradeDisplay
                                  sportId={sportId as SportId}
                                  grade={sg.currentGrade}
                                  stripes={sg.currentStripes}
                                  size="large"
                                  showLabel
                                />
                              </Box>
                            </Grid>

                            {/* Grade select */}
                            <Grid size={{ xs: 12, md: 5 }}>
                              <FormControl fullWidth>
                                <InputLabel>{sport.gradeSystem === 'armband' ? 'Prajied' : 'Faixa'}</InputLabel>
                                <Select
                                  value={sg.currentGrade}
                                  onChange={(e) => handleSportGradeChange(sportId, 'currentGrade', e.target.value)}
                                  label={sport.gradeSystem === 'armband' ? 'Prajied' : 'Faixa'}
                                  sx={{ borderRadius: 1.5 }}
                                >
                                  {grades.map(g => (
                                    <MenuItem key={g.id} value={g.id}>{g.label}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>

                            {/* Stripes select (only if sport supports stripes and grade allows them) */}
                            {sport.supportsStripes && maxStripes > 0 && (
                              <Grid size={{ xs: 12, md: 3 }}>
                                <FormControl fullWidth>
                                  <InputLabel>{sport.gradeSystem === 'armband' ? 'Pontas' : 'Graus'}</InputLabel>
                                  <Select
                                    value={sg.currentStripes}
                                    onChange={(e) => handleSportGradeChange(sportId, 'currentStripes', Number(e.target.value))}
                                    label={sport.gradeSystem === 'armband' ? 'Pontas' : 'Graus'}
                                    sx={{ borderRadius: 1.5 }}
                                  >
                                    {Array.from({ length: maxStripes + 1 }, (_, i) => i).map(s => (
                                      <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </Grid>
                            )}

                            {/* Start date in this sport */}
                            <Grid size={{ xs: 12, md: 4 }}>
                              <TextField
                                label={`Início no ${sport.label}`}
                                type="date"
                                value={sg.startDate}
                                onChange={(e) => handleSportGradeChange(sportId, 'startDate', e.target.value)}
                                fullWidth
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                              />
                            </Grid>
                          </Grid>
                        </FormSection>

                        <FormDivider label="Histórico de Graduações" spacing="medium" />

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Adicione graduações anteriores
                          </Typography>

                          {sg.gradeHistory.map((entry, index) => (
                            <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 12, md: 3 }}>
                                  <FormControl fullWidth size="small">
                                    <InputLabel>{sport.gradeSystem === 'armband' ? 'Prajied' : 'Faixa'}</InputLabel>
                                    <Select
                                      value={entry.grade}
                                      onChange={(e) => {
                                        const newHistory = [...sg.gradeHistory];
                                        newHistory[index] = { ...newHistory[index], grade: e.target.value };
                                        handleSportGradeChange(sportId, 'gradeHistory', newHistory);
                                      }}
                                      label={sport.gradeSystem === 'armband' ? 'Prajied' : 'Faixa'}
                                      sx={{ borderRadius: 1.5 }}
                                    >
                                      {grades.map(g => (
                                        <MenuItem key={g.id} value={g.id}>{g.label}</MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                {sport.supportsStripes && (
                                  <Grid size={{ xs: 6, md: 2 }}>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Graus</InputLabel>
                                      <Select
                                        value={entry.stripes}
                                        onChange={(e) => {
                                          const newHistory = [...sg.gradeHistory];
                                          newHistory[index] = { ...newHistory[index], stripes: Number(e.target.value) };
                                          handleSportGradeChange(sportId, 'gradeHistory', newHistory);
                                        }}
                                        label="Graus"
                                        sx={{ borderRadius: 1.5 }}
                                      >
                                        {[0, 1, 2, 3, 4].map(s => (
                                          <MenuItem key={s} value={s}>{s}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                )}
                                <Grid size={{ xs: 6, md: 3 }}>
                                  <TextField
                                    label="Data"
                                    type="date"
                                    size="small"
                                    value={entry.date}
                                    onChange={(e) => {
                                      const newHistory = [...sg.gradeHistory];
                                      newHistory[index] = { ...newHistory[index], date: e.target.value };
                                      handleSportGradeChange(sportId, 'gradeHistory', newHistory);
                                    }}
                                    fullWidth
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                  />
                                </Grid>
                                <Grid size={{ xs: 10, md: 3 }}>
                                  <TextField
                                    label="Observação"
                                    size="small"
                                    value={entry.notes}
                                    onChange={(e) => {
                                      const newHistory = [...sg.gradeHistory];
                                      newHistory[index] = { ...newHistory[index], notes: e.target.value };
                                      handleSportGradeChange(sportId, 'gradeHistory', newHistory);
                                    }}
                                    fullWidth
                                    placeholder="Ex: Promovido por Mestre X"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                                  />
                                </Grid>
                                <Grid size={{ xs: 2, md: 1 }}>
                                  <IconButton
                                    onClick={() => {
                                      const newHistory = sg.gradeHistory.filter((_, i) => i !== index);
                                      handleSportGradeChange(sportId, 'gradeHistory', newHistory);
                                    }}
                                    color="error"
                                    size="small"
                                  >
                                    <X size={18} />
                                  </IconButton>
                                </Grid>
                              </Grid>
                            </Paper>
                          ))}

                          <Button
                            startIcon={<Plus size={18} />}
                            onClick={() => {
                              handleSportGradeChange(sportId, 'gradeHistory', [
                                ...sg.gradeHistory,
                                { grade: 'white', stripes: 0, date: '', notes: '' }
                              ]);
                            }}
                            variant="outlined"
                            size="small"
                            sx={{ borderRadius: 2 }}
                          >
                            Adicionar Graduação
                          </Button>
                        </Box>
                      </>
                    )}
                  </FormTabPanel>
                );
              })}

              {/* ====================================== */}
              {/* Tab: Plano e Turmas */}
              {/* ====================================== */}
              <FormTabPanel tabKey="plans" activeTab={activeTab}>
                <FormSection title="Planos" icon={CreditCard}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {activePlans.map((plan) => {
                      const isSelected = currentPlanIds.includes(plan.id);
                      return (
                        <Chip
                          key={plan.id}
                          label={`${plan.name} - R$ ${plan.monthlyValue}`}
                          variant={isSelected ? 'filled' : 'outlined'}
                          color={isSelected ? 'primary' : 'default'}
                          onClick={async () => {
                            await togglePlanStudent({ planId: plan.id, studentId });
                            setCurrentPlanIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== plan.id)
                                : [...prev, plan.id]
                            );
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Box>
                  {currentPlanIds.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Nenhum plano selecionado (Projeto Social)
                    </Typography>
                  )}
                  {currentPlanIds.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {currentPlanIds.map((planId) => {
                        const plan = activePlans.find((p) => p.id === planId);
                        if (!plan) return null;
                        return (
                          <Typography key={planId} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {plan.name}: {plan.classesPerWeek === 0 ? 'Acesso livre' : `${plan.classesPerWeek}x por semana`} - R$ {plan.monthlyValue}/mes
                          </Typography>
                        );
                      })}
                    </Box>
                  )}
                </FormSection>

                <FormDivider spacing="medium" />

                <FormSection title="Turmas Matriculadas" icon={GraduationCap}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {classes.map((cls) => {
                      const isSelected = selectedClasses.includes(cls.id);
                      return (
                        <Chip
                          key={cls.id}
                          label={cls.name}
                          onClick={async () => {
                            const { classService } = await import('@/services/classService');
                            if (isSelected) {
                              await classService.removeStudent(cls.id, studentId);
                              setSelectedClasses((prev) => prev.filter((id) => id !== cls.id));
                            } else {
                              await classService.addStudent(cls.id, studentId);
                              setSelectedClasses((prev) => [...prev, cls.id]);
                            }
                            queryClient.invalidateQueries({ queryKey: ['classes'] });
                            queryClient.invalidateQueries({ queryKey: ['allClasses'] });
                          }}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer', borderRadius: 2 }}
                        />
                      );
                    })}
                    {classes.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma turma cadastrada
                      </Typography>
                    )}
                  </Box>
                </FormSection>
              </FormTabPanel>

              {/* ====================================== */}
              {/* Tab: Endereço */}
              {/* ====================================== */}
              <FormTabPanel tabKey="address" activeTab={activeTab}>
                <FormSection title="Endereço" subtitle="Opcional" icon={MapPin}>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <CEPInput
                        label="CEP"
                        value={formData.zipCode}
                        onChange={(e) => handleChange('zipCode', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <InputField
                        label="Rua"
                        value={formData.street}
                        onChange={(e) => handleChange('street', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <InputField
                        label="Número"
                        value={formData.number}
                        onChange={(e) => handleChange('number', e.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <InputField
                        label="Complemento"
                        value={formData.complement}
                        onChange={(e) => handleChange('complement', e.target.value)}
                        placeholder="Apto, Bloco, etc"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <InputField
                        label="Bairro"
                        value={formData.neighborhood}
                        onChange={(e) => handleChange('neighborhood', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <InputField
                        label="Cidade"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <FormControl fullWidth>
                        <InputLabel>UF</InputLabel>
                        <Select
                          value={formData.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          label="UF"
                          sx={{ borderRadius: 1.5 }}
                        >
                          {brazilianStates.map(state => (
                            <MenuItem key={state} value={state}>{state}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </FormSection>
              </FormTabPanel>

              {/* ====================================== */}
              {/* Tab: Saúde */}
              {/* ====================================== */}
              <FormTabPanel tabKey="health" activeTab={activeTab}>
                <FormSection
                  title="Informações de Saúde"
                  subtitle="Opcional, mas recomendado"
                  icon={Heart}
                >
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo Sanguíneo</InputLabel>
                        <Select
                          value={formData.bloodType}
                          onChange={(e) => handleChange('bloodType', e.target.value)}
                          label="Tipo Sanguíneo"
                          sx={{ borderRadius: 1.5 }}
                        >
                          <MenuItem value="">Não informado</MenuItem>
                          {bloodTypeOptions.map(type => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Alergias
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                          {formData.allergies.map((allergy) => (
                            <Chip
                              key={allergy}
                              label={allergy}
                              onDelete={() => handleRemoveAllergy(allergy)}
                              size="small"
                              sx={{ borderRadius: 1 }}
                            />
                          ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            size="small"
                            value={newAllergy}
                            onChange={(e) => setNewAllergy(e.target.value)}
                            placeholder="Digite uma alergia"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAllergy();
                              }
                            }}
                            sx={{
                              flex: 1,
                              '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                            }}
                          />
                          <IconButton
                            onClick={handleAddAllergy}
                            color="primary"
                            size="small"
                            sx={{ bgcolor: 'grey.100' }}
                          >
                            <Plus size={18} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Grid>

                    <Grid size={12}>
                      <TextField
                        label="Observações de Saúde"
                        value={formData.healthNotes}
                        onChange={(e) => handleChange('healthNotes', e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Lesões pré-existentes, condições médicas, medicamentos em uso, etc"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </Grid>
                  </Grid>
                </FormSection>

                <FormDivider label="Contato de Emergência" spacing="medium" />

                <FormSection title="Contato de Emergência">
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <InputField
                        label="Nome"
                        value={formData.emergencyContactName}
                        onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                        startIcon={User}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <PhoneInput
                        label="Telefone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Autocomplete
                        value={formData.emergencyContactRelationship}
                        onChange={(_, value) => handleChange('emergencyContactRelationship', value || '')}
                        options={relationshipOptions}
                        freeSolo
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Parentesco"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                </FormSection>
              </FormTabPanel>
            </FormTabs>
          </Paper>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
