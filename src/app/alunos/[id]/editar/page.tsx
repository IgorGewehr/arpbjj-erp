'use client';

import { useState, useCallback, useEffect } from 'react';
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
  InputAdornment,
  Divider,
  Chip,
  IconButton,
  Autocomplete,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import { ArrowLeft, Save, User, X, Plus, CreditCard, GraduationCap } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStudent, useStudents, usePlans, useClasses } from '@/hooks';
import { BeltColor, KidsBeltColor, StudentCategory, StudentStatus, Stripes, Plan, Student } from '@/types';

interface BeltHistoryEntry {
  belt: BeltColor | KidsBeltColor;
  stripes: Stripes;
  date: string;
  notes: string;
}

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

// ============================================
// Status Options
// ============================================
const statusOptions: { value: StudentStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'injured', label: 'Lesionado' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'suspended', label: 'Suspenso' },
];

// ============================================
// Relationship Options
// ============================================
const relationshipOptions = [
  'Pai',
  'Mae',
  'Avo',
  'Tio(a)',
  'Irmao(a)',
  'Responsavel Legal',
  'Outro',
];

// ============================================
// Blood Type Options
// ============================================
const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ============================================
// Brazilian States
// ============================================
const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// ============================================
// Form Data Interface
// ============================================
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
  beltHistory: BeltHistoryEntry[];
  bloodType: string;
  healthNotes: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

// ============================================
// Formatting Helpers
// ============================================
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

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================
// StudentEditPage Component
// ============================================
export default function StudentEditPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const { student, isLoading } = useStudent(studentId);
  const { updateStudent, isUpdating } = useStudents({ autoLoad: false });
  const { activePlans, toggleStudent: togglePlanStudent, getPlanForStudent } = usePlans();
  const { classes } = useClasses();

  const [currentPlanId, setCurrentPlanId] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [newAllergy, setNewAllergy] = useState('');

  // Load student's current plan and classes
  useEffect(() => {
    if (student && studentId) {
      // Get current plan
      getPlanForStudent(studentId).then((plan) => {
        if (plan) {
          setCurrentPlanId(plan.id);
        }
      });
      // Get classes the student is in
      const studentClasses = classes.filter((c) => c.studentIds?.includes(studentId));
      setSelectedClasses(studentClasses.map((c) => c.id));
    }
  }, [student, studentId, classes, getPlanForStudent]);

  // Initialize form data from student
  useEffect(() => {
    if (student && !formData) {
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
        tuitionValue: student.tuitionValue?.toString() || '150',
        tuitionDay: student.tuitionDay?.toString() || '10',
        weight: student.weight?.toString() || '',
        beltHistory: student.beltHistory?.map(entry => ({
          belt: entry.belt,
          stripes: entry.stripes,
          date: formatDateForInput(entry.date),
          notes: entry.notes || '',
        })) || [],
        bloodType: student.bloodType || '',
        healthNotes: student.healthNotes || '',
        allergies: student.allergies || [],
        emergencyContactName: student.emergencyContact?.name || '',
        emergencyContactPhone: student.emergencyContact?.phone ? formatPhone(student.emergencyContact.phone) : '',
        emergencyContactRelationship: student.emergencyContact?.relationship || '',
      });
    }
  }, [student, formData]);

  // ============================================
  // Handle Field Change
  // ============================================
  const handleChange = useCallback((field: keyof FormData, value: string | string[] | number | BeltHistoryEntry[]) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const handlePhoneChange = useCallback((field: 'phone' | 'guardianPhone' | 'emergencyContactPhone', value: string) => {
    handleChange(field, formatPhone(value));
  }, [handleChange]);

  const handleCPFChange = useCallback((field: 'cpf' | 'guardianCpf', value: string) => {
    handleChange(field, formatCPF(value));
  }, [handleChange]);

  const handleCEPChange = useCallback((value: string) => {
    handleChange('zipCode', formatCEP(value));
  }, [handleChange]);

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
  // Validate
  // ============================================
  const validate = useCallback((): boolean => {
    if (!formData) return false;
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Only name is required
    if (!formData.fullName.trim()) newErrors.fullName = 'Nome completo obrigatorio';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================
  // Handle Submit
  // ============================================
  const handleSubmit = useCallback(async () => {
    if (!formData || !validate()) return;

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
        tuitionValue: parseFloat(formData.tuitionValue) || 150,
        tuitionDay: parseInt(formData.tuitionDay) || 10,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,

        // Convert belt history
        beltHistory: formData.beltHistory.length > 0
          ? formData.beltHistory.map(entry => ({
              belt: entry.belt,
              stripes: entry.stripes,
              date: new Date(entry.date),
              notes: entry.notes || undefined,
            }))
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
      // Error is handled by the mutation
    }
  }, [formData, validate, updateStudent, studentId, router]);

  // Get belt options based on category
  const beltOptions = formData?.category === 'kids' ? kidsBeltOptions : adultBeltOptions;

  // Loading state
  if (isLoading || !formData) {
    return (
      <ProtectedRoute>
        <AppLayout title="Editar Aluno">
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
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
        <AppLayout title="Aluno nao encontrado">
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <User size={48} style={{ color: '#9ca3af', marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Aluno nao encontrado
            </Typography>
            <Button variant="contained" onClick={() => router.push('/alunos')}>
              Voltar para Lista
            </Button>
          </Paper>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout title="Editar Aluno">
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <IconButton onClick={() => router.back()}>
              <ArrowLeft size={24} />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Editar Aluno
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {student.fullName}
              </Typography>
            </Box>
          </Box>

          {/* Form */}
          <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
            {/* Personal Data */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Dados Pessoais
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label="Nome Completo"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  fullWidth
                  required
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Apelido"
                  value={formData.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Data de Nascimento"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  fullWidth
                  required
                  error={!!errors.birthDate}
                  helperText={errors.birthDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="CPF"
                  value={formData.cpf}
                  onChange={(e) => handleCPFChange('cpf', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="RG"
                  value={formData.rg}
                  onChange={(e) => handleChange('rg', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Telefone (WhatsApp)"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange('phone', e.target.value)}
                  fullWidth
                  required
                  error={!!errors.phone}
                  helperText={errors.phone}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="E-mail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Jiu-Jitsu Data */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Jiu-Jitsu
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
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
                  >
                    <MenuItem value="kids">Kids (ate 15 anos)</MenuItem>
                    <MenuItem value="adult">Adulto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Faixa Atual</InputLabel>
                  <Select
                    value={formData.currentBelt}
                    onChange={(e) => handleChange('currentBelt', e.target.value)}
                    label="Faixa Atual"
                  >
                    {beltOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Graus</InputLabel>
                  <Select
                    value={formData.currentStripes}
                    onChange={(e) => handleChange('currentStripes', e.target.value as Stripes)}
                    label="Graus"
                  >
                    {[0, 1, 2, 3, 4].map(stripe => (
                      <MenuItem key={stripe} value={stripe}>{stripe} grau{stripe !== 1 ? 's' : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Peso (kg)"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  fullWidth
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position="end">kg</InputAdornment>
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Inicio na Academia"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Quando comecou nesta academia"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Inicio no Jiu-Jitsu"
                  type="date"
                  value={formData.jiujitsuStartDate}
                  onChange={(e) => handleChange('jiujitsuStartDate', e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Quando comecou a treinar (qualquer academia)"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    label="Status"
                  >
                    {statusOptions.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {formData.status !== 'active' && (
                <Grid size={12}>
                  <TextField
                    label="Observacao de Status"
                    value={formData.statusNote}
                    onChange={(e) => handleChange('statusNote', e.target.value)}
                    fullWidth
                  />
                </Grid>
              )}

              {/* Belt History */}
              <Grid size={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" color="text.secondary">Historico de Graduacoes</Typography>
                </Divider>
              </Grid>
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Adicione as graduacoes anteriores para preencher a linha do tempo do aluno
                </Typography>

                {formData.beltHistory.map((entry, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Faixa</InputLabel>
                          <Select
                            value={entry.belt}
                            onChange={(e) => {
                              const newHistory = [...formData.beltHistory];
                              newHistory[index].belt = e.target.value as BeltColor | KidsBeltColor;
                              handleChange('beltHistory', newHistory);
                            }}
                            label="Faixa"
                          >
                            {(formData.category === 'kids' ? kidsBeltOptions : adultBeltOptions).map(opt => (
                              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
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
                        />
                      </Grid>
                      <Grid size={{ xs: 10, md: 3 }}>
                        <TextField
                          label="Observacao"
                          size="small"
                          value={entry.notes}
                          onChange={(e) => {
                            const newHistory = [...formData.beltHistory];
                            newHistory[index].notes = e.target.value;
                            handleChange('beltHistory', newHistory);
                          }}
                          fullWidth
                          placeholder="Ex: Promovido por Mestre X"
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
                >
                  Adicionar Graduacao
                </Button>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Financial - Plan Selection */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCard size={22} />
              Plano e Turmas
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Plano</InputLabel>
                  <Select
                    value={currentPlanId}
                    onChange={async (e) => {
                      const newPlanId = e.target.value;
                      // Remove from old plan if exists
                      if (currentPlanId && currentPlanId !== newPlanId) {
                        await togglePlanStudent({ planId: currentPlanId, studentId });
                      }
                      // Add to new plan if selected
                      if (newPlanId) {
                        await togglePlanStudent({ planId: newPlanId, studentId });
                      }
                      setCurrentPlanId(newPlanId);
                    }}
                    label="Plano"
                    startAdornment={
                      <InputAdornment position="start">
                        <CreditCard size={18} />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="">
                      <em>Sem plano</em>
                    </MenuItem>
                    {activePlans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 2 }}>
                          <span>{plan.name}</span>
                          <Chip
                            label={`R$ ${plan.monthlyValue}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {currentPlanId && (
                  <Box sx={{ mt: 1 }}>
                    {(() => {
                      const plan = activePlans.find((p) => p.id === currentPlanId);
                      if (!plan) return null;
                      return (
                        <Typography variant="caption" color="text.secondary">
                          {plan.classesPerWeek === 0 ? 'Acesso livre' : `${plan.classesPerWeek}x por semana`} - R$ {plan.monthlyValue}/mes
                        </Typography>
                      );
                    })()}
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GraduationCap size={16} />
                    Turmas Matriculadas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
                          }}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          size="small"
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                    {classes.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Nenhuma turma cadastrada
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Guardian (for kids) */}
            {formData.category === 'kids' && (
              <>
                <Divider sx={{ my: 4 }} />
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Responsavel
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Nome do Responsavel"
                      value={formData.guardianName}
                      onChange={(e) => handleChange('guardianName', e.target.value)}
                      fullWidth
                      required
                      error={!!errors.guardianName}
                      helperText={errors.guardianName}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Telefone do Responsavel"
                      value={formData.guardianPhone}
                      onChange={(e) => handlePhoneChange('guardianPhone', e.target.value)}
                      fullWidth
                      required
                      error={!!errors.guardianPhone}
                      helperText={errors.guardianPhone}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="E-mail do Responsavel"
                      type="email"
                      value={formData.guardianEmail}
                      onChange={(e) => handleChange('guardianEmail', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="CPF do Responsavel"
                      value={formData.guardianCpf}
                      onChange={(e) => handleCPFChange('guardianCpf', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Autocomplete
                      value={formData.guardianRelationship}
                      onChange={(_, value) => handleChange('guardianRelationship', value || '')}
                      options={relationshipOptions}
                      freeSolo
                      renderInput={(params) => (
                        <TextField {...params} label="Parentesco" />
                      )}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Address */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Endereco
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="CEP"
                  value={formData.zipCode}
                  onChange={(e) => handleCEPChange(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField
                  label="Rua"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  label="Numero"
                  value={formData.number}
                  onChange={(e) => handleChange('number', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Complemento"
                  value={formData.complement}
                  onChange={(e) => handleChange('complement', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Bairro"
                  value={formData.neighborhood}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Cidade"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>UF</InputLabel>
                  <Select
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    label="UF"
                  >
                    {brazilianStates.map(state => (
                      <MenuItem key={state} value={state}>{state}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Health */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Saude
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo Sanguineo</InputLabel>
                  <Select
                    value={formData.bloodType}
                    onChange={(e) => handleChange('bloodType', e.target.value)}
                    label="Tipo Sanguineo"
                  >
                    <MenuItem value="">Nao informado</MenuItem>
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
                      sx={{ flex: 1 }}
                    />
                    <IconButton onClick={handleAddAllergy} color="primary" size="small">
                      <Plus size={18} />
                    </IconButton>
                  </Box>
                </Box>
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Observacoes de Saude"
                  value={formData.healthNotes}
                  onChange={(e) => handleChange('healthNotes', e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Contato de Emergencia - Nome"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Contato de Emergencia - Telefone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handlePhoneChange('emergencyContactPhone', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Autocomplete
                  value={formData.emergencyContactRelationship}
                  onChange={(_, value) => handleChange('emergencyContactRelationship', value || '')}
                  options={relationshipOptions}
                  freeSolo
                  renderInput={(params) => (
                    <TextField {...params} label="Parentesco" />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowLeft size={18} />}
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={isUpdating ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
              onClick={handleSubmit}
              disabled={isUpdating}
            >
              {isUpdating ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </Box>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
