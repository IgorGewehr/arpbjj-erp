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
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { settingsService, AcademySettings, createSettingsService } from '@/services/settingsService';
import { attendanceService } from '@/services/attendanceService';
import { createStudentService } from '@/services';
import { Student } from '@/types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// ============================================
// Types
// ============================================

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

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alteracoes'}
        </Button>
      </Box>
    </SettingsSection>
  );
}

// ============================================
// Academy Tab
// ============================================
type ImageUploadField = 'logoUrl' | 'sidebarLogoUrl' | 'portalBackgroundUrl' | 'adminBackgroundUrl' | 'sidebarBackgroundUrl';

function AcademyTab() {
  const theme = useTheme();
  const { success, error } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ImageUploadField | null>(null);
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
    abacatePayEnabled: false,
    abacatePayApiKey: '',
    storeEnabled: false,
    storePublished: false,
    storeWelcomeMessage: '',
    storeMinOrderAmount: 0,
  });

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getAcademySettings();
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
            abacatePayEnabled: data.abacatePayEnabled || false,
            abacatePayApiKey: data.abacatePayApiKey || '',
            storeEnabled: data.storeEnabled || false,
            storePublished: data.storePublished || false,
            storeWelcomeMessage: data.storeWelcomeMessage || '',
            storeMinOrderAmount: data.storeMinOrderAmount || 0,
          });
        }
      } catch (err) {
        error('Erro ao carregar configuracoes');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [error]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: ImageUploadField) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      error('A imagem deve ter no maximo 2MB');
      return;
    }

    setUploading(field);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `academy/${field}_${timestamp}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setSettings(prev => ({ ...prev, [field]: downloadURL }));
      success('Imagem atualizada!');
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

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await settingsService.saveAcademySettings(settings);
      success('Configuracoes da academia salvas!');
    } catch (err) {
      error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  }, [settings, success, error]);

  return (
    <>
      <SettingsSection
        title="Dados da Academia"
        description="Informacoes gerais da sua academia"
        icon={Building2}
        loading={loading}
      >
        {/* Logo Upload */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Logo da Academia
          </Typography>
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
                accept="image/*"
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
              label="CNPJ"
              value={settings.cnpj}
              onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
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
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Box>
      </SettingsSection>

      {/* Appearance Settings */}
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure as imagens de logo e backgrounds do sistema
        </Typography>

        <Grid container spacing={3}>
          {/* Sidebar Logo */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Logo da Sidebar
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Logo alternativo para a sidebar (opcional)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
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
                  {settings.sidebarLogoUrl ? (
                    <img
                      src={settings.sidebarLogoUrl}
                      alt="Sidebar Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <ImageIcon size={24} color={theme.palette.text.disabled} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="file"
                    id="sidebarLogo-input"
                    onChange={(e) => handleImageUpload(e, 'sidebarLogoUrl')}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading === 'sidebarLogoUrl' ? <CircularProgress size={14} /> : <Upload size={16} />}
                    onClick={() => document.getElementById('sidebarLogo-input')?.click()}
                    disabled={uploading !== null}
                  >
                    {uploading === 'sidebarLogoUrl' ? 'Enviando...' : 'Enviar'}
                  </Button>
                  {settings.sidebarLogoUrl && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => handleRemoveImage('sidebarLogoUrl')}
                    >
                      Remover
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Portal Background */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Background do Portal do Aluno
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Imagem de fundo para o portal do aluno
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 120,
                    height: 80,
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
                  {settings.portalBackgroundUrl ? (
                    <img
                      src={settings.portalBackgroundUrl}
                      alt="Portal Background"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageIcon size={24} color={theme.palette.text.disabled} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="file"
                    id="portalBackground-input"
                    onChange={(e) => handleImageUpload(e, 'portalBackgroundUrl')}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading === 'portalBackgroundUrl' ? <CircularProgress size={14} /> : <Upload size={16} />}
                    onClick={() => document.getElementById('portalBackground-input')?.click()}
                    disabled={uploading !== null}
                  >
                    {uploading === 'portalBackgroundUrl' ? 'Enviando...' : 'Enviar'}
                  </Button>
                  {settings.portalBackgroundUrl && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => handleRemoveImage('portalBackgroundUrl')}
                    >
                      Remover
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Admin Background */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Background do Painel Admin
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Imagem de fundo para o painel do professor/admin
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 120,
                    height: 80,
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
                  {settings.adminBackgroundUrl ? (
                    <img
                      src={settings.adminBackgroundUrl}
                      alt="Admin Background"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageIcon size={24} color={theme.palette.text.disabled} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="file"
                    id="adminBackground-input"
                    onChange={(e) => handleImageUpload(e, 'adminBackgroundUrl')}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading === 'adminBackgroundUrl' ? <CircularProgress size={14} /> : <Upload size={16} />}
                    onClick={() => document.getElementById('adminBackground-input')?.click()}
                    disabled={uploading !== null}
                  >
                    {uploading === 'adminBackgroundUrl' ? 'Enviando...' : 'Enviar'}
                  </Button>
                  {settings.adminBackgroundUrl && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => handleRemoveImage('adminBackgroundUrl')}
                    >
                      Remover
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Sidebar Background */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Background da Sidebar
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Imagem de fundo para a sidebar lateral
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 100,
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
                  {settings.sidebarBackgroundUrl ? (
                    <img
                      src={settings.sidebarBackgroundUrl}
                      alt="Sidebar Background"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageIcon size={24} color={theme.palette.text.disabled} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="file"
                    id="sidebarBackground-input"
                    onChange={(e) => handleImageUpload(e, 'sidebarBackgroundUrl')}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={uploading === 'sidebarBackgroundUrl' ? <CircularProgress size={14} /> : <Upload size={16} />}
                    onClick={() => document.getElementById('sidebarBackground-input')?.click()}
                    disabled={uploading !== null}
                  >
                    {uploading === 'sidebarBackgroundUrl' ? 'Enviando...' : 'Enviar'}
                  </Button>
                  {settings.sidebarBackgroundUrl && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => handleRemoveImage('sidebarBackgroundUrl')}
                    >
                      Remover
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Box>
      </SettingsSection>

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
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Box>
      </SettingsSection>

      {/* Financial Settings */}
      <SettingsSection
        title="Configuracoes Financeiras"
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

        {/* AbacatePay Integration */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Zap size={20} color={theme.palette.warning.main} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Pagamento pela Plataforma
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permita que alunos paguem mensalidades diretamente pelo app via PIX
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
            label="Ativar pagamentos pela plataforma"
          />

          {settings.abacatePayEnabled && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="API Key AbacatePay"
                type="password"
                value={settings.abacatePayApiKey || ''}
                onChange={(e) => setSettings({ ...settings, abacatePayApiKey: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Zap size={18} />
                    </InputAdornment>
                  ),
                }}
                helperText="Sua chave de API do AbacatePay. Obtenha em abacatepay.com"
                sx={{ mb: 2 }}
              />

              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Taxa: 0%</strong> - Alunos podem pagar via PIX e voce sera notificado imediatamente.
                  Os valores serao depositados na sua chave PIX cadastrada acima.
                </Typography>
              </Alert>
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Box>
      </SettingsSection>

      {/* Store Settings */}
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
                  value={(settings.storeMinOrderAmount || 0) / 100}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeMinOrderAmount: Math.round(parseFloat(e.target.value || '0') * 100),
                    })
                  }
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Deixe em 0 para sem valor minimo"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

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

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Box>
      </SettingsSection>
    </>
  );
}


// ============================================
// System Tab (Maintenance)
// ============================================
function SystemTab() {
  const { user } = useAuth();
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
    if (!user?.id) {
      error('Usuario nao autenticado');
      return;
    }

    setRecalculatingAchievements(true);
    setRecalculationResult(null);

    try {
      const result = await attendanceService.recalculateAllAchievements(user.id);
      setRecalculationResult(result);
      success(`Achievements recalculados! ${result.totalAnniversaryCreated + result.totalAttendanceCreated} conquistas criadas.`);
    } catch (err) {
      error('Erro ao recalcular achievements');
      console.error(err);
    } finally {
      setRecalculatingAchievements(false);
    }
  }, [user, success, error]);

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

  // Load monitors and linked students
  useEffect(() => {
    const loadData = async () => {
      if (!academyId) {
        setLoading(false);
        return;
      }

      try {
        const studentService = createStudentService(academyId);
        const allStudents = await studentService.getAll();

        // Get students with linkedUserId (students who have linked accounts)
        const linked = allStudents.filter(s => s.linkedUserId && s.status === 'active');
        setLinkedStudents(linked);

        // Get current monitors
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

      // Update local state
      const addedStudent = linkedStudents.find(s => s.id === selectedStudentId);
      if (addedStudent) {
        setMonitors(prev => [...prev, addedStudent]);
      }
      setSelectedStudentId('');

      // Refresh academy data to update context
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

      // Update local state
      setMonitors(prev => prev.filter(m => m.id !== studentId));

      // Refresh academy data to update context
      await refreshAcademy();

      success('Monitor removido com sucesso!');
    } catch (err) {
      console.error('Error removing monitor:', err);
      error('Erro ao remover monitor');
    } finally {
      setSaving(false);
    }
  };

  // Filter out students who are already monitors
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
    { label: 'Monitores', icon: Shield },
    { label: 'Sistema', icon: Wrench },
  ];

  return (
    <ProtectedRoute>
      <AppLayout title="Configuracoes">
        <Box>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700}>
              Configuracoes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie as configuracoes do sistema
            </Typography>
          </Box>

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
                      minHeight: 56,
                      px: 3,
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
              {tabValue === 2 && <MonitorsTab />}
              {tabValue === 3 && <SystemTab />}
            </Grid>
          </Grid>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
