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
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, GraduationCap, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { motion } from 'framer-motion';

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);

export default function LoginPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const isDarkMode = theme.palette.mode === 'dark';
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

      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
        <MotionBox
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          {/* Icon Badge */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: `0 8px 32px ${theme.palette.primary.main}40`,
            }}
          >
            <Shield size={36} color="white" strokeWidth={1.5} />
          </Box>

          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.text.primary}, ${theme.palette.text.secondary})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Bem-vindo
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, textAlign: 'center' }}
          >
            Acesse sua conta para continuar
          </Typography>
        </MotionBox>

        {/* Error Alert */}
        {error && (
          <MotionBox
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            sx={{ width: '100%', mb: 2 }}
          >
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
          </MotionBox>
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
            label="Senha"
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

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting}
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
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Entrar'
            )}
          </Button>
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
        </Box>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 3, textAlign: 'center' }}
        >
          Sistema de Gestão de Academia
        </Typography>
      </MotionPaper>
    </Box>
  );
}
