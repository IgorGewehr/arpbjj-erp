'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, GraduationCap, User, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/providers';

type LoginMode = 'student' | 'teacher';

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { signIn, signUp, isAuthenticated, loading, error, clearError } = useAuth();

  const [mode, setMode] = useState<LoginMode>('student');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Clear error when switching modes
  useEffect(() => {
    clearError();
    setFormData({ email: '', password: '', displayName: '' });
    setIsSignUp(false);
  }, [mode, clearError]);

  // Clear error when switching sign up/in
  useEffect(() => {
    clearError();
  }, [isSignUp, clearError]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        if (isSignUp) {
          await signUp(formData.email, formData.password, formData.displayName);
        } else {
          await signIn(formData.email, formData.password);
        }
        router.push('/dashboard');
      } catch {
        // Error is handled by AuthProvider
      } finally {
        setSubmitting(false);
      }
    },
    [isSignUp, formData, signIn, signUp, router]
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'student' ? 'teacher' : 'student'));
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: { xs: 1.5, sm: 2 },
          minHeight: '100vh',
          px: 2,
        }}
      >
        <CircularProgress size={isMobile ? 36 : 48} />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          Carregando...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Top Bar with Mode Toggle */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          p: { xs: 1.5, sm: 2 },
        }}
      >
        <Button
          variant={mode === 'teacher' ? 'contained' : 'outlined'}
          size="small"
          startIcon={mode === 'student' ? <Shield size={16} /> : <ArrowLeft size={16} />}
          onClick={toggleMode}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          }}
        >
          {mode === 'student' ? 'Sou o Professor' : 'Voltar para Alunos'}
        </Button>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 1.5, sm: 2 },
          pb: { xs: 4, sm: 6 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: 440 },
            p: { xs: 2.5, sm: 4 },
            borderRadius: { xs: 2, sm: 3 },
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
            <Box
              sx={{
                width: { xs: 52, sm: 64 },
                height: { xs: 52, sm: 64 },
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: mode === 'student' ? 'primary.main' : 'secondary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: { xs: 1.5, sm: 2 },
                transition: 'background-color 0.3s ease',
              }}
            >
              {mode === 'student' ? (
                <GraduationCap size={isMobile ? 28 : 36} color="white" />
              ) : (
                <Shield size={isMobile ? 28 : 36} color="white" />
              )}
            </Box>
            <Typography
              variant="h4"
              fontWeight={700}
              gutterBottom
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              MarcusJJ
            </Typography>

            {/* Mode Indicator */}
            <Chip
              icon={mode === 'student' ? <User size={14} /> : <Shield size={14} />}
              label={mode === 'student' ? 'Portal do Aluno' : 'Acesso Administrativo'}
              size="small"
              color={mode === 'student' ? 'primary' : 'secondary'}
              sx={{ mb: 1 }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              {mode === 'student'
                ? 'Acesse sua conta de aluno'
                : isSignUp
                ? 'Crie sua conta administrativa'
                : 'Acesse o painel administrativo'}
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              onClose={clearError}
            >
              {error}
            </Alert>
          )}

          {/* Student Mode */}
          {mode === 'student' && (
            <>
              {/* Login Form for Students */}
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ mb: { xs: 1.5, sm: 2 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={isMobile ? 18 : 20} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Senha"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ mb: { xs: 2, sm: 3 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={isMobile ? 18 : 20} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <EyeOff size={isMobile ? 18 : 20} /> : <Eye size={isMobile ? 18 : 20} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size={isMobile ? 'medium' : 'large'}
                  disabled={submitting}
                  sx={{ mb: { xs: 2, sm: 3 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  {submitting ? (
                    <CircularProgress size={isMobile ? 20 : 24} color="inherit" />
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              {/* Create Account with Code */}
              <Box
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: { xs: 2, sm: 2.5 },
                  bgcolor: 'primary.50',
                  border: '1px solid',
                  borderColor: 'primary.200',
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{ mb: 1, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}
                >
                  Primeiro acesso?
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                >
                  Se voce recebeu um codigo de acesso do seu professor, crie sua conta agora.
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
                  }}
                >
                  Criar Conta com Codigo
                </Button>
              </Box>
            </>
          )}

          {/* Teacher/Admin Mode */}
          {mode === 'teacher' && (
            <>
              {/* Login/SignUp Form for Teachers */}
              <form onSubmit={handleSubmit}>
                {isSignUp && (
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    required
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ mb: { xs: 1.5, sm: 2 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <User size={isMobile ? 18 : 20} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ mb: { xs: 1.5, sm: 2 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={isMobile ? 18 : 20} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Senha"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ mb: { xs: 2, sm: 3 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={isMobile ? 18 : 20} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <EyeOff size={isMobile ? 18 : 20} /> : <Eye size={isMobile ? 18 : 20} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  fullWidth
                  size={isMobile ? 'medium' : 'large'}
                  disabled={submitting}
                  sx={{ mb: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  {submitting ? (
                    <CircularProgress size={isMobile ? 20 : 24} color="inherit" />
                  ) : isSignUp ? (
                    'Criar Conta'
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              {/* Toggle Sign Up / Sign In */}
              <Box sx={{ textAlign: 'center', mt: { xs: 1, sm: 2 } }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  {isSignUp ? 'Ja tem uma conta?' : 'Primeiro acesso como professor?'}{' '}
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => setIsSignUp(!isSignUp)}
                    sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                  >
                    {isSignUp ? 'Fazer login' : 'Criar conta'}
                  </Link>
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
