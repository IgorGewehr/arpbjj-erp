'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Divider,
  Fade,
  Grow,
  keyframes,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, GraduationCap, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { LoadingButton } from '@/components/ui';
import { hapticImpact, hapticNotification } from '@/lib/capacitor';

// Loading animation keyframes
const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.95); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const isDarkMode = theme.palette.mode === 'dark';
  const { signIn, resetPassword, isAuthenticated, loading, error, clearError, user } = useAuth();
  const { academyUser, isLoading: academyLoading, error: academyError, userAcademies, meLoaded } = useAcademy();

  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Redirect based on academy-specific role (not global user role)
  useEffect(() => {
    if (!isAuthenticated || !user || loading || academyLoading) return;

    if (academyUser) {
      // Tem academia — redireciona por role
      setRedirecting(true);
      const role = academyUser.role;
      const redirectTo = role === 'student' ? '/portal'
                       : role === 'guardian' ? '/responsavel'
                       : '/dashboard';
      setTimeout(() => router.push(redirectTo), 300);
    } else if (meLoaded && userAcademies.length === 0) {
      // API retornou com sucesso mas sem academias — usuário genuinamente novo
      setRedirecting(true);
      setTimeout(() => router.push('/criar-academia'), 300);
    }
    // Se meLoaded=false (erro de rede, CORS, etc.) → fica na tela de login sem redirecionar
  }, [isAuthenticated, user, loading, academyUser, academyLoading, academyError, userAcademies, router]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      // Tactile confirmation when user fires the form on a native device.
      void hapticImpact('medium');

      try {
        await signIn(formData.email, formData.password);
      } catch {
        // Error is handled by AuthProvider
        void hapticNotification('error');
      } finally {
        setSubmitting(false);
      }
    },
    [formData, signIn]
  );

  // Show loading while auth is initializing or redirecting
  const isInitializing = loading && !mounted;
  const isLoadingAfterAuth = isAuthenticated && (academyLoading || redirecting);

  // Professional loading screen
  if (isInitializing || isLoadingAfterAuth || !mounted) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          height: '100dvh',
          bgcolor: 'background.default',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background gradient */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '60%',
            background: `radial-gradient(ellipse, ${theme.palette.primary.main}08, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Fade in timeout={400}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {/* Animated logo */}
            <Box
              component="img"
              src="/bjjeasy_logo.png"
              alt="BJJEasy"
              sx={{
                width: 100,
                height: 100,
                objectFit: 'contain',
                animation: `${pulse} 2s ease-in-out infinite`,
              }}
            />

            {/* Loading indicator */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  animation: `${spin} 1s linear infinite`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader2 size={18} color={theme.palette.primary.main} />
              </Box>
              <Typography
                variant="body1"
                color="text.secondary"
                fontWeight={500}
              >
                {redirecting ? 'Entrando...' : 'Carregando...'}
              </Typography>
            </Box>

            {/* Shimmer loading bar */}
            <Box
              sx={{
                width: 180,
                height: 4,
                borderRadius: 2,
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}40, transparent)`,
                  backgroundSize: '200% 100%',
                  animation: `${shimmer} 1.5s ease-in-out infinite`,
                }}
              />
            </Box>
          </Box>
        </Fade>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100dvh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        overflow: 'hidden',
        p: { xs: 2, sm: 3 },
        // Respect iOS notch / home-indicator on Capacitor builds (no-op on web)
        pt: { xs: 'calc(16px + env(safe-area-inset-top, 0px))', sm: 'calc(24px + env(safe-area-inset-top, 0px))' },
        pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 0px))', sm: 'calc(24px + env(safe-area-inset-bottom, 0px))' },
        position: 'relative',
      }}
    >
      {/* Background gradient decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: `radial-gradient(circle, ${theme.palette.primary.main}15, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '40%',
          height: '40%',
          background: `radial-gradient(circle, ${theme.palette.secondary.main}10, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <Grow in timeout={500}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          backdropFilter: 'blur(20px)',
          backgroundColor: isDarkMode
            ? 'rgba(30, 30, 30, 0.9)'
            : 'rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Modern Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src="/bjjeasy_logo.png"
            alt="BJJEasy"
            sx={{
              width: 180,
              height: 180,
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Error Alert */}
        {error && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <Alert
              severity="error"
              sx={{
                borderRadius: 2,
                fontSize: '0.85rem',
                '& .MuiAlert-icon': { alignItems: 'center' },
              }}
              onClose={clearError}
            >
              {error}
            </Alert>
          </Box>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            placeholder="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            size={isMobile ? 'small' : 'medium'}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            placeholder="Senha"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            size={isMobile ? 'small' : 'medium'}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1, mb: 2 }}>
            <Button
              type="button"
              onClick={() => setForgotOpen(true)}
              size="small"
              sx={{
                textTransform: 'none',
                fontSize: '0.825rem',
                fontWeight: 500,
                color: 'primary.main',
              }}
            >
              Esqueci minha senha
            </Button>
          </Box>

          <LoadingButton
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            isLoading={submitting}
            loadingText="Entrando..."
            sx={{
              mb: 3,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              boxShadow: `0 4px 14px ${theme.palette.primary.main}40`,
              '&:hover': {
                boxShadow: `0 6px 20px ${theme.palette.primary.main}50`,
              },
            }}
          >
            Entrar
          </LoadingButton>
        </Box>

        <Divider sx={{ width: '100%', mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
            ou
          </Typography>
        </Divider>

        {/* Create Account Section */}
        <Box
          sx={{
            width: '100%',
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Sparkles size={16} color={theme.palette.primary.main} />
            <Typography variant="subtitle2" fontWeight={600}>
              Primeiro acesso?
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, fontSize: '0.825rem', lineHeight: 1.5 }}
          >
            Recebeu um código do seu professor? Crie sua conta para acessar a plataforma.
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            href="/criar-conta"
            startIcon={<GraduationCap size={18} />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              borderWidth: 1.5,
              '&:hover': {
                borderWidth: 1.5,
              },
            }}
          >
            Criar Conta com Código
          </Button>
          <Button
            variant="text"
            fullWidth
            href="/codigo-equipe"
            sx={{
              mt: 1,
              textTransform: 'none',
              fontSize: '0.8rem',
              color: 'text.secondary',
            }}
          >
            Recebi código de equipe (instrutor)
          </Button>
        </Box>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 3, textAlign: 'center' }}
        >
          Sistema de Gestão de Academia
        </Typography>
      </Paper>
      </Grow>

      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={formData.email}
        onSubmit={resetPassword}
      />
    </Box>
  );
}

// ============================================
// Forgot password dialog
// ============================================
// Self-contained dialog that handles input, loading, success and error
// states. Closing it always resets the inner state so the next open
// shows a fresh form.
interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  initialEmail: string;
  onSubmit: (email: string) => Promise<void>;
}

function ForgotPasswordDialog({
  open,
  onClose,
  initialEmail,
  onSubmit,
}: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync with initialEmail every time the dialog reopens
  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setSent(false);
      setErr(null);
      setSending(false);
    }
  }, [open, initialEmail]);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErr('Digite um email válido.');
      return;
    }
    setSending(true);
    setErr(null);
    try {
      await onSubmit(trimmed);
      setSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('user-not-found')) {
        setErr('Email não cadastrado.');
      } else if (msg.includes('invalid-email')) {
        setErr('Email inválido.');
      } else if (msg.includes('too-many-requests')) {
        setErr('Muitas tentativas. Tente novamente em alguns minutos.');
      } else {
        setErr('Erro ao enviar email. Tente novamente.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{sent ? 'Email enviado' : 'Recuperar senha'}</DialogTitle>
      <DialogContent>
        {sent ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5, pt: 1 }}>
            <CheckCircle size={36} color="#16a34a" />
            <DialogContentText>
              Enviamos um link de recuperação para <strong>{email.trim()}</strong>.
            </DialogContentText>
            <Typography variant="caption" color="text.secondary">
              Verifique também sua caixa de spam.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <DialogContentText sx={{ mb: 2 }}>
              Digite seu email cadastrado. Enviaremos um link para criar uma nova senha.
            </DialogContentText>
            <TextField
              autoFocus
              fullWidth
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
              error={Boolean(err)}
              helperText={err}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !sending) handleSubmit();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={18} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {sent ? (
          <Button onClick={onClose} variant="contained">
            OK
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={sending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={sending}
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
