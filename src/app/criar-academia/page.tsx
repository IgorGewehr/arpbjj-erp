'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  useTheme,
  Divider,
  Chip,
} from '@mui/material';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ============================================
// WhatsApp Floating Button
// ============================================
function WhatsAppButton() {
  const whatsappNumber = '5547997856405';
  const message = encodeURIComponent('Ola! Preciso de ajuda para criar minha academia no BJJEasy.');

  return (
    <Box
      component="a"
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: '50%',
        bgcolor: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        zIndex: 1000,
        '&:hover': {
          transform: 'scale(1.1)',
          boxShadow: '0 6px 16px rgba(37, 211, 102, 0.5)',
        },
      }}
    >
      <MessageCircle size={28} color="white" fill="white" />
    </Box>
  );
}

// ============================================
// Slug Generator
// ============================================
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

// ============================================
// Step Types
// ============================================
type Step = 0 | 1 | 2;

// ============================================
// Main Component
// ============================================
export default function CreateAcademyPage() {
  const router = useRouter();
  const theme = useTheme();

  const [activeStep, setActiveStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Professor form
  const [professorName, setProfessorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Academy form
  const [academyName, setAcademyName] = useState('');
  const [academySlug, setAcademySlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Auto-generate slug from academy name
  const handleAcademyNameChange = useCallback((value: string) => {
    setAcademyName(value);
    if (!slugManuallyEdited) {
      setAcademySlug(generateSlug(value));
    }
  }, [slugManuallyEdited]);

  const handleSlugChange = useCallback((value: string) => {
    setAcademySlug(generateSlug(value));
    setSlugManuallyEdited(true);
  }, []);

  // Validation for step 1
  const isStep1Valid = useMemo(() => {
    return (
      professorName.trim().length >= 3 &&
      email.trim().includes('@') &&
      password.length >= 6 &&
      password === confirmPassword
    );
  }, [professorName, email, password, confirmPassword]);

  // Validation for step 2
  const isStep2Valid = useMemo(() => {
    return academyName.trim().length >= 3 && academySlug.length >= 3;
  }, [academyName, academySlug]);

  // ============================================
  // Handle Next Step
  // ============================================
  const handleNext = useCallback(() => {
    setError('');

    if (activeStep === 0) {
      // Validate professor data
      if (!professorName.trim()) {
        setError('Digite seu nome');
        return;
      }
      if (professorName.trim().length < 3) {
        setError('Nome deve ter pelo menos 3 caracteres');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Digite um email valido');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas nao coincidem');
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Validate academy data
      if (!academyName.trim()) {
        setError('Digite o nome da academia');
        return;
      }
      if (academyName.trim().length < 3) {
        setError('Nome da academia deve ter pelo menos 3 caracteres');
        return;
      }
      if (academySlug.length < 3) {
        setError('Identificador deve ter pelo menos 3 caracteres');
        return;
      }
      // Proceed to create
      handleCreateAcademy();
    }
  }, [activeStep, professorName, email, password, confirmPassword, academyName, academySlug]);

  // ============================================
  // Create Academy
  // ============================================
  const handleCreateAcademy = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Step 2: Update profile with professor name
      await updateProfile(user, {
        displayName: professorName.trim(),
      });

      const now = serverTimestamp();

      // Step 3: Create academy document
      const academyData = {
        name: academyName.trim(),
        slug: academySlug,
        ownerId: user.uid,
        createdAt: now,
        updatedAt: now,
        settings: {
          allowStudentRegistration: true,
          requireApproval: false,
        },
        subscription: {
          plan: 'free',
          status: 'active',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        },
        // Default settings
        storeEnabled: false,
        storePublished: false,
        abacatePayEnabled: false,
        autoGraduationEnabled: false,
        studentCheckinEnabled: true,
      };

      await setDoc(doc(db, 'academies', academySlug), academyData);

      // Step 4: Create user document in global users collection
      const userData = {
        email: email.trim(),
        displayName: professorName.trim(),
        role: 'admin',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Step 5: Create user document in academy-scoped users collection
      await setDoc(doc(db, `academies/${academySlug}/users`, user.uid), {
        ...userData,
        role: 'admin',
      });

      // Step 6: Create userAcademyMapping
      await setDoc(doc(db, 'userAcademyMapping', user.uid), {
        academyIds: [academySlug],
        primaryAcademyId: academySlug,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      });

      // Success
      setActiveStep(2);
    } catch (err: unknown) {
      console.error('Academy creation error:', err);
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (errorMessage.includes('email-already-in-use')) {
          setError('Este email ja esta sendo utilizado. Faca login ou use outro email.');
        } else if (errorMessage.includes('invalid-email')) {
          setError('Email invalido');
        } else if (errorMessage.includes('weak-password')) {
          setError('Senha muito fraca');
        } else if (errorMessage.includes('permission-denied') || errorMessage.includes('permission denied')) {
          setError('Erro de permissao. Entre em contato com o suporte.');
        } else if (errorMessage.includes('already-exists') || errorMessage.includes('document already exists')) {
          setError('Este identificador de academia ja existe. Escolha outro nome.');
        } else if (errorMessage.includes('network')) {
          setError('Erro de conexao. Verifique sua internet.');
        } else {
          setError(`Erro ao criar academia: ${err.message}`);
        }
      } else {
        setError('Erro ao criar academia. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [professorName, email, password, academyName, academySlug]);

  // ============================================
  // Render Step 1 - Professor Data
  // ============================================
  const renderProfessorStep = () => (
    <Box>
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
          <User size={40} color={theme.palette.primary.main} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Seus Dados
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Crie sua conta de professor/administrador
        </Typography>
      </Box>

      <TextField
        label="Seu Nome Completo"
        value={professorName}
        onChange={(e) => setProfessorName(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <User size={20} color="#666" />
            </InputAdornment>
          ),
        }}
      />

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
        helperText="Minimo de 6 caracteres"
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
    </Box>
  );

  // ============================================
  // Render Step 2 - Academy Data
  // ============================================
  const renderAcademyStep = () => (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'secondary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Building2 size={40} color={theme.palette.secondary.main} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Dados da Academia
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure sua academia de Jiu-Jitsu
        </Typography>
      </Box>

      <TextField
        label="Nome da Academia"
        value={academyName}
        onChange={(e) => handleAcademyNameChange(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        placeholder="Ex: Team Alpha Jiu-Jitsu"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <GraduationCap size={20} color="#666" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        label="Identificador (URL)"
        value={academySlug}
        onChange={(e) => handleSlugChange(e.target.value)}
        fullWidth
        sx={{ mb: 1 }}
        placeholder="team-alpha"
        helperText={
          academySlug
            ? `Sua URL sera: bjjeasy.com.br/${academySlug}`
            : 'Identificador unico para sua academia (sem espacos ou caracteres especiais)'
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Typography color="text.secondary">/</Typography>
            </InputAdornment>
          ),
        }}
      />

      <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
        <Typography variant="body2">
          <strong>30 dias gratis!</strong> Sua academia comeca com um periodo de teste
          gratuito para voce conhecer todas as funcionalidades.
        </Typography>
      </Alert>
    </Box>
  );

  // ============================================
  // Render Step 3 - Success
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
        Academia criada com sucesso!
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Sua academia <strong>{academyName}</strong> esta pronta para uso.
      </Typography>

      <Box
        sx={{
          p: 2,
          bgcolor: 'grey.100',
          borderRadius: 2,
          mb: 4,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Seu painel de administracao:
        </Typography>
        <Chip
          label={`bjjeasy.netlify.app`}
          color="primary"
          sx={{ fontFamily: 'monospace' }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => router.push('/dashboard')}
          startIcon={<Sparkles size={20} />}
          sx={{ minWidth: 200 }}
        >
          Acessar Meu Painel
        </Button>

        <Typography variant="caption" color="text.secondary">
          Voce sera redirecionado para o dashboard da sua academia
        </Typography>
      </Box>
    </Box>
  );

  const steps = ['Seus Dados', 'Sua Academia', 'Pronto!'];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        p: 2,
        position: 'relative',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box
          component="img"
          src="/bjjeasy_logo.png"
          alt="BJJEasy"
          sx={{ width: 40, height: 40, objectFit: 'contain' }}
        />
        <Typography variant="h6" fontWeight={700} color="primary">
          BJJEasy
        </Typography>
      </Box>

      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          maxWidth: 500,
          width: '100%',
          borderRadius: 3,
        }}
      >
        {/* Stepper */}
        {activeStep < 2 && (
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        {activeStep === 0 && renderProfessorStep()}
        {activeStep === 1 && renderAcademyStep()}
        {activeStep === 2 && renderSuccessStep()}

        {/* Navigation Buttons */}
        {activeStep < 2 && (
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            {activeStep > 0 ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setActiveStep((prev) => (prev - 1) as Step);
                  setError('');
                }}
                startIcon={<ArrowLeft size={18} />}
                disabled={loading}
              >
                Voltar
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => router.push('/login')}
                startIcon={<ArrowLeft size={18} />}
              >
                Login
              </Button>
            )}

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading || (activeStep === 0 && !isStep1Valid) || (activeStep === 1 && !isStep2Valid)}
              endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowRight size={18} />}
              sx={{ flex: 1 }}
            >
              {loading ? 'Criando...' : activeStep === 1 ? 'Criar Academia' : 'Continuar'}
            </Button>
          </Box>
        )}

        {/* Footer Links */}
        {activeStep === 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Ja tem uma conta?{' '}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => router.push('/login')}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  Fazer login
                </Button>
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </Box>
  );
}
