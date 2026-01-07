'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Chip,
  IconButton,
  Autocomplete,
} from '@mui/material';
import { ArrowLeft, Save, User, MapPin, Shield, Heart, X, Plus, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStudents } from '@/hooks';
import { BeltColor, KidsBeltColor, StudentCategory, StudentStatus, Stripes } from '@/types';
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
// Tabs Configuration
// ============================================
const formTabs = [
  { key: 'personal', label: 'Dados Pessoais', icon: User },
  { key: 'address', label: 'Endereço', icon: MapPin },
  { key: 'jiujitsu', label: 'Jiu-Jitsu', icon: Shield },
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
  weight: string;
  initialAttendanceCount: string;
  beltHistory: BeltHistoryEntry[];
  bloodType: string;
  healthNotes: string;
  allergies: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

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
  jiujitsuStartDate: '',
  category: 'adult',
  currentBelt: 'white',
  currentStripes: 0,
  status: 'active',
  statusNote: '',
  weight: '',
  initialAttendanceCount: '',
  beltHistory: [],
  bloodType: '',
  healthNotes: '',
  allergies: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

// ============================================
// StudentRegistrationPage Component
// ============================================
export default function StudentRegistrationPage() {
  const router = useRouter();
  const { createStudent, isCreating } = useStudents({ autoLoad: false });

  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [newAllergy, setNewAllergy] = useState('');

  // ============================================
  // Calculate form progress
  // ============================================
  const progress = useMemo(() => {
    const fields = [
      // Required
      formData.fullName,
      // Optional but counted
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
      hasErrors: tab.key === 'personal' && !formData.fullName.trim(),
    }));
  }, [formData.fullName]);

  // ============================================
  // Handle Field Change
  // ============================================
  const handleChange = useCallback((field: keyof FormData, value: string | string[] | number | BeltHistoryEntry[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  // ============================================
  // Add/Remove Allergy
  // ============================================
  const handleAddAllergy = useCallback(() => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      handleChange('allergies', [...formData.allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  }, [newAllergy, formData.allergies, handleChange]);

  const handleRemoveAllergy = useCallback((allergy: string) => {
    handleChange('allergies', formData.allergies.filter(a => a !== allergy));
  }, [formData.allergies, handleChange]);

  // ============================================
  // Validate Form
  // ============================================
  const validateForm = useCallback((): boolean => {
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
    if (!validateForm()) return;

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
        tuitionValue: 0,
        tuitionDay: 10,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        initialAttendanceCount: formData.initialAttendanceCount ? parseInt(formData.initialAttendanceCount) : undefined,
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
        isProfilePublic: false,
        createdBy: '',
      };

      await createStudent(studentData);
      router.push('/alunos');
    } catch {
      // Error handled by mutation
    }
  }, [formData, validateForm, createStudent, router]);

  // ============================================
  // Get Belt Options based on Category
  // ============================================
  const beltOptions = formData.category === 'kids' ? KIDS_BELT_OPTIONS : ADULT_BELT_OPTIONS;

  return (
    <ProtectedRoute>
      <AppLayout title="Novo Aluno">
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.back()} sx={{ bgcolor: 'grey.100' }}>
              <ArrowLeft size={20} />
            </IconButton>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Cadastrar Aluno
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preencha os dados do novo aluno
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Save size={18} />}
              onClick={handleSubmit}
              disabled={isCreating}
              sx={{
                bgcolor: '#171717',
                '&:hover': { bgcolor: '#333' },
                borderRadius: 2,
                px: 3,
              }}
            >
              {isCreating ? 'Salvando...' : 'Salvar'}
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
              </FormTabPanel>

              {/* ====================================== */}
              {/* Tab: Endereço */}
              {/* ====================================== */}
              <FormTabPanel tabKey="address" activeTab={activeTab}>
                <FormSection
                  title="Endereço"
                  subtitle="Opcional"
                  icon={MapPin}
                >
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
              {/* Tab: Jiu-Jitsu */}
              {/* ====================================== */}
              <FormTabPanel tabKey="jiujitsu" activeTab={activeTab}>
                <FormSection title="Graduação" icon={Shield}>
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
                        { belt: 'white', stripes: 0, date: '', notes: '' }
                      ]);
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Adicionar Graduação
                  </Button>
                </Box>

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
                            label="Telefone do Responsável"
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
