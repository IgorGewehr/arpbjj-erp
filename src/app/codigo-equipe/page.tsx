'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Stack,
  Chip,
} from '@mui/material';
import { Users, ShieldCheck, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import {
  validateInstructorCodeGlobally,
  redeemInstructorCode,
} from '@/services';
import { GRANTABLE_EXTRA_PERMISSIONS } from '@/lib/permissions';
import { InstructorLinkCode } from '@/types';

// ============================================
// Redeem instructor invite code
//
// Two-step UX: user enters the code, we resolve it across all academies via
// collectionGroup (anonymous-readable), show what they're about to gain, and
// only redeem on explicit confirm. This avoids accidental links and gives the
// user a visible sense of what permissions they'll have.
// ============================================
export default function RedeemInstructorCodePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { reloadUserMapping } = useAcademy();

  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{
    code: InstructorLinkCode;
    academyId: string;
  } | null>(null);
  const [done, setDone] = useState(false);

  if (!authLoading && !isAuthenticated) {
    // Redirect to login with return path
    router.push('/login?next=/codigo-equipe');
    return null;
  }

  const handleValidate = async () => {
    setError(null);
    setValidating(true);
    try {
      const found = await validateInstructorCodeGlobally(code);
      if (!found) {
        setError('Código inválido, expirado ou já usado.');
        return;
      }
      setResolved(found);
    } catch {
      setError('Erro ao validar o código. Tente novamente.');
    } finally {
      setValidating(false);
    }
  };

  const handleRedeem = async () => {
    if (!resolved || !user) return;
    setRedeeming(true);
    setError(null);
    try {
      await redeemInstructorCode({
        code: resolved.code,
        academyId: resolved.academyId,
        userId: user.id,
        userEmail: user.email,
        userDisplayName: user.displayName,
      });
      await reloadUserMapping();
      setDone(true);
    } catch {
      setError('Erro ao vincular como instrutor. Tente novamente.');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 460, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Users size={22} />
          <Typography variant="h5" fontWeight={700}>
            Código de equipe
          </Typography>
        </Stack>

        {done ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle size={48} color="#16a34a" />
            <Typography variant="h6" fontWeight={600} mt={2}>
              Vinculado com sucesso!
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Você agora é instrutor nessa academia.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => router.push('/dashboard')}
            >
              Ir para o painel
            </Button>
          </Box>
        ) : resolved ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Você está prestes a se vincular como <strong>instrutor</strong>.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Convidado por
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {resolved.code.createdByName}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Permissões que você terá:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={3}>
              <Chip
                size="small"
                label="Chamada, turmas, alunos (base)"
                sx={{ height: 22, fontSize: '0.7rem' }}
              />
              {resolved.code.extraPermissions.map((p) => {
                const def = GRANTABLE_EXTRA_PERMISSIONS.find((g) => g.permission === p);
                return (
                  <Chip
                    key={p}
                    size="small"
                    icon={<ShieldCheck size={12} />}
                    label={def?.label ?? p}
                    sx={{ height: 22, fontSize: '0.7rem' }}
                  />
                );
              })}
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setResolved(null)} disabled={redeeming}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleRedeem}
                disabled={redeeming}
                startIcon={
                  redeeming ? <CircularProgress size={14} color="inherit" /> : undefined
                }
              >
                {redeeming ? 'Vinculando...' : 'Confirmar e vincular'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Digite o código de 8 caracteres que o dono da academia te enviou.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Código"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={validating}
              error={Boolean(error)}
              helperText={error}
              inputProps={{ maxLength: 8, style: { letterSpacing: 4, fontFamily: 'ui-monospace, monospace' } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !validating) handleValidate();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyRound size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleValidate}
              disabled={validating || code.length < 6}
              startIcon={validating ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ mb: 1 }}
            >
              {validating ? 'Validando...' : 'Validar código'}
            </Button>
            <Button fullWidth onClick={() => router.back()}>
              Voltar
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
