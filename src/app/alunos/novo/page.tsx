'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  FormHelperText,
  Divider,
  Chip,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { ArrowLeft, ArrowRight, Save, User, MapPin, Shield, Heart, X, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStudents } from '@/hooks';
import { BeltColor, KidsBeltColor, StudentCategory, StudentStatus, Stripes } from '@/types';

// ============================================
// Steps Configuration
// ============================================
const steps = [
  { label: 'Dados Pessoais', icon: User },
  { label: 'Endereco', icon: MapPin },
  { label: 'Jiu-Jitsu', icon: Shield },
  { label: 'Saude', icon: Heart },
];

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
  // Personal
  fullName: string;
  nickname: string;
  birthDate: string;
  cpf: string;
  rg: string;
  phone: string;
  email: string;

  // Address
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;

  // Guardian
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianCpf: string;
  guardianRelationship: string;

  // JJ
  startDate: string;
  category: StudentCategory;
  currentBelt: BeltColor | KidsBeltColor;
  currentStripes: Stripes;
  status: StudentStatus;
  statusNote: string;
  tuitionValue: string;
  tuitionDay: string;

  // Medical
  bloodType: string;
  healthNotes: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

// ============================================
// Initial Form Data
// ============================================
const initialFormData: FormData = {
  fullName: '',
  nickname: '',
  birthDate: '',
  cpf: '',
  rg: '',
  phone: '',
  email: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  zipCode: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianCpf: '',
  guardianRelationship: '',
  startDate: new Date().toISOString().split('T')[0],
  category: 'adult',
  currentBelt: 'white',
  currentStripes: 0,
  status: 'active',
  statusNote: '',
  tuitionValue: '150',
  tuitionDay: '10',
  bloodType: '',
  healthNotes: '',
  allergies: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

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

// ============================================
// StudentRegistrationPage Component
// ============================================
export default function StudentRegistrationPage() {
  const router = useRouter();
  const { createStudent, isCreating } = useStudents({ autoLoad: false });

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [newAllergy, setNewAllergy] = useState('');

  // ============================================
  // Handle Field Change
  // ============================================
  const handleChange = useCallback((field: keyof FormData, value: string | string[] | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  // ============================================
  // Handle Phone Change
  // ============================================
  const handlePhoneChange = useCallback((field: 'phone' | 'guardianPhone' | 'emergencyContactPhone', value: string) => {
    handleChange(field, formatPhone(value));
  }, [handleChange]);

  // ============================================
  // Handle CPF Change
  // ============================================
  const handleCPFChange = useCallback((field: 'cpf' | 'guardianCpf', value: string) => {
    handleChange(field, formatCPF(value));
  }, [handleChange]);

  // ============================================
  // Handle CEP Change
  // ============================================
  const handleCEPChange = useCallback((value: string) => {
    handleChange('zipCode', formatCEP(value));
  }, [handleChange]);

  // ============================================
  // Add Allergy
  // ============================================
  const handleAddAllergy = useCallback(() => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      handleChange('allergies', [...formData.allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  }, [newAllergy, formData.allergies, handleChange]);

  // ============================================
  // Remove Allergy
  // ============================================
  const handleRemoveAllergy = useCallback((allergy: string) => {
    handleChange('allergies', formData.allergies.filter(a => a !== allergy));
  }, [formData.allergies, handleChange]);

  // ============================================
  // Validate Step
  // ============================================
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 0) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Nome completo obrigatorio';
      if (!formData.phone.trim()) newErrors.phone = 'Telefone obrigatorio';
      if (!formData.birthDate) newErrors.birthDate = 'Data de nascimento obrigatoria';
    }

    if (step === 2) {
      if (!formData.startDate) newErrors.startDate = 'Data de inicio obrigatoria';
      if (!formData.tuitionValue) newErrors.tuitionValue = 'Valor da mensalidade obrigatorio';

      // Validate guardian for kids
      if (formData.category === 'kids') {
        if (!formData.guardianName.trim()) newErrors.guardianName = 'Nome do responsavel obrigatorio para kids';
        if (!formData.guardianPhone.trim()) newErrors.guardianPhone = 'Telefone do responsavel obrigatorio para kids';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================
  // Handle Next Step
  // ============================================
  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  }, [activeStep, validateStep]);

  // ============================================
  // Handle Previous Step
  // ============================================
  const handleBack = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  }, []);

  // ============================================
  // Handle Submit
  // ============================================
  const handleSubmit = useCallback(async () => {
    if (!validateStep(activeStep)) return;

    try {
      const studentData = {
        fullName: formData.fullName.trim(),
        nickname: formData.nickname.trim() || undefined,
        birthDate: new Date(formData.birthDate),
        cpf: formData.cpf.replace(/\D/g, '') || undefined,
        rg: formData.rg.trim() || undefined,
        phone: formData.phone.replace(/\D/g, ''),
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

        startDate: new Date(formData.startDate),
        category: formData.category,
        currentBelt: formData.currentBelt,
        currentStripes: formData.currentStripes,
        status: formData.status,
        statusNote: formData.statusNote.trim() || undefined,
        tuitionValue: parseFloat(formData.tuitionValue) || 150,
        tuitionDay: parseInt(formData.tuitionDay) || 10,

        bloodType: formData.bloodType || undefined,
        healthNotes: formData.healthNotes.trim() || undefined,
        allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.replace(/\D/g, ''),
          relationship: formData.emergencyContactRelationship,
        } : undefined,

        isProfilePublic: false,
        createdBy: '',
      };

      const newStudent = await createStudent(studentData);
      router.push(`/alunos/${newStudent.id}`);
    } catch {
      // Error is handled by the mutation
    }
  }, [formData, activeStep, validateStep, createStudent, router]);

  // ============================================
  // Get Belt Options based on Category
  // ============================================
  const beltOptions = formData.category === 'kids' ? kidsBeltOptions : adultBeltOptions;

  // ============================================
  // Render Step Content
  // ============================================
  const renderStepContent = () => {
    switch (activeStep) {
      // ========================================
      // Step 0: Personal Data
      // ========================================
      case 0:
        return (
          <Grid container spacing={3}>
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
                placeholder="000.000.000-00"
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
                placeholder="(00) 00000-0000"
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
        );

      // ========================================
      // Step 1: Address
      // ========================================
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Endereco (opcional)
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="CEP"
                value={formData.zipCode}
                onChange={(e) => handleCEPChange(e.target.value)}
                fullWidth
                placeholder="00000-000"
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
                placeholder="Apto, Bloco, etc"
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
        );

      // ========================================
      // Step 2: Jiu-Jitsu Info
      // ========================================
      case 2:
        return (
          <Grid container spacing={3}>
            {/* Category Selection */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => {
                    const newCategory = e.target.value as StudentCategory;
                    handleChange('category', newCategory);
                    // Reset belt to white when changing category
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
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth required>
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
            <Grid size={{ xs: 12, md: 4 }}>
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

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Data de Inicio"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                fullWidth
                required
                error={!!errors.startDate}
                helperText={errors.startDate}
                slotProps={{ inputLabel: { shrink: true } }}
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
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Observacao de Status"
                value={formData.statusNote}
                onChange={(e) => handleChange('statusNote', e.target.value)}
                fullWidth
                placeholder="Ex: Lesao no joelho"
              />
            </Grid>

            {/* Financial */}
            <Grid size={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">Financeiro</Typography>
              </Divider>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Valor da Mensalidade"
                type="number"
                value={formData.tuitionValue}
                onChange={(e) => handleChange('tuitionValue', e.target.value)}
                fullWidth
                required
                error={!!errors.tuitionValue}
                helperText={errors.tuitionValue}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Dia de Vencimento</InputLabel>
                <Select
                  value={formData.tuitionDay}
                  onChange={(e) => handleChange('tuitionDay', e.target.value)}
                  label="Dia de Vencimento"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <MenuItem key={day} value={day.toString()}>Dia {day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Guardian (for kids) */}
            {formData.category === 'kids' && (
              <>
                <Grid size={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">Responsavel</Typography>
                  </Divider>
                </Grid>

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
                    placeholder="(00) 00000-0000"
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
                    placeholder="000.000.000-00"
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
              </>
            )}
          </Grid>
        );

      // ========================================
      // Step 3: Health Info
      // ========================================
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Informacoes de saude (opcional, mas recomendado)
              </Typography>
            </Grid>

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
                placeholder="Lesoes pre-existentes, condicoes medicas, medicamentos em uso, etc"
              />
            </Grid>

            <Grid size={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">Contato de Emergencia</Typography>
              </Divider>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Nome"
                value={formData.emergencyContactName}
                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Telefone"
                value={formData.emergencyContactPhone}
                onChange={(e) => handlePhoneChange('emergencyContactPhone', e.target.value)}
                fullWidth
                placeholder="(00) 00000-0000"
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
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout title="Novo Aluno">
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <IconButton onClick={() => router.back()}>
              <ArrowLeft size={24} />
            </IconButton>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Cadastrar Aluno
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preencha os dados do novo aluno
              </Typography>
            </Box>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  onClick={() => {
                    if (index < activeStep) setActiveStep(index);
                  }}
                  sx={{ cursor: index < activeStep ? 'pointer' : 'default' }}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Form Content */}
          <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
            {renderStepContent()}
          </Paper>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowLeft size={18} />}
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Voltar
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                startIcon={<Save size={18} />}
                onClick={handleSubmit}
                disabled={isCreating}
              >
                {isCreating ? 'Salvando...' : 'Salvar Aluno'}
              </Button>
            ) : (
              <Button
                variant="contained"
                endIcon={<ArrowRight size={18} />}
                onClick={handleNext}
              >
                Proximo
              </Button>
            )}
          </Box>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
