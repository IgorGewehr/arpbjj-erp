'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Checkbox,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
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
  FileText,
} from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

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
// Slug Generator (automatic from name + timestamp)
// ============================================
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString().substring(6);
  return `${slug}-${timestamp}`;
}

// ============================================
// CPF/CNPJ Helpers
// ============================================
const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCnpj = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const validateCpf = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[10])) return false;

  return true;
};

const validateCnpj = (cnpj: string): boolean => {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== parseInt(digits[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  if (digit2 !== parseInt(digits[13])) return false;

  return true;
};

// ============================================
// Step Indicator
// ============================================
function StepIndicator({ activeStep, steps }: { activeStep: number; steps: string[] }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 4 }}>
      {steps.map((label, index) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: index <= activeStep ? '#111' : '#e5e5e5',
                color: index <= activeStep ? '#fff' : '#999',
                fontWeight: 700,
                fontSize: 14,
                transition: 'all 0.3s ease',
              }}
            >
              {index < activeStep ? (
                <CheckCircle size={18} />
              ) : (
                index + 1
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: index <= activeStep ? '#111' : '#999',
                fontWeight: index === activeStep ? 600 : 400,
                fontSize: 11,
              }}
            >
              {label}
            </Typography>
          </Box>
          {index < steps.length - 1 && (
            <Box
              sx={{
                width: 40,
                height: 2,
                bgcolor: index < activeStep ? '#111' : '#e5e5e5',
                borderRadius: 1,
                transition: 'all 0.3s ease',
                mb: 2.5,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

// ============================================
// Confetti Particles (for success step)
// ============================================
function ConfettiParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'][
        Math.floor(Math.random() * 7)
      ],
      size: 4 + Math.random() * 8,
    }))
    , []);

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ y: 200, opacity: 0, rotate: 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.size > 8 ? '50%' : '2px',
          }}
        />
      ))}
    </Box>
  );
}

// ============================================
// Step Types
// ============================================
type Step = 0 | 1 | 2;
type DocumentType = 'cpf' | 'cnpj';

// ============================================
// Main Component
// ============================================
export default function CreateAcademyPage() {
  const router = useRouter();

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
  const [documentType, setDocumentType] = useState<DocumentType>('cpf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
    const docDigits = documentNumber.replace(/\D/g, '');
    const isDocValid = documentType === 'cpf'
      ? docDigits.length === 11 && validateCpf(documentNumber)
      : docDigits.length === 14 && validateCnpj(documentNumber);

    return academyName.trim().length >= 3 && isDocValid && acceptedTerms;
  }, [academyName, documentType, documentNumber, acceptedTerms]);

  // ============================================
  // Handle Next Step
  // ============================================
  const handleNext = useCallback(() => {
    setError('');

    if (activeStep === 0) {
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
      if (!academyName.trim()) {
        setError('Digite o nome da academia');
        return;
      }
      if (academyName.trim().length < 3) {
        setError('Nome da academia deve ter pelo menos 3 caracteres');
        return;
      }

      const docDigits = documentNumber.replace(/\D/g, '');
      if (documentType === 'cpf') {
        if (docDigits.length !== 11) {
          setError('CPF deve ter 11 digitos');
          return;
        }
        if (!validateCpf(documentNumber)) {
          setError('CPF invalido');
          return;
        }
      } else {
        if (docDigits.length !== 14) {
          setError('CNPJ deve ter 14 digitos');
          return;
        }
        if (!validateCnpj(documentNumber)) {
          setError('CNPJ invalido');
          return;
        }
      }

      if (!acceptedTerms) {
        setError('Voce precisa aceitar os Termos de Servico para continuar.');
        return;
      }
      handleCreateAcademy();
    }
  }, [activeStep, professorName, email, password, confirmPassword, academyName, documentType, documentNumber, acceptedTerms]);

  // ============================================
  // Create Academy
  // ============================================
  const handleCreateAcademy = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Generate slug automatically from academy name
      const academySlug = generateSlug(academyName.trim());
      const docDigits = documentNumber.replace(/\D/g, '');

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
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        storeEnabled: false,
        storePublished: false,
        abacatePayEnabled: false,
        autoGraduationEnabled: false,
        studentCheckinEnabled: true,
        // Owner document info
        ownerDocumentType: documentType,
        ownerDocumentNumber: docDigits,
      };

      await setDoc(doc(db, 'academies', academySlug), academyData);

      // Step 4: Create global user document with accountType: 'linked'
      const userData = {
        email: email.trim(),
        displayName: professorName.trim(),
        accountType: 'linked',
        isProfilePublic: false,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Step 5: Create user document in academy-scoped users collection
      await setDoc(doc(db, `academies/${academySlug}/users`, user.uid), {
        email: email.trim(),
        displayName: professorName.trim(),
        role: 'admin',
        isActive: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      // Step 6: Create userAcademyMapping with academyDetails
      await setDoc(doc(db, 'userAcademyMapping', user.uid), {
        role: 'admin',
        academyIds: [academySlug],
        primaryAcademyId: academySlug,
        academyDetails: {
          [academySlug]: {
            role: 'admin',
            joinedAt: now,
            status: 'active',
          },
        },
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
  }, [professorName, email, password, academyName, documentType, documentNumber]);

  // ============================================
  // Animation variants
  // ============================================
  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  // ============================================
  // Render Step 1 - Professor Data
  // ============================================
  const renderProfessorStep = () => (
    <motion.div
      key="step-0"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Box>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Box
              component="img"
              src="/bjjeasy_logo.png"
              alt="BJJEasy"
              sx={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 16px' }}
            />
          </motion.div>
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
    </motion.div>
  );

  // ============================================
  // Render Step 2 - Academy Data
  // ============================================
  const renderAcademyStep = () => (
    <motion.div
      key="step-1"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Box>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Box
              component="img"
              src="/bjjeasy_logo.png"
              alt="BJJEasy"
              sx={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 16px' }}
            />
          </motion.div>
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
          onChange={(e) => setAcademyName(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
          placeholder="Ex: Team Alpha Jiu-Jitsu"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <GraduationCap size={20} color="#666" />
              </InputAdornment>
            ),
          }}
        />

        {/* Document type toggle */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Documento do responsavel
        </Typography>
        <ToggleButtonGroup
          value={documentType}
          exclusive
          onChange={(_, value) => {
            if (value) {
              setDocumentType(value);
              setDocumentNumber('');
            }
          }}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="cpf" sx={{ textTransform: 'none' }}>
            <User size={16} style={{ marginRight: 8 }} />
            CPF (Pessoa Fisica)
          </ToggleButton>
          <ToggleButton value="cnpj" sx={{ textTransform: 'none' }}>
            <Building2 size={16} style={{ marginRight: 8 }} />
            CNPJ (Empresa)
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label={documentType === 'cpf' ? 'CPF' : 'CNPJ'}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(
            documentType === 'cpf' ? formatCpf(e.target.value) : formatCnpj(e.target.value)
          )}
          fullWidth
          sx={{ mb: 2 }}
          placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
          inputProps={{ maxLength: documentType === 'cpf' ? 14 : 18 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FileText size={20} color="#666" />
              </InputAdornment>
            ),
          }}
        />

        {/* Terms checkbox */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                Aceito os{' '}
                <Typography
                  component="a"
                  href="/termsofservice"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Termos e Condicoes de Servico
                </Typography>
              </Typography>
            }
          />
        </Box>
      </Box>
    </motion.div>
  );

  // ============================================
  // Render Step 3 - Success
  // ============================================
  const renderSuccessStep = () => (
    <motion.div
      key="step-2"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Box sx={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <ConfettiParticles />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200 }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(67, 233, 123, 0.3)',
            }}
          >
            <CheckCircle size={50} color="white" />
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: '#059669' }}>
            Academia criada com sucesso!
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Sua academia <strong>{academyName}</strong> esta pronta para uso.
          </Typography>

          <Box
            sx={{
              p: 2,
              bgcolor: '#f0fdf4',
              borderRadius: 2,
              mb: 4,
              border: '1px solid #bbf7d0',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Voce ja pode acessar o painel e comecar a cadastrar seus alunos.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/login')}
              startIcon={<Sparkles size={20} />}
              sx={{
                minWidth: 200,
                background: 'linear-gradient(135deg, #111 0%, #333 100%)',
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              Fazer Login Agora
            </Button>

            <Typography variant="caption" color="text.secondary">
              Use suas credenciais para acessar
            </Typography>
          </Box>
        </motion.div>
      </Box>
    </motion.div>
  );

  const steps = ['Seus Dados', 'Sua Academia', 'Pronto!'];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 50%, #f5f7fa 100%)',
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 500 }}
      >
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            maxWidth: 500,
            width: '100%',
            borderRadius: 3,
            bgcolor: 'white',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Step Indicator */}
          {activeStep < 2 && (
            <StepIndicator activeStep={activeStep} steps={steps} />
          )}

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {activeStep === 0 && renderProfessorStep()}
            {activeStep === 1 && renderAcademyStep()}
            {activeStep === 2 && renderSuccessStep()}
          </AnimatePresence>

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

              {/* Link to student registration */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Sou aluno?{' '}
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => router.push('/criar-conta')}
                    sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                  >
                    Criar conta de aluno
                  </Button>
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </motion.div>

      {/* WhatsApp Floating Button */}
      <WhatsAppButton />
    </Box>
  );
}
