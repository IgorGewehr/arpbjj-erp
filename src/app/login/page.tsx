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
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/providers';

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const { signIn, isAuthenticated, loading, error, clearError, user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectTo = user.role === 'student' ? '/portal'
                       : user.role === 'guardian' ? '/responsavel'
                       : '/dashboard';
      router.push(redirectTo);
    }
  }, [isAuthenticated, user, router]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        await signIn(formData.email, formData.password);
      } catch {
        // Error is handled by AuthProvider
      } finally {
        setSubmitting(false);
      }
    },
    [formData, signIn]
  );

  if (loading || !mounted) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          height: '100dvh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Carregando...
        </Typography>
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
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {/* Logo - responsive size */}
        <Box
          sx={{
            width: { xs: '60vw', sm: '280px' },
            maxWidth: 280,
            aspectRatio: '1',
            position: 'relative',
            flexShrink: 0,
            mb: { xs: -2, sm: -7 },
          }}
        >
          <Image
            src="/logo_login.png"
            alt="Tropa 23 Jiu-Jitsu"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{ width: '100%', mb: 2, fontSize: '0.85rem' }}
            onClose={clearError}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            size={isMobile ? 'small' : 'medium'}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={18} />
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
            sx={{ mb: 2.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock size={18} />
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

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size={isMobile ? 'medium' : 'large'}
            disabled={submitting}
            sx={{ mb: 2.5 }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
          </Button>
        </Box>

        {/* Create Account with Code */}
        <Box
          sx={{
            width: '100%',
            p: 2,
            borderRadius: 2,
            bgcolor: 'action.hover',
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            Primeiro acesso?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
            Recebeu um código do professor? Crie sua conta.
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
            Criar Conta
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
