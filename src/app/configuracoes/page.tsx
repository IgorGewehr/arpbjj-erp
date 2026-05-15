'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  Divider,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Skeleton,
  CircularProgress,
  Tabs,
  Tab,
  InputAdornment,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  useTheme,
} from '@mui/material';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Award,
  RefreshCw,
  Wrench,
  Trophy,
  Upload,
  Image as ImageIcon,
  CreditCard,
  Wallet,
  Zap,
  GraduationCap,
  Store,
  ShoppingBag,
  Palette,
  Type,
  Trash2,
  Shield,
  UserPlus,
  X,
  UserCheck,
  Settings,
  FileCheck,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AcademyPageHeader } from '@/components/layout';
import { TeamTab } from '@/components/features/team/TeamTab';
import { LoadingButton } from '@/components/ui';
import { hapticImpact } from '@/lib/capacitor';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { AcademySettings, createSettingsService } from '@/services/settingsService';
import { createAttendanceService } from '@/services/attendanceService';
import { createStudentService } from '@/services';
import { Student } from '@/types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// ============================================
// Types
// ============================================
type ImageUploadField = 'logoUrl' | 'sidebarLogoUrl' | 'portalBackgroundUrl' | 'adminBackgroundUrl' | 'sidebarBackgroundUrl';

// ============================================
// Settings Section Component
// ============================================
interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
  loading?: boolean;
}

function SettingsSection({ title, description, icon: Icon, children, loading }: SettingsSectionProps) {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${theme.palette.primary.main}15`,
          }}
        >
          <Icon size={24} color={theme.palette.primary.main} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
      </Box>
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
          ))}
        </Box>
      ) : (
        children
      )}
    </Paper>
  );
}

// ============================================
// Save Button Component
// ============================================
interface SaveButtonProps {
  saving: boolean;
  onClick: () => void;
}

function SaveButton({ saving, onClick }: SaveButtonProps) {
  return (
    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
      <LoadingButton
        variant="contained"
        startIcon={<Save size={18} />}
        onClick={() => {
          void hapticImpact('light');
          onClick();
        }}
        isLoading={saving}
        loadingText="Salvando..."
      >
        Salvar
      </LoadingButton>
    </Box>
  );
}

// ============================================
// Profile Tab
// ============================================
function ProfileTab() {
  const { user } = useAuth();
  const { success } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    success('Perfil atualizado com sucesso!');
  }, [success]);

  return (
    <SettingsSection
      title="Perfil do Usuario"
      description="Gerencie suas informacoes pessoais"
      icon={User}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={user?.photoUrl}
            sx={{ width: 100, height: 100, fontSize: '2.5rem' }}
          >
            {user?.displayName?.[0] || 'U'}
          </Avatar>
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <Camera size={16} />
          </IconButton>
        </Box>
        <Box>
          <Typography variant="h6">{user?.displayName || 'Usuario'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Chip
            label={user?.role === 'admin' ? 'Administrador' : 'Usuario'}
            size="small"
            color="primary"
            sx={{ mt: 1 }}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Nome Completo"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <User size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Telefone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <SaveButton saving={saving} onClick={handleSave} />
    </SettingsSection>
  );
}

// ============================================
// Shared Settings Hook
// ============================================
function useSettingsData() {
  const { academyId, refreshAcademy } = useAcademy();
  const { success, error } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AcademySettings>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    responsibleBirthDate: '',
    logoUrl: '',
    portalSlogan: '',
    sidebarLogoUrl: '',
    portalBackgroundUrl: '',
    adminBackgroundUrl: '',
    sidebarBackgroundUrl: '',
    pixKey: '',
    pixKeyType: 'cpf',
    autoGraduationEnabled: false,
    autoGraduationAttendances: 50,
    useClassWeights: false,
    abacatePayEnabled: false,
    asaasEnabled: false,
    storeEnabled: false,
    storePublished: false,
    storeWelcomeMessage: '',
    storeMinOrderAmount: 0,
    storeCreditCardEnabled: false,
    studentCheckinEnabled: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (!academyId) {
        setLoading(false);
        return;
      }

      try {
        const service = createSettingsService(academyId);
        const data = await service.getAcademySettings();
        if (data) {
          setSettings({
            name: data.name || '',
            cnpj: data.cnpj || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            responsibleBirthDate: data.responsibleBirthDate || '',
            logoUrl: data.logoUrl || '',
            portalSlogan: data.portalSlogan || '',
            sidebarLogoUrl: data.sidebarLogoUrl || '',
            portalBackgroundUrl: data.portalBackgroundUrl || '',
            adminBackgroundUrl: data.adminBackgroundUrl || '',
            sidebarBackgroundUrl: data.sidebarBackgroundUrl || '',
            pixKey: data.pixKey || '',
            pixKeyType: data.pixKeyType || 'cpf',
            autoGraduationEnabled: data.autoGraduationEnabled || false,
            autoGraduationAttendances: data.autoGraduationAttendances || 50,
            useClassWeights: data.useClassWeights || false,
            abacatePayEnabled: data.abacatePayEnabled || false,
            asaasEnabled: data.asaasEnabled || false,
            storeEnabled: data.storeEnabled || false,
            storePublished: data.storePublished || false,
            storeWelcomeMessage: data.storeWelcomeMessage || '',
            storeMinOrderAmount: data.storeMinOrderAmount || 0,
            storeCreditCardEnabled: data.storeCreditCardEnabled || false,
            studentCheckinEnabled: data.studentCheckinEnabled || false,
          });
        }
      } catch (err) {
        error('Erro ao carregar configuracoes');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [academyId, error]);

  const handleSave = useCallback(async () => {
    if (!academyId) return;

    setSaving(true);
    try {
      const service = createSettingsService(academyId);
      await service.saveAcademySettings(settings);
      await refreshAcademy();
      success('Configuracoes salvas!');
    } catch (err) {
      console.error('Error saving settings:', err);
      error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  }, [academyId, settings, refreshAcademy, success, error]);

  return {
    settings,
    setSettings,
    saving,
    loading,
    handleSave,
    academyId,
  };
}

// ============================================
// Academy Tab (Basic Info)
// ============================================
function AcademyTab() {
  const theme = useTheme();
  const { error, success } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<ImageUploadField | null>(null);
  const { settings, setSettings, saving, loading, handleSave, academyId } = useSettingsData();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: ImageUploadField) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error('A imagem deve ter no maximo 2MB');
      return;
    }

    setUploading(field);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `academies/${academyId}/branding/${field}_${timestamp}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setSettings(prev => ({ ...prev, [field]: downloadURL }));
      success('Imagem atualizada! Nao esqueca de clicar em Salvar.');
    } catch (err) {
      console.error('Error uploading image:', err);
      error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(null);
    }
  };

  return (
    <SettingsSection
      title="Dados da Academia"
      description="Informacoes gerais da sua academia"
      icon={Building2}
      loading={loading}
    >
      {/* Logo Upload */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Logo da Academia
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.5,
            mb: 2,
            bgcolor: 'info.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'info.200',
          }}
        >
          <Typography variant="caption" color="info.main" fontWeight={500}>
            Tamanho ideal: 400x400px (fundo transparente)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              bgcolor: 'action.hover',
            }}
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageIcon size={40} color={theme.palette.text.disabled} />
            )}
          </Box>
          <Box>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleImageUpload(e, 'logoUrl')}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
            />
            <Button
              variant="outlined"
              startIcon={uploading === 'logoUrl' ? <CircularProgress size={16} /> : <Upload size={18} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading !== null}
              sx={{ mb: 1 }}
            >
              {uploading === 'logoUrl' ? 'Enviando...' : 'Enviar Logo'}
            </Button>
            <Typography variant="caption" color="text.secondary" display="block">
              PNG, JPG ou SVG. Max 2MB.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Nome da Academia"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="CPF/CNPJ"
            value={settings.cnpj}
            onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
            helperText="CPF do responsavel ou CNPJ da academia"
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Telefone"
            value={settings.phone}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Endereco"
            value={settings.address}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MapPin size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Cidade"
            value={settings.city}
            onChange={(e) => setSettings({ ...settings, city: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Estado"
            value={settings.state}
            onChange={(e) => setSettings({ ...settings, state: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="CEP"
            value={settings.zipCode}
            onChange={(e) => setSettings({ ...settings, zipCode: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Data de Nascimento do Responsavel"
            type="date"
            value={settings.responsibleBirthDate}
            onChange={(e) => setSettings({ ...settings, responsibleBirthDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      <SaveButton saving={saving} onClick={handleSave} />
    </SettingsSection>
  );
}

// ============================================
// Appearance Tab
// ============================================
function AppearanceTab() {
  const theme = useTheme();
  const { error, success } = useFeedback();
  const [uploading, setUploading] = useState<ImageUploadField | null>(null);
  const { settings, setSettings, saving, loading, handleSave, academyId } = useSettingsData();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: ImageUploadField) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error('A imagem deve ter no maximo 2MB');
      return;
    }

    setUploading(field);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `academies/${academyId}/branding/${field}_${timestamp}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setSettings(prev => ({ ...prev, [field]: downloadURL }));
      success('Imagem atualizada! Nao esqueca de clicar em Salvar.');
    } catch (err) {
      console.error('Error uploading image:', err);
      error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = (field: ImageUploadField) => {
    setSettings(prev => ({ ...prev, [field]: '' }));
  };

  const ImageUploadBox = ({ field, label, description, width = 80, height = 80, recommendedSize, isLogo = false }: {
    field: ImageUploadField;
    label: string;
    description: string;
    width?: number;
    height?: number;
    recommendedSize?: string;
    isLogo?: boolean;
  }) => (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        {description}
      </Typography>
      {recommendedSize && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.5,
            mb: 2,
            bgcolor: 'info.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'info.200',
          }}
        >
          <Typography variant="caption" color="info.main" fontWeight={500}>
            Tamanho ideal: {recommendedSize}
          </Typography>
          {isLogo && (
            <Typography variant="caption" color="info.main">
              (fundo transparente)
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width,
            height,
            borderRadius: 2,
            border: '2px dashed',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            bgcolor: 'action.hover',
          }}
        >
          {settings[field] ? (
            <img
              src={settings[field]}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={24} color={theme.palette.text.disabled} />
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <input
            type="file"
            id={`${field}-input`}
            onChange={(e) => handleImageUpload(e, field)}
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={uploading === field ? <CircularProgress size={14} /> : <Upload size={16} />}
            onClick={() => document.getElementById(`${field}-input`)?.click()}
            disabled={uploading !== null}
          >
            {uploading === field ? 'Enviando...' : 'Enviar'}
          </Button>
          {settings[field] && (
            <Button
              variant="text"
              size="small"
              color="error"
              startIcon={<Trash2 size={14} />}
              onClick={() => handleRemoveImage(field)}
            >
              Remover
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <SettingsSection
      title="Aparencia"
      description="Personalize a aparencia do portal e painel administrativo"
      icon={Palette}
      loading={loading}
    >
      {/* Portal Slogan */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          label="Slogan do Portal"
          value={settings.portalSlogan}
          onChange={(e) => setSettings({ ...settings, portalSlogan: e.target.value })}
          placeholder="Ex: Vamos avante, ombro a ombro"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Type size={18} />
              </InputAdornment>
            ),
          }}
          helperText="Frase exibida na barra superior do portal do aluno junto com o nome da academia"
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Image Uploads Grid */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
        Imagens Personalizadas
      </Typography>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          <strong>Dica:</strong> Para melhor qualidade, use imagens PNG com fundo transparente para logos.
          Para backgrounds, use imagens de alta resolucao no formato JPG ou PNG.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ImageUploadBox
            field="sidebarLogoUrl"
            label="Logo da Sidebar"
            description="Logo alternativo para a sidebar (opcional)"
            width={80}
            height={80}
            recommendedSize="200x200px"
            isLogo
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ImageUploadBox
            field="portalBackgroundUrl"
            label="Background do Portal do Aluno"
            description="Imagem de fundo para o portal do aluno"
            width={120}
            height={80}
            recommendedSize="1920x1080px"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ImageUploadBox
            field="adminBackgroundUrl"
            label="Background do Painel Admin"
            description="Imagem de fundo para o painel do professor/admin"
            width={120}
            height={80}
            recommendedSize="1920x1080px"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ImageUploadBox
            field="sidebarBackgroundUrl"
            label="Background da Sidebar"
            description="Imagem de fundo para a sidebar lateral"
            width={80}
            height={100}
            recommendedSize="400x900px"
          />
        </Grid>
      </Grid>

      <SaveButton saving={saving} onClick={handleSave} />
    </SettingsSection>
  );
}

// ============================================
// KYC Verification Section
// ============================================
function KycSection({ academyId }: { academyId: string }) {
  const { user } = useAuth();
  const { error, success } = useFeedback();
  const { academy } = useAcademy();

  const [kycStatus, setKycStatus] = useState<string>('not_checked');
  const [kycOnboardingUrl, setKycOnboardingUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [creatingSubAccount, setCreatingSubAccount] = useState(false);

  const hasSubAccount = !!academy?.asaasSubAccountId;

  const checkKycStatus = useCallback(async () => {
    if (!academyId || !user?.id) return;

    setChecking(true);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      if (!token) {
        error('Sessao expirada');
        return;
      }

      const response = await fetch(
        `/api/payments/onboard/documents?academyId=${academyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao verificar documentos');
      }

      const result = await response.json();
      const { status, onboardingUrl } = result.data;

      setKycStatus(status);
      setKycOnboardingUrl(onboardingUrl || null);
    } catch (err) {
      console.error('KYC check error:', err);
      error(err instanceof Error ? err.message : 'Erro ao verificar documentos');
    } finally {
      setChecking(false);
    }
  }, [academyId, user?.id, error]);

  // Auto-check on mount only when sub-account exists
  useEffect(() => {
    if (hasSubAccount) {
      checkKycStatus();
    }
  }, [hasSubAccount, checkKycStatus]);

  const handleCreateSubAccount = async () => {
    if (!academyId) return;

    // Validate required fields client-side
    if (!academy?.cnpj || !academy?.email || !academy?.name) {
      error(
        'A academia precisa ter CPF/CNPJ, email e nome configurados antes de criar a subconta Asaas. ' +
        'Preencha esses campos na aba "Dados da Academia" e salve.'
      );
      return;
    }

    setCreatingSubAccount(true);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      if (!token) {
        error('Sessao expirada');
        return;
      }

      const response = await fetch('/api/payments/onboard', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ academyId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao criar subconta Asaas');
      }

      success('Subconta Asaas criada com sucesso! Verificando documentos...');
    } catch (err) {
      console.error('Sub-account creation error:', err);
      error(err instanceof Error ? err.message : 'Erro ao criar subconta Asaas');
    } finally {
      setCreatingSubAccount(false);
    }
  };

  // Sub-account not yet created — show creation step
  if (!hasSubAccount) {
    const missingFields: string[] = [];
    if (!academy?.cnpj) missingFields.push('CPF/CNPJ');
    if (!academy?.email) missingFields.push('Email');
    if (!academy?.name) missingFields.push('Nome');
    if (!academy?.responsibleBirthDate) missingFields.push('Data de Nascimento do Responsavel');

    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
          <Typography variant="body2">
            <strong>Subconta Asaas nao encontrada</strong> - Para receber pagamentos via Asaas, crie uma subconta vinculada a esta academia.
          </Typography>
        </Alert>
        {missingFields.length > 0 && (
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
            <Typography variant="body2">
              Campos obrigatorios faltando: <strong>{missingFields.join(', ')}</strong>.
              Preencha na aba &quot;Dados da Academia&quot; e salve antes de continuar.
            </Typography>
          </Alert>
        )}
        <Button
          variant="contained"
          startIcon={creatingSubAccount ? <CircularProgress size={16} color="inherit" /> : <Wallet size={18} />}
          onClick={handleCreateSubAccount}
          disabled={creatingSubAccount || missingFields.length > 0}
        >
          {creatingSubAccount ? 'Criando Subconta...' : 'Criar Subconta Asaas'}
        </Button>
      </Box>
    );
  }

  // Not checked yet
  if (kycStatus === 'not_checked') {
    return (
      <Box sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={checking ? <CircularProgress size={16} color="inherit" /> : <FileCheck size={18} />}
          onClick={checkKycStatus}
          disabled={checking}
        >
          {checking ? 'Verificando...' : 'Verificar Documentos'}
        </Button>
      </Box>
    );
  }

  // Approved
  if (kycStatus === 'approved') {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="success" icon={<CheckCircle size={20} />} sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Documentos Aprovados!</strong> - Sua conta esta totalmente verificada.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Pending review
  if (kycStatus === 'pending_review') {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info" icon={<Clock size={20} />} sx={{ borderRadius: 2, mb: 2 }}>
          <Typography variant="body2">
            <strong>Documentos em Analise</strong> - Seus documentos estao sendo verificados. A aprovacao pode levar ate 48 horas.
          </Typography>
        </Alert>
        <Button
          variant="outlined"
          size="small"
          startIcon={checking ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={16} />}
          onClick={checkKycStatus}
          disabled={checking}
        >
          {checking ? 'Atualizando...' : 'Atualizar Status'}
        </Button>
      </Box>
    );
  }

  // Rejected or pending upload — show single verification button
  const isRejected = kycStatus === 'rejected';

  return (
    <Box sx={{ mt: 2 }}>
      <Alert
        severity={isRejected ? 'error' : 'warning'}
        icon={isRejected ? <AlertTriangle size={20} /> : undefined}
        sx={{ borderRadius: 2, mb: 2 }}
      >
        <Typography variant="body2">
          {isRejected ? (
            <><strong>Documentos Rejeitados</strong> - Envie novamente os documentos solicitados.</>
          ) : (
            <><strong>Documentos Pendentes</strong> - Complete a verificacao para ativar sua conta.</>
          )}
        </Typography>
      </Alert>
      {kycOnboardingUrl ? (
        <Button
          variant="contained"
          startIcon={<ExternalLink size={18} />}
          href={kycOnboardingUrl}
          target="_blank"
          rel="noopener noreferrer"
          fullWidth
          sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: '0.95rem' }}
        >
          {isRejected ? 'Reenviar Documentos' : 'Iniciar Verificacao'}
        </Button>
      ) : (
        <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
          <Typography variant="body2">
            Link de verificacao nao disponivel. Clique em &quot;Atualizar Status&quot; para tentar novamente.
          </Typography>
        </Alert>
      )}
      <Button
        variant="outlined"
        size="small"
        startIcon={checking ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={16} />}
        onClick={checkKycStatus}
        disabled={checking}
        sx={{ mt: 2 }}
      >
        {checking ? 'Atualizando...' : 'Atualizar Status'}
      </Button>
    </Box>
  );
}

// ============================================
// Payments Tab
// ============================================
function PaymentsTab() {
  const theme = useTheme();
  const { settings, setSettings, saving, loading, handleSave, academyId } = useSettingsData();

  return (
    <SettingsSection
      title="Pagamentos"
      description="PIX e integracao de pagamentos"
      icon={Wallet}
      loading={loading}
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Chave PIX</InputLabel>
            <Select
              value={settings.pixKeyType || 'cpf'}
              onChange={(e) =>
                setSettings({ ...settings, pixKeyType: e.target.value as AcademySettings['pixKeyType'] })
              }
              label="Tipo de Chave PIX"
            >
              <MenuItem value="cpf">CPF</MenuItem>
              <MenuItem value="cnpj">CNPJ</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="phone">Telefone</MenuItem>
              <MenuItem value="random">Chave Aleatoria</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField
            fullWidth
            label="Chave PIX"
            value={settings.pixKey}
            onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CreditCard size={18} />
                </InputAdornment>
              ),
            }}
            helperText="Chave PIX para recebimento de pagamentos e saques"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Asaas Integration */}
      <Box sx={{ mb: 3, opacity: 0.6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CreditCard size={20} color={theme.palette.primary.main} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Asaas - Pagamentos via Subconta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pagamentos via PIX e cartao com subconta propria (CNPJ da academia)
            </Typography>
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={false}
              disabled
              color="primary"
            />
          }
          label={
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" fontWeight={500} color="text.secondary">
                  Ativar pagamentos via Asaas
                </Typography>
                <Chip label="Em breve" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Pagamentos via Asaas estarão disponíveis em breve
              </Typography>
            </Box>
          }
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* AbacatePay Integration (Legacy) */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Zap size={20} color={theme.palette.warning.main} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              AbacatePay (Legado)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cobranca automatica via PIX - para academias que ja usam AbacatePay
            </Typography>
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={settings.abacatePayEnabled}
              onChange={(e) =>
                setSettings({ ...settings, abacatePayEnabled: e.target.checked })
              }
              color="primary"
            />
          }
          label="Ativar AbacatePay"
        />

        {settings.abacatePayEnabled && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>AbacatePay Ativo!</strong> - Alunos podem pagar via PIX.
              </Typography>
            </Alert>
          </Box>
        )}
      </Box>

      <SaveButton saving={saving} onClick={handleSave} />
    </SettingsSection>
  );
}

// ============================================
// Store Tab
// ============================================
function StoreTab() {
  const { settings, setSettings, saving, loading, handleSave } = useSettingsData();

  return (
    <SettingsSection
      title="Loja"
      description="Venda uniformes, equipamentos e acessorios para seus alunos"
      icon={Store}
      loading={loading}
    >
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.storeEnabled}
              onChange={(e) =>
                setSettings({ ...settings, storeEnabled: e.target.checked })
              }
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body1" fontWeight={500}>
                Habilitar Loja
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ative para gerenciar produtos e receber pedidos
              </Typography>
            </Box>
          }
        />
      </Box>

      {settings.storeEnabled && (
        <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Mensagem de Boas-vindas"
                value={settings.storeWelcomeMessage || ''}
                onChange={(e) =>
                  setSettings({ ...settings, storeWelcomeMessage: e.target.value })
                }
                placeholder="Ex: Bem-vindo a nossa loja! Confira nossos produtos."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShoppingBag size={18} />
                    </InputAdornment>
                  ),
                }}
                helperText="Mensagem exibida aos alunos na pagina da loja"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Valor Minimo do Pedido (R$)"
                type="number"
                value={settings.storeMinOrderAmount || 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    storeMinOrderAmount: parseFloat(e.target.value || '0'),
                  })
                }
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Deixe em 0 para sem valor minimo"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Payment Methods */}
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Metodos de Pagamento na Loja
          </Typography>

          <Box sx={{ mb: 3, opacity: 0.6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={false}
                  disabled
                  color="primary"
                />
              }
              label={
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight={500} color="text.secondary">
                      Habilitar Cartao de Credito
                    </Typography>
                    <Chip label="Em breve" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Pagamento com cartao de credito estara disponivel em breve
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Publish Store */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: settings.storePublished ? 'success.50' : 'warning.50',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: settings.storePublished ? 'success.main' : 'warning.main',
                }}
              />
              <Typography
                variant="body2"
                fontWeight={600}
                color={settings.storePublished ? 'success.main' : 'warning.main'}
              >
                {settings.storePublished ? 'Loja Publicada' : 'Loja em Rascunho'}
              </Typography>
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.storePublished}
                onChange={(e) =>
                  setSettings({ ...settings, storePublished: e.target.checked })
                }
                color="success"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Publicar Loja
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Quando publicada, os alunos poderao ver e comprar produtos
                </Typography>
              </Box>
            }
          />

          {!settings.storePublished && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2">
                Sua loja esta em modo rascunho. Adicione produtos em <strong>/loja</strong> e depois publique quando estiver pronta.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      <SaveButton saving={saving} onClick={handleSave} />
    </SettingsSection>
  );
}

// ============================================
// Resources Tab (Auto-graduation, Check-in, Plans, etc)
// ============================================
function ResourcesTab() {
  const { settings, setSettings, saving, loading, handleSave } = useSettingsData();

  return (
    <>
      {/* Auto-graduation Settings */}
      <SettingsSection
        title="Graduacao Automatica"
        description="Configure graduacao baseada em presencas"
        icon={GraduationCap}
        loading={loading}
      >
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoGraduationEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, autoGraduationEnabled: e.target.checked })
                }
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Ativar graduacao automatica por presenca
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Alunos serao notificados quando atingirem o numero de presencas para graduacao
                </Typography>
              </Box>
            }
          />
        </Box>

        {settings.autoGraduationEnabled && (
          <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <TextField
              label="Presencas para graduacao"
              type="number"
              value={settings.autoGraduationAttendances}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoGraduationAttendances: parseInt(e.target.value) || 50,
                })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Award size={18} />
                  </InputAdornment>
                ),
              }}
              helperText="Numero de presencas necessarias para cada grau"
              sx={{ width: 280 }}
            />

            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2">
                Com {settings.autoGraduationAttendances} presencas configuradas, os professores serao notificados
                quando um aluno estiver proximo ou atingir essa marca para ganhar um novo grau.
              </Typography>
            </Alert>

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.useClassWeights}
                    onChange={(e) =>
                      setSettings({ ...settings, useClassWeights: e.target.checked })
                    }
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Usar pesos por turma
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cada turma pode valer mais de um ponto (ex: aula particular vale 2).
                      Quando desativado, toda presenca conta 1.
                    </Typography>
                  </Box>
                }
              />
              {settings.useClassWeights && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="body2">
                    Defina o peso de cada turma no formulario de edicao de turmas.
                    Turmas sem peso configurado contam como 1.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        )}

        <SaveButton saving={saving} onClick={handleSave} />
      </SettingsSection>

      {/* Student Check-in Settings */}
      <SettingsSection
        title="Check-in de Alunos"
        description="Permita que alunos marquem presenca pelo app"
        icon={UserCheck}
        loading={loading}
      >
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.studentCheckinEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, studentCheckinEnabled: e.target.checked })
                }
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Habilitar Check-in de Alunos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Alunos poderao fazer check-in pelo app para marcar presenca
                </Typography>
              </Box>
            }
          />
        </Box>

        {settings.studentCheckinEnabled && (
          <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
              <Typography variant="body2">
                <strong>Como funciona:</strong>
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Alunos podem fazer check-in de 30 minutos antes do inicio ate 1 hora apos o fim da aula</li>
                <li>O check-in fica como &quot;pendente&quot; ate o professor confirmar</li>
                <li>Na tela de chamada, o professor ve um botao &quot;Check-ins&quot; com os alunos que fizeram check-in</li>
                <li>Ao confirmar, os check-ins sao convertidos em presencas oficiais</li>
              </Box>
            </Alert>
          </Box>
        )}

        <SaveButton saving={saving} onClick={handleSave} />
      </SettingsSection>
    </>
  );
}

// ============================================
// System Tab (Maintenance)
// ============================================
function SystemTab() {
  const { user } = useAuth();
  const { academyId } = useAcademy();
  const { success, error } = useFeedback();
  const [recalculatingAchievements, setRecalculatingAchievements] = useState(false);
  const [recalculationResult, setRecalculationResult] = useState<{
    studentsProcessed: number;
    totalAnniversaryCreated: number;
    totalAttendanceCreated: number;
    details: Array<{
      studentId: string;
      studentName: string;
      anniversaryCreated: string[];
      attendanceCreated: string[];
    }>;
  } | null>(null);

  const handleRecalculateAchievements = useCallback(async () => {
    if (!user?.id || !academyId) {
      error('Usuario nao autenticado ou academia nao encontrada');
      return;
    }

    setRecalculatingAchievements(true);
    setRecalculationResult(null);

    try {
      const attendanceService = createAttendanceService(academyId);
      const result = await attendanceService.recalculateAllAchievements(user.id);
      setRecalculationResult(result);
      success(`Achievements recalculados! ${result.totalAnniversaryCreated + result.totalAttendanceCreated} conquistas criadas.`);
    } catch (err) {
      error('Erro ao recalcular achievements');
      console.error(err);
    } finally {
      setRecalculatingAchievements(false);
    }
  }, [user, academyId, success, error]);

  return (
    <SettingsSection
      title="Manutencao do Sistema"
      description="Ferramentas de manutencao e correcao de dados"
      icon={Wrench}
    >
      {/* Recalculate Achievements */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Trophy size={20} color="#F59E0B" />
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              Recalcular Achievements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recalcula todos os marcos (aniversarios de treino e presencas) para todos os alunos ativos com as datas corretas.
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          color="warning"
          startIcon={recalculatingAchievements ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={18} />}
          onClick={handleRecalculateAchievements}
          disabled={recalculatingAchievements}
          sx={{ mb: 2 }}
        >
          {recalculatingAchievements ? 'Recalculando...' : 'Recalcular Achievements'}
        </Button>

        {recalculationResult && (
          <Paper sx={{ p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="success.main" fontWeight={600}>
              Recalculo Concluido
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Alunos processados:</strong> {recalculationResult.studentsProcessed}
            </Typography>
            <Typography variant="body2">
              <strong>Aniversarios criados:</strong> {recalculationResult.totalAnniversaryCreated}
            </Typography>
            <Typography variant="body2">
              <strong>Marcos de presenca criados:</strong> {recalculationResult.totalAttendanceCreated}
            </Typography>

            {recalculationResult.details.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Detalhes:
                </Typography>
                <List dense>
                  {recalculationResult.details.map((detail) => (
                    <ListItem key={detail.studentId} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={detail.studentName}
                        secondary={[
                          ...detail.anniversaryCreated.map(a => `${a} de treino`),
                          ...detail.attendanceCreated,
                        ].join(', ')}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" color="text.secondary">
        Mais ferramentas de manutencao serao adicionadas conforme necessario.
      </Typography>
    </SettingsSection>
  );
}

// ============================================
// Monitors Tab
// ============================================
function MonitorsTab() {
  const theme = useTheme();
  const { success, error } = useFeedback();
  const { academyId, academy, refreshAcademy } = useAcademy();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monitors, setMonitors] = useState<Student[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!academyId) {
        setLoading(false);
        return;
      }

      try {
        const studentService = createStudentService(academyId);
        const allStudents = await studentService.getAll();

        const linked = allStudents.filter(s => s.linkedUserId && s.status === 'active');
        setLinkedStudents(linked);

        const monitorIds = academy?.monitorIds || [];
        const currentMonitors = allStudents.filter(s => monitorIds.includes(s.id));
        setMonitors(currentMonitors);
      } catch (err) {
        console.error('Error loading monitors data:', err);
        error('Erro ao carregar dados dos monitores');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [academyId, academy?.monitorIds, error]);

  const handleAddMonitor = async () => {
    if (!selectedStudentId || !academyId) return;

    setSaving(true);
    try {
      const settingsServiceInstance = createSettingsService(academyId);
      await settingsServiceInstance.addMonitor(selectedStudentId);

      setSelectedStudentId('');
      await refreshAcademy();

      success('Monitor adicionado com sucesso!');
    } catch (err) {
      console.error('Error adding monitor:', err);
      error('Erro ao adicionar monitor');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMonitor = async (studentId: string) => {
    if (!academyId) return;

    setSaving(true);
    try {
      const settingsServiceInstance = createSettingsService(academyId);
      await settingsServiceInstance.removeMonitor(studentId);

      await refreshAcademy();

      success('Monitor removido com sucesso!');
    } catch (err) {
      console.error('Error removing monitor:', err);
      error('Erro ao remover monitor');
    } finally {
      setSaving(false);
    }
  };

  const availableStudents = linkedStudents.filter(
    s => !monitors.some(m => m.id === s.id)
  );

  return (
    <SettingsSection
      title="Monitores"
      description="Alunos com permissao para fazer chamada e gerenciar alunos"
      icon={Shield}
      loading={loading}
    >
      {/* Add Monitor */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Adicionar Monitor
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecione um aluno com conta vinculada para adiciona-lo como monitor.
          Monitores podem fazer chamada de presenca e gerenciar alunos.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>Selecionar Aluno</InputLabel>
            <Select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              label="Selecionar Aluno"
              disabled={saving || availableStudents.length === 0}
            >
              {availableStudents.length === 0 ? (
                <MenuItem disabled value="">
                  Nenhum aluno com conta vinculada disponivel
                </MenuItem>
              ) : (
                availableStudents.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.fullName} {student.nickname ? `(${student.nickname})` : ''}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={18} />}
            onClick={handleAddMonitor}
            disabled={saving || !selectedStudentId}
            sx={{ minWidth: 160, height: 56 }}
          >
            {saving ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </Box>

        {linkedStudents.length === 0 && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              Nenhum aluno possui conta vinculada. Para um aluno ser monitor, ele precisa
              primeiro vincular sua conta atraves do codigo de vinculacao.
            </Typography>
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Current Monitors List */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Monitores Atuais ({monitors.length})
        </Typography>

        {monitors.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: 'grey.50',
              borderRadius: 2,
            }}
          >
            <Shield size={48} color={theme.palette.text.disabled} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Nenhum monitor cadastrado
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {monitors.map((monitor) => (
              <ListItem
                key={monitor.id}
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  mb: 1,
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveMonitor(monitor.id)}
                    disabled={saving}
                    sx={{
                      color: 'error.main',
                      '&:hover': { bgcolor: 'error.50' },
                    }}
                  >
                    <X size={18} />
                  </IconButton>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={monitor.photoUrl}
                    sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
                  >
                    {monitor.fullName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {monitor.fullName}
                    </Typography>
                    {monitor.nickname && (
                      <Typography variant="caption" color="text.secondary">
                        {monitor.nickname}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <Typography variant="body2">
          <strong>Permissoes do Monitor:</strong>
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          <li>Fazer chamada de presenca</li>
          <li>Visualizar, cadastrar e editar alunos</li>
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Monitores NAO tem acesso a: Financeiro, Relatorios, Configuracoes.
        </Typography>
      </Alert>
    </SettingsSection>
  );
}

// ============================================
// Main Component
// ============================================
export default function ConfiguracoesPage() {
  const [tabValue, setTabValue] = useState(0);

  const tabs = [
    { label: 'Perfil', icon: User },
    { label: 'Academia', icon: Building2 },
    { label: 'Aparencia', icon: Palette },
    { label: 'Pagamentos', icon: Wallet },
    { label: 'Loja', icon: Store },
    { label: 'Recursos', icon: Settings },
    { label: 'Equipe', icon: Users },
    { label: 'Sistema', icon: Wrench },
  ];

  return (
    <ProtectedRoute>
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <AcademyPageHeader
            icon={<Settings size={20} />}
            title="Configurações"
            description="Gerencie as configurações do sistema"
          />

          <Grid container spacing={3}>
            {/* Sidebar Tabs */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                  orientation="vertical"
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  sx={{
                    '& .MuiTab-root': {
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      minHeight: 48,
                      px: 2.5,
                    },
                  }}
                >
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.label}
                      label={tab.label}
                      icon={<tab.icon size={18} />}
                      iconPosition="start"
                      sx={{
                        gap: 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    />
                  ))}
                </Tabs>
              </Paper>
            </Grid>

            {/* Content */}
            <Grid size={{ xs: 12, md: 9 }}>
              {tabValue === 0 && <ProfileTab />}
              {tabValue === 1 && <AcademyTab />}
              {tabValue === 2 && <AppearanceTab />}
              {tabValue === 3 && <PaymentsTab />}
              {tabValue === 4 && <StoreTab />}
              {tabValue === 5 && <ResourcesTab />}
              {tabValue === 6 && <TeamTab />}
              {tabValue === 7 && <SystemTab />}
            </Grid>
          </Grid>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
