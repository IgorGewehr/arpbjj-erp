'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Eye, EyeOff, Key, User, Mail, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { linkCodeService } from '@/services/linkCodeService';
import { LinkCode } from '@/types';

// ============================================
// Step Types
// ============================================
type Step = 'code' | 'register' | 'success';

// ============================================
// Main Component
// ============================================
export default function CreateAccountPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Registration form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ============================================
  // Validate Code
  // ============================================
  const handleValidateCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Digite o código de acesso');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await linkCodeService.validate(code.toUpperCase().trim());

      if (!result.valid) {
        setError(result.error || 'Código inválido');
        return;
      }

      if (result.linkCode) {
        setLinkCode(result.linkCode);
        setStep('register');
      }
    } catch (err) {
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // ============================================
  // Create Account
  // ============================================
  const handleCreateAccount = useCallback(async () => {
    if (!linkCode) return;

    // Validation
    if (!email.trim()) {
      setError('Digite seu email');
      return;
    }
    if (!password) {
      setError('Digite uma senha');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Update profile with student name
      await updateProfile(user, {
        displayName: linkCode.studentName,
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email.trim(),
        displayName: linkCode.studentName,
        role: 'student',
        studentId: linkCode.studentId,
        isActive: true,
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
      });

      // Mark code as used
      await linkCodeService.markAsUsed(linkCode.id, user.uid);

      // Success
      setStep('success');
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('Este email já está sendo utilizado');
        } else if (err.message.includes('invalid-email')) {
          setError('Email inválido');
        } else if (err.message.includes('weak-password')) {
          setError('Senha muito fraca');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [linkCode, email, password, confirmPassword]);

  // ============================================
  // Render Code Step
  // ============================================
  const renderCodeStep = () => (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Key size={40} color="#1976d2" />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Criar Conta de Aluno
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Digite o código de acesso fornecido pelo seu professor
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Código de Acesso"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        fullWidth
        placeholder="Ex: ABC123"
        inputProps={{
          maxLength: 6,
          style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' },
        }}
        sx={{ mb: 3 }}
        onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
      />

      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={handleValidateCode}
        disabled={loading || code.length < 6}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Validar Código'}
      </Button>

      <Button
        variant="text"
        fullWidth
        onClick={() => router.push('/login')}
        startIcon={<ArrowLeft size={18} />}
      >
        Voltar para Login
      </Button>

      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Não tem um código? Solicite ao seu professor ou responsável pela academia.
        </Typography>
      </Box>
    </>
  );

  // ============================================
  // Render Register Step
  // ============================================
  const renderRegisterStep = () => (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <User size={40} color="#2e7d32" />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Bem-vindo, {linkCode?.studentName}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete seu cadastro para acessar o portal
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Mail size={20} color="#666" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Senha"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        helperText="Mínimo de 6 caracteres"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock size={20} color="#666" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Confirmar Senha"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock size={20} color="#666" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={handleCreateAccount}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Criar Conta'}
      </Button>

      <Button
        variant="text"
        fullWidth
        onClick={() => {
          setStep('code');
          setError('');
        }}
        startIcon={<ArrowLeft size={18} />}
      >
        Voltar
      </Button>
    </>
  );

  // ============================================
  // Render Success Step
  // ============================================
  const renderSuccessStep = () => (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: 'success.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <CheckCircle size={50} color="#2e7d32" />
      </Box>

      <Typography variant="h5" fontWeight={700} gutterBottom color="success.main">
        Conta criada com sucesso!
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sua conta foi vinculada ao seu perfil de aluno.
        Agora você pode acessar o portal do aluno.
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={() => router.push('/portal')}
        sx={{ minWidth: 200 }}
      >
        Acessar Portal
      </Button>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 450,
          width: '100%',
          borderRadius: 3,
        }}
      >
        {step === 'code' && renderCodeStep()}
        {step === 'register' && renderRegisterStep()}
        {step === 'success' && renderSuccessStep()}
      </Paper>
    </Box>
  );
}
