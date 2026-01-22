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
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
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
  Bell,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  Calendar,
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth, useFeedback } from '@/components/providers';
import { settingsService, AcademySettings } from '@/services/settingsService';
import { attendanceService } from '@/services/attendanceService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// ============================================
// Types
// ============================================
interface NotificationSettings {
  emailPaymentReminder: boolean;
  emailAttendance: boolean;
  emailPromotion: boolean;
  whatsappReminder: boolean;
}

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
function AcademyTab() {
  const theme = useTheme();
  const { success, error } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    pixKey: '',
    pixKeyType: 'cpf',
    autoGraduationEnabled: false,
    autoGraduationAttendances: 50,
    abacatePayEnabled: false,
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
            pixKey: data.pixKey || '',
            pixKeyType: data.pixKeyType || 'cpf',
            autoGraduationEnabled: data.autoGraduationEnabled || false,
            autoGraduationAttendances: data.autoGraduationAttendances || 50,
            abacatePayEnabled: data.abacatePayEnabled || false,
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `academy/logo_${timestamp}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setSettings(prev => ({ ...prev, logoUrl: downloadURL }));
      success('Logo atualizado!');
    } catch (err) {
      console.error('Error uploading logo:', err);
      error('Erro ao fazer upload do logo');
    } finally {
      setUploading(false);
    }
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
                onChange={handleLogoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={16} /> : <Upload size={18} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                sx={{ mb: 1 }}
              >
                {uploading ? 'Enviando...' : 'Enviar Logo'}
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
            <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Taxa: 0%</strong> - Alunos podem pagar via PIX e voce sera notificado imediatamente.
                Os valores serao depositados na sua chave PIX cadastrada acima.
              </Typography>
            </Alert>
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
    </>
  );
}

// ============================================
// Notifications Tab
// ============================================
function NotificationsTab() {
  const { success } = useFeedback();
  const [settings, setSettings] = useState<NotificationSettings>({
    emailPaymentReminder: true,
    emailAttendance: true,
    emailPromotion: true,
    whatsappReminder: true,
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    success('Configuracao atualizada!');
  };

  return (
    <SettingsSection
      title="Notificacoes"
      description="Configure como voce deseja receber alertas"
      icon={Bell}
    >
      <List>
        <ListItem>
          <ListItemIcon>
            <Mail size={20} />
          </ListItemIcon>
          <ListItemText
            primary="Lembrete de Pagamento por Email"
            secondary="Enviar email aos alunos antes do vencimento"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={settings.emailPaymentReminder}
              onChange={() => handleToggle('emailPaymentReminder')}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemIcon>
            <Calendar size={20} />
          </ListItemIcon>
          <ListItemText
            primary="Resumo de Presenca"
            secondary="Notificar sobre faltas consecutivas"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={settings.emailAttendance}
              onChange={() => handleToggle('emailAttendance')}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemIcon>
            <Award size={20} />
          </ListItemIcon>
          <ListItemText
            primary="Notificacao de Graduacao"
            secondary="Alertar quando aluno atingir meta de presencas"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={settings.emailPromotion}
              onChange={() => handleToggle('emailPromotion')}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>
        <Divider component="li" />
        <ListItem>
          <ListItemIcon>
            <Phone size={20} />
          </ListItemIcon>
          <ListItemText
            primary="WhatsApp"
            secondary="Enviar lembretes via WhatsApp"
          />
          <ListItemSecondaryAction>
            <Switch
              checked={settings.whatsappReminder}
              onChange={() => handleToggle('whatsappReminder')}
              color="primary"
            />
          </ListItemSecondaryAction>
        </ListItem>
      </List>
    </SettingsSection>
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
// Main Component
// ============================================
export default function ConfiguracoesPage() {
  const [tabValue, setTabValue] = useState(0);

  const tabs = [
    { label: 'Perfil', icon: User },
    { label: 'Academia', icon: Building2 },
    { label: 'Notificacoes', icon: Bell },
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
              {tabValue === 2 && <NotificationsTab />}
              {tabValue === 3 && <SystemTab />}
            </Grid>
          </Grid>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
