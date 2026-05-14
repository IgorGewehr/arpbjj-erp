'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import { UserPlus, Copy, Trash2, Clock, ShieldCheck, Users } from 'lucide-react';
import { useAcademy } from '@/contexts/AcademyContext';
import { useAuth, useFeedback } from '@/components/providers';
import { createInstructorLinkCodeService } from '@/services';
import { GRANTABLE_EXTRA_PERMISSIONS } from '@/lib/permissions';
import { InstructorLinkCode, Permission } from '@/types';

// ============================================
// Team Tab — instructor invitations
//
// Two surfaces:
//   1) List of active invite codes (waiting to be redeemed). Each shows the
//      permissions snapshot, expiry countdown, and a copy/remove action.
//   2) "Convidar professor" dialog that lets the owner pick which extras to
//      grant and generates a fresh 8-char code valid for 30 min.
//
// We intentionally do NOT show the list of currently-linked instructors
// here — that requires a `collectionGroup` query on userAcademyMapping which
// owners shouldn't be doing client-side. Showing the active invites is enough
// to manage onboarding; ongoing instructor management can move into Settings
// later when the use case actually appears.
// ============================================
export function TeamTab() {
  const { academyId } = useAcademy();
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();

  const service = useMemo(
    () => (academyId ? createInstructorLinkCodeService(academyId) : null),
    [academyId]
  );

  const [codes, setCodes] = useState<InstructorLinkCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!service) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await service.listActive();
      setCodes(list);
    } catch (e) {
      showError('Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  }, [service, showError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    async (code: InstructorLinkCode) => {
      if (!service) return;
      try {
        await service.delete(code.id);
        success('Convite removido.');
        refresh();
      } catch {
        showError('Erro ao remover convite');
      }
    },
    [service, refresh, success, showError]
  );

  const handleCopy = useCallback(
    async (code: string) => {
      try {
        await navigator.clipboard.writeText(code);
        success(`Código ${code} copiado.`);
      } catch {
        showError('Não foi possível copiar o código');
      }
    },
    [success, showError]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Users size={20} />
            <Typography variant="h6" fontWeight={700}>
              Equipe
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Convide professores e defina o que cada um pode ver e fazer
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UserPlus size={16} />}
          onClick={() => setInviteOpen(true)}
          disabled={!service || !user}
        >
          Convidar professor
        </Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          Gere um código de 8 caracteres válido por 30 minutos. O professor digita o código na tela de login do app/web e vira instrutor automaticamente com as permissões que você marcar.
        </Typography>
      </Alert>

      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5 }}>
        Convites ativos
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      ) : codes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum convite ativo. Clique em &quot;Convidar professor&quot; para gerar um código.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {codes.map((c) => (
            <CodeRow key={c.id} code={c} onCopy={handleCopy} onDelete={handleDelete} />
          ))}
        </Stack>
      )}

      {service && user && (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onCreated={(code) => {
            setCodes((prev) => [code, ...prev]);
            setInviteOpen(false);
          }}
          academyId={academyId!}
          createdBy={user.id}
          createdByName={user.displayName}
        />
      )}
    </Box>
  );
}

// ============================================
// Row rendering one active code
// ============================================
function CodeRow({
  code,
  onCopy,
  onDelete,
}: {
  code: InstructorLinkCode;
  onCopy: (code: string) => void;
  onDelete: (code: InstructorLinkCode) => void;
}) {
  // Live countdown — recomputed every 30s so the user sees the deadline tick down
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = code.expiresAt.getTime() - now;
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60_000));

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="h6"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={700}
              letterSpacing={2}
            >
              {code.code}
            </Typography>
            <Tooltip title="Copiar código">
              <IconButton size="small" onClick={() => onCopy(code.code)}>
                <Copy size={14} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
            <Clock size={12} />
            <Typography variant="caption" color="text.secondary">
              expira em {remainingMin}min
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ flex: 1 }}>
          {code.extraPermissions.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Apenas permissões padrão do instrutor
            </Typography>
          ) : (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {code.extraPermissions.map((p) => {
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
          )}
        </Box>

        <Tooltip title="Remover convite">
          <IconButton onClick={() => onDelete(code)} color="error" size="small">
            <Trash2 size={16} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}

// ============================================
// Invite dialog — pick perms, generate code
// ============================================
function InviteDialog({
  open,
  onClose,
  onCreated,
  academyId,
  createdBy,
  createdByName,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (code: InstructorLinkCode) => void;
  academyId: string;
  createdBy: string;
  createdByName: string;
}) {
  const [selected, setSelected] = useState<Set<Permission>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [createdCode, setCreatedCode] = useState<InstructorLinkCode | null>(null);
  const { error: showError } = useFeedback();

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setCreatedCode(null);
      setGenerating(false);
    }
  }, [open]);

  const toggle = (p: Permission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const service = createInstructorLinkCodeService(academyId);
      const code = await service.generate(createdBy, createdByName, Array.from(selected));
      setCreatedCode(code);
      onCreated(code);
    } catch {
      showError('Erro ao gerar código');
      setGenerating(false);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode.code);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onClose={generating ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{createdCode ? 'Código gerado' : 'Convidar professor'}</DialogTitle>
      <DialogContent>
        {createdCode ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Envie este código ao professor — válido por 30 minutos
            </Typography>
            <Typography
              variant="h3"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={700}
              letterSpacing={6}
              sx={{ my: 2 }}
            >
              {createdCode.code}
            </Typography>
            <Button onClick={handleCopyCode} startIcon={<Copy size={14} />} size="small">
              Copiar código
            </Button>
            <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="body2">
                O professor abre o app/web, faz login com a conta dele e digita esse código na tela inicial. Ele virará instrutor automaticamente.
              </Typography>
            </Alert>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Selecione as permissões extras que esse professor terá. As permissões base do instrutor (chamada, turmas, alunos visualização) são incluídas automaticamente.
            </Typography>
            <Stack spacing={0}>
              {GRANTABLE_EXTRA_PERMISSIONS.map((def) => (
                <FormControlLabel
                  key={def.permission}
                  control={
                    <Checkbox
                      checked={selected.has(def.permission)}
                      onChange={() => toggle(def.permission)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {def.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {def.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mr: 0, py: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {createdCode ? (
          <Button onClick={onClose} variant="contained">
            Fechar
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={generating}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={generating}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {generating ? 'Gerando...' : 'Gerar código'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
