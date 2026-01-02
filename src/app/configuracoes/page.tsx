'use client';

import { useState, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth, useFeedback } from '@/components/providers';
import { settingsService, AcademySettings } from '@/services/settingsService';

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
  return (
    <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'primary.50',
          }}
        >
          <Icon size={24} color="#2563EB" />
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
    // Simulate API call
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
    logoUrl: '',
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
    <SettingsSection
      title="Dados da Academia"
      description="Informacoes gerais da sua academia"
      icon={Building2}
      loading={loading}
    >
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
            secondary="Alertar sobre elegibilidade para promocao"
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
// Main Component
// ============================================
export default function ConfiguracoesPage() {
  const [tabValue, setTabValue] = useState(0);

  const tabs = [
    { label: 'Perfil', icon: User },
    { label: 'Academia', icon: Building2 },
    { label: 'Notificacoes', icon: Bell },
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
            </Grid>
          </Grid>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
