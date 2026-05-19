'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Divider,
} from '@mui/material';
import { Eye, EyeOff, Key, User, Mail, Lock, CheckCircle, ArrowLeft, GraduationCap, ArrowRight, FileText, Phone } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile, AuthError } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { LinkCode, InstructorLinkCode, Permission } from '@/types';
import { api, ApiError } from '@/lib/api/client';
import { useAcademy } from '@/contexts/AcademyContext';
import {
  validateInstructorCodeGlobally,
  redeemInstructorCode,
} from '@/services';
import { GRANTABLE_EXTRA_PERMISSIONS } from '@/lib/permissions';
import { LoadingButton } from '@/components/ui';
import { hapticImpact, hapticNotification } from '@/lib/capacitor';

// ============================================
// CPF Helpers
// ============================================
const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
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

// ============================================
// Step Types
// ============================================
type Step = 'code' | 'register' | 'redirecting' | 'success';

// Discriminated union: a validated code is either a student code (6 chars,
// /linkCodes — needs CPF/phone, attaches to a pre-existing student record)
// or an instructor code (8 chars, /instructorLinkCodes — creates an instructor
// account with extraPermissions, no CPF needed).
type ResolvedCode =
  | { kind: 'student'; code: LinkCode }
  | { kind: 'instructor'; code: InstructorLinkCode; academyId: string };

// ============================================
// Main Component
// ============================================
export default function CreateAccountPage() {
  const router = useRouter();
  const { reloadUserMapping } = useAcademy();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [resolved, setResolved] = useState<ResolvedCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const redirectingRef = useRef(false);

  // Registration form
  const [fullName, setFullName] = useState(''); // Instructor-only (student name comes from linkCode)
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ============================================
  // Poll AcademyContext until user data is loaded
  // ============================================
  useEffect(() => {
    if (step !== 'redirecting' || redirectingRef.current) return;
    redirectingRef.current = true;

    const pollUntilReady = async () => {
      // Poll every 500ms for up to 10 seconds (20 attempts)
      const destination = resolved?.kind === 'instructor' ? '/dashboard' : '/portal';
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const loadedUser = await reloadUserMapping();
        if (loadedUser && loadedUser.role) {
          router.replace(destination);
          return;
        }
      }
      // Fallback: redirect anyway after 10s
      router.replace(destination);
    };

    pollUntilReady();
  }, [step, reloadUserMapping, router, resolved]);

  // ============================================
  // Validate Code (collectionGroup query - multi-tenant)
  // ============================================
  const handleValidateCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Digite o codigo de acesso');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const codeUpper = code.toUpperCase().trim();

      // Dispatch by length: 6 chars -> student, 8 chars -> instructor.
      // Length is the discriminator the owner set when generating.
      const isInstructor = codeUpper.length === 8;

      if (isInstructor) {
        const found = await validateInstructorCodeGlobally(codeUpper);
        if (!found) {
          setError('Codigo nao encontrado, expirado ou ja utilizado.');
          return;
        }
        setResolved({ kind: 'instructor', code: found.code, academyId: found.academyId });
        setLinkCode(null);
        setStep('register');
        return;
      }

      // Student flow (6 chars): validate via Go backend.
      interface LinkCodePreview {
        academy_id: string;
        academy_name: string;
        academy_logo_url: string;
        role: string;
        student_id?: string;
        expires_at: string;
      }

      let preview: LinkCodePreview;
      try {
        preview = await api.get<LinkCodePreview>(`/v1/link-codes/${codeUpper}`);
      } catch (apiErr) {
        if (apiErr instanceof ApiError) {
          if (apiErr.status === 404) {
            setError('Codigo invalido ou ja utilizado');
          } else if (apiErr.status === 409) {
            setError('Codigo expirado ou ja utilizado');
          } else {
            setError('Erro ao validar codigo. Tente novamente.');
          }
        } else {
          setError('Erro ao validar codigo. Tente novamente.');
        }
        return;
      }

      const expiresAt = new Date(preview.expires_at);
      if (new Date() > expiresAt) {
        setError('Este codigo expirou');
        return;
      }

      const foundLinkCode: LinkCode = {
        id: codeUpper,
        code: codeUpper,
        academyId: preview.academy_id,
        studentId: preview.student_id ?? '',
        studentName: undefined as unknown as string, // not available from Go preview
        expiresAt,
        createdAt: new Date(),
        createdBy: '',
      };

      setLinkCode(foundLinkCode);
      setResolved({ kind: 'student', code: foundLinkCode });
      setStep('register');
    } catch (err) {
      console.error('Code validation error:', err);
      setError('Erro ao validar codigo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [code]);

  // ============================================
  // Create Account (multi-tenant correct)
  // ============================================
  // Instructor signup: minimal form (name + email + password + confirm).
  // We create the auth user, write the global users/{uid} doc, then call
  // redeemInstructorCode which handles the mapping + academy user doc +
  // marking the code as used. No CPF/phone — those belong to student records.
  const handleCreateInstructorAccount = useCallback(async () => {
    if (!resolved || resolved.kind !== 'instructor') return;
    const { code: invite, academyId } = resolved;

    if (!fullName.trim()) {
      setError('Digite seu nome completo');
      return;
    }
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
      setError('As senhas nao coincidem');
      return;
    }
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      setError('Este codigo expirou. Solicite um novo.');
      setStep('code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;
      await updateProfile(user, { displayName: fullName.trim() });

      // Global users/{uid} doc — accountType linked is set later when the
      // redeem fires (it calls updateDoc which requires the doc to exist).
      await setDoc(doc(db, 'users', user.uid), {
        email: email.trim(),
        displayName: fullName.trim(),
        accountType: 'free',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Redeem the invite: writes the mapping with role=instructor +
      // extraPermissions, upserts the academy user doc, marks code as used.
      await redeemInstructorCode({
        code: invite,
        academyId,
        userId: user.uid,
        userEmail: email.trim(),
        userDisplayName: fullName.trim(),
      });

      setStep('redirecting');
    } catch (err: unknown) {
      console.error('Instructor signup error:', err);
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('Este email ja esta sendo utilizado. Faca login e use a opcao "Recebi codigo de equipe".');
            break;
          case 'auth/invalid-email':
            setError('Email invalido');
            break;
          case 'auth/weak-password':
            setError('Senha muito fraca. Use pelo menos 6 caracteres.');
            break;
          default:
            setError('Erro ao criar conta. Tente novamente.');
        }
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [resolved, fullName, email, password, confirmPassword]);

  const handleCreateAccount = useCallback(async () => {
    if (!linkCode || !linkCode.academyId) return;

    // Validation
    if (!fullName.trim()) {
      setError('Digite seu nome completo');
      return;
    }
    const cpfDigits = cpf.replace(/\D/g, '');
    if (!cpfDigits) {
      setError('Digite seu CPF');
      return;
    }
    if (!validateCpf(cpfDigits)) {
      setError('CPF invalido');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) {
      setError('Digite seu WhatsApp');
      return;
    }
    if (phoneDigits.length < 10) {
      setError('WhatsApp deve ter pelo menos 10 digitos');
      return;
    }
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
      setError('As senhas nao coincidem');
      return;
    }

    // Re-validate code expiration before creating account
    // (code could have expired while user was filling the form)
    if (linkCode.expiresAt && new Date() > linkCode.expiresAt) {
      setError('Este codigo expirou. Solicite um novo codigo.');
      setStep('code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Step 2: Update profile with student name
      await updateProfile(user, {
        displayName: fullName.trim(),
      });

      // Step 3: Get a fresh token so the Go backend can verify it
      await user.getIdToken(true);

      // Step 4: Redeem the link code — Go creates membership, links student, marks code used
      await api.post(`/v1/link-codes/${linkCode.code}/redeem`, {
        full_name: fullName.trim(),
        phone: phoneDigits,
      });

      // Account created - wait for AcademyContext to load data before redirecting
      setStep('redirecting');
    } catch (err: unknown) {
      console.error('Account creation error:', err);

      // Handle Firebase errors with proper error codes
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('Este email ja esta sendo utilizado');
            break;
          case 'auth/invalid-email':
            setError('Email invalido');
            break;
          case 'auth/weak-password':
            setError('Senha muito fraca. Use pelo menos 6 caracteres.');
            break;
          case 'auth/operation-not-allowed':
            setError('Operacao nao permitida. Contate o suporte.');
            break;
          case 'auth/network-request-failed':
            setError('Erro de conexao. Verifique sua internet.');
            break;
          default:
            console.error('Unhandled Firebase error:', err.code, err.message);
            setError('Erro ao criar conta. Tente novamente.');
        }
      } else if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Codigo invalido ou ja utilizado');
        } else if (err.status === 409) {
          setError('Codigo expirado ou ja utilizado');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
      } else if (err instanceof Error) {
        // Handle network or other errors
        if (err.message.includes('network') || err.message.includes('Network')) {
          setError('Erro de conexao. Verifique sua internet.');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [linkCode, fullName, cpf, phone, email, password, confirmPassword]);

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
          Digite o codigo de acesso fornecido pelo seu professor
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Codigo de Acesso"
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

      <LoadingButton
        variant="contained"
        fullWidth
        size="large"
        onClick={handleValidateCode}
        isLoading={loading}
        loadingText="Validando..."
        disabled={code.length < 6}
        sx={{ mb: 2 }}
      >
        Validar Codigo
      </LoadingButton>

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
          Nao tem um codigo? Solicite ao seu professor ou responsavel pela academia.
        </Typography>
      </Box>

      {/* Sou Professor section */}
      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">ou</Typography>
      </Divider>

      <Box
        sx={{
          p: 2.5,
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: 2,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'grey.50',
          },
        }}
        onClick={() => router.push('/criar-academia')}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={24} color="#1976d2" />
          </Box>
        </Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Sou Professor / Dono de Academia
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Cadastre sua academia e gerencie alunos, graduacoes e muito mais.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          endIcon={<ArrowRight size={16} />}
          sx={{ textTransform: 'none' }}
        >
          Criar minha academia
        </Button>
      </Box>
    </>
  );

  // ============================================
  // Render Register Step
  // ============================================
  const renderRegisterStep = () => {
    const isInstructor = resolved?.kind === 'instructor';
    return (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: isInstructor ? 'info.light' : 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <User size={40} color={isInstructor ? '#1565c0' : '#2e7d32'} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {isInstructor
            ? 'Cadastro de instrutor'
            : 'Crie sua conta de aluno'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isInstructor
            ? `Convite de ${(resolved as { kind: 'instructor'; code: InstructorLinkCode }).code.createdByName}`
            : 'Complete seu cadastro para acessar o portal'}
        </Typography>
      </Box>

      {isInstructor && resolved?.kind === 'instructor' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Suas permissões nessa academia:</strong>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                bgcolor: 'background.paper',
                borderRadius: 999,
                fontSize: '0.7rem',
              }}
            >
              Chamada, turmas, alunos (base)
            </Box>
            {resolved.code.extraPermissions.map((p) => {
              const def = GRANTABLE_EXTRA_PERMISSIONS.find((g) => g.permission === p);
              return (
                <Box
                  key={p}
                  sx={{
                    px: 1,
                    py: 0.25,
                    bgcolor: 'background.paper',
                    borderRadius: 999,
                    fontSize: '0.7rem',
                  }}
                >
                  {def?.label ?? p}
                </Box>
              );
            })}
          </Box>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {isInstructor ? (
        <TextField
          label="Nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
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
      ) : (
        <>
          <TextField
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            fullWidth
            placeholder="000.000.000-00"
            inputProps={{ maxLength: 14 }}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FileText size={20} color="#666" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            fullWidth
            placeholder="11999999999"
            inputProps={{ maxLength: 11 }}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone size={20} color="#666" />
                </InputAdornment>
              ),
            }}
          />
        </>
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

      <LoadingButton
        variant="contained"
        fullWidth
        size="large"
        onClick={() => {
          void hapticImpact('medium');
          if (isInstructor) {
            handleCreateInstructorAccount();
          } else {
            handleCreateAccount();
          }
        }}
        isLoading={loading}
        loadingText="Criando conta..."
        sx={{ mb: 2 }}
      >
        Criar Conta
      </LoadingButton>

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
  };

  // ============================================
  // Render Redirecting Step (loading while AcademyContext loads)
  // ============================================
  const renderRedirectingStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
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

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Preparando seu portal...
      </Typography>

      <CircularProgress size={32} />
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
        {step === 'redirecting' && renderRedirectingStep()}
      </Paper>
    </Box>
  );
}
