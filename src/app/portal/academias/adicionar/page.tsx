'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  Building2,
} from 'lucide-react';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';

interface ValidatedAcademy {
  academyId: string;
  academyName: string;
  academyLogoUrl?: string;
  studentId: string;
  studentName?: string;
  code: string;
}

export default function AddAcademyPage() {
  const router = useRouter();
  const theme = useTheme();
  const { firebaseUser } = useAuth();
  const { success, error: showError } = useFeedback();
  const { userAcademies, refreshAcademiesInfo, setAcademy } = useAcademy();

  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedAcademy, setValidatedAcademy] = useState<ValidatedAcademy | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
      setError(null);

      // Auto-validate when 6 characters
      if (value.length === 6) {
        validateCode(value);
      }
    }
  }, []);

  const validateCode = async (codeToValidate: string) => {
    if (!firebaseUser) return;

    setIsValidating(true);
    setError(null);
    setValidatedAcademy(null);

    try {
      // Search for the code in all academies' linkCodes subcollection
      const academiesSnapshot = await getDocs(collection(db, 'academies'));

      let foundAcademyId: string | null = null;
      let foundStudentId: string | null = null;
      let codeData: any = null;
      let codeDocRef: any = null;

      for (const academyDoc of academiesSnapshot.docs) {
        const codesQuery = query(
          collection(db, `academies/${academyDoc.id}/linkCodes`),
          where('code', '==', codeToValidate.toUpperCase()),
          where('usedAt', '==', null)
        );
        const codesSnapshot = await getDocs(codesQuery);

        if (!codesSnapshot.empty) {
          foundAcademyId = academyDoc.id;
          codeData = codesSnapshot.docs[0].data();
          codeDocRef = codesSnapshot.docs[0].ref;
          foundStudentId = codeData.studentId;
          break;
        }
      }

      if (!foundAcademyId || !codeData) {
        setError('Codigo invalido ou ja utilizado');
        setIsValidating(false);
        return;
      }

      // Check if code is expired
      const expiresAt = codeData.expiresAt?.toDate();
      if (expiresAt && new Date() > expiresAt) {
        setError('Codigo expirado');
        setIsValidating(false);
        return;
      }

      // Check if already linked to this academy
      if (userAcademies.includes(foundAcademyId)) {
        setError('Voce ja esta vinculado a esta academia');
        setIsValidating(false);
        return;
      }

      // Get academy info
      const academyDoc = await getDoc(doc(db, 'academies', foundAcademyId));
      const academyData = academyDoc.data();

      // Get student info
      let studentName: string | undefined;
      if (foundStudentId) {
        const studentDoc = await getDoc(doc(db, `academies/${foundAcademyId}/students`, foundStudentId));
        if (studentDoc.exists()) {
          studentName = studentDoc.data()?.fullName;
        }
      }

      setValidatedAcademy({
        academyId: foundAcademyId,
        academyName: academyData?.name || 'Academia',
        academyLogoUrl: academyData?.logoUrl,
        studentId: foundStudentId!,
        studentName,
        code: codeToValidate,
      });
    } catch (err) {
      console.error('Error validating code:', err);
      setError('Erro ao validar codigo. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidate = useCallback(() => {
    if (code.length !== 6) {
      setError('O codigo deve ter 6 digitos');
      return;
    }
    validateCode(code);
  }, [code]);

  const handleLink = useCallback(async () => {
    if (!validatedAcademy || !firebaseUser) return;

    setIsLinking(true);
    try {
      const { academyId, studentId, code: linkCode } = validatedAcademy;
      const userId = firebaseUser.uid;

      // Server-side join (atomic) via the shared joinAcademy Cloud Function.
      // Hardened Firestore rules forbid a client from adding a 2nd academy to
      // its own userAcademyMapping, so the mapping update + academy user doc +
      // code-used mark + accountType bump all happen server-side. The function
      // resolves the academy from the code itself.
      const callJoin = httpsCallable<{ code: string }, { success: boolean; academyId: string; studentId: string | null }>(
        functions,
        'joinAcademy',
      );
      await callJoin({ code: linkCode });

      // Best-effort: link the student record to this user. The Cloud Function
      // intentionally leaves student.linkedUserId untouched; rules now allow
      // the owner to set it since the mapping lists them as this academy's
      // student. Non-fatal — the join already succeeded.
      try {
        const studentRef = doc(db, `academies/${academyId}/students`, studentId);
        await updateDoc(studentRef, {
          linkedUserId: userId,
          updatedAt: Timestamp.now(),
        });
      } catch (linkErr) {
        console.warn('Could not set student.linkedUserId (non-fatal):', linkErr);
      }

      // Refresh data
      await refreshAcademiesInfo();

      success(`Vinculado a ${validatedAcademy.academyName} com sucesso!`);
      router.push('/portal/academias');
    } catch (err) {
      console.error('Error linking to academy:', err);
      showError('Erro ao vincular a academia');
    } finally {
      setIsLinking(false);
    }
  }, [validatedAcademy, firebaseUser, refreshAcademiesInfo, success, showError, router]);

  const handleReset = useCallback(() => {
    setCode('');
    setError(null);
    setValidatedAcademy(null);
    inputRef.current?.focus();
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowLeft size={18} />}
          onClick={() => router.back()}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          Voltar
        </Button>
      </Box>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        Adicionar Academia
      </Typography>

      {/* Info Card */}
      <Alert
        severity="info"
        icon={<Info size={20} />}
        sx={{ mb: 4, borderRadius: 2 }}
      >
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Codigo de Vinculacao
        </Typography>
        <Typography variant="body2">
          Solicite um codigo de 6 digitos a sua academia para vincular sua conta.
        </Typography>
      </Alert>

      {/* Code Input */}
      {!validatedAcademy && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Digite o codigo
            </Typography>
            <TextField
              inputRef={inputRef}
              fullWidth
              value={code}
              onChange={handleCodeChange}
              placeholder="------"
              error={Boolean(error)}
              helperText={error}
              disabled={isValidating}
              inputProps={{
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  letterSpacing: '0.5em',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                },
              }}
              InputProps={{
                endAdornment: isValidating && (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleValidate}
              disabled={code.length !== 6 || isValidating}
            >
              {isValidating ? 'Validando...' : 'Validar Codigo'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Validated Academy Confirmation */}
      {validatedAcademy && (
        <Box>
          {/* Success Icon */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <CheckCircle size={32} color={theme.palette.success.main} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Codigo Valido!
            </Typography>
          </Box>

          {/* Academy Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={validatedAcademy.academyLogoUrl}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    borderRadius: 2,
                  }}
                  variant="rounded"
                >
                  {validatedAcademy.academyName?.[0]?.toUpperCase() || 'A'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {validatedAcademy.academyName}
                  </Typography>
                  {validatedAcademy.studentName && (
                    <Typography variant="body2" color="text.secondary">
                      Aluno: {validatedAcademy.studentName}
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Warning */}
          <Alert
            severity="warning"
            icon={<AlertTriangle size={20} />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            Ao confirmar, voce tera acesso aos dados desta academia e podera alternar entre suas academias.
          </Alert>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleReset}
              disabled={isLinking}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={handleLink}
              disabled={isLinking}
              startIcon={isLinking && <CircularProgress size={16} color="inherit" />}
            >
              {isLinking ? 'Vinculando...' : 'Confirmar'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
