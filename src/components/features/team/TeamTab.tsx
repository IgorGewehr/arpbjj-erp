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
import {
  UserPlus,
  Copy,
  Trash2,
  Clock,
  ShieldCheck,
  Users,
  ArrowUpCircle,
  Search,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAcademy } from '@/contexts/AcademyContext';
import { useAuth, useFeedback } from '@/components/providers';
import { createInstructorLinkCodeService } from '@/services';
import { useStudents } from '@/hooks';
import { GRANTABLE_EXTRA_PERMISSIONS } from '@/lib/permissions';
import { InstructorLinkCode, Permission, Student } from '@/types';
import { TextField, InputAdornment, List, ListItemButton, ListItemAvatar, Avatar, ListItemText, Divider } from '@mui/material';

interface TeamMember {
  id: string;
  displayName?: string;
  email?: string;
  extraPermissions?: string[];
}

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!academyId) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, `academies/${academyId}/users`),
          where('role', '==', 'instructor')
        )
      );
      setMembers(
        snap.docs.map((d) => ({
          id: d.id,
          displayName: d.data().displayName,
          email: d.data().email,
          extraPermissions: d.data().extraPermissions ?? [],
        }))
      );
    } catch {
      // non-critical, silently ignore
    }
  }, [academyId]);

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
    loadMembers();
  }, [refresh, loadMembers]);

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
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<ArrowUpCircle size={16} />}
            onClick={() => setPromoteOpen(true)}
            disabled={!academyId}
          >
            Promover aluno
          </Button>
          <Button
            variant="contained"
            startIcon={<UserPlus size={16} />}
            onClick={() => setInviteOpen(true)}
            disabled={!service || !user}
          >
            Convidar professor
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          Gere um código de 8 caracteres válido por 30 minutos. O professor digita o código na tela de login do app/web e vira instrutor automaticamente com as permissões que você marcar.
        </Typography>
      </Alert>

      {members.length > 0 && (
        <>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5 }}>
            Instrutores ativos
          </Typography>
          <Stack spacing={1} mb={3}>
            {members.map((m) => (
              <Paper key={m.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
                    {m.displayName?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {m.displayName ?? m.email ?? m.id}
                    </Typography>
                    {m.email && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {m.email}
                      </Typography>
                    )}
                    {m.extraPermissions && m.extraPermissions.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                        {m.extraPermissions.map((p) => {
                          const def = GRANTABLE_EXTRA_PERMISSIONS.find((g) => g.permission === p);
                          return (
                            <Chip key={p} label={def?.label ?? p} size="small" variant="outlined" />
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                  <ShieldCheck size={16} color="green" />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}

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

      {academyId && (
        <PromoteDialog
          open={promoteOpen}
          onClose={() => setPromoteOpen(false)}
          onPromoted={loadMembers}
          academyId={academyId}
        />
      )}
    </Box>
  );
}

// ============================================
// Promote dialog — pick a linked student, set extras, promote to instructor
// ============================================
function PromoteDialog({
  open,
  onClose,
  onPromoted,
  academyId,
}: {
  open: boolean;
  onClose: () => void;
  onPromoted?: () => void;
  academyId: string;
}) {
  const { students, isLoading: studentsLoading } = useStudents();
  const { success, error: showError } = useFeedback();
  const { firebaseUser } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const [extras, setExtras] = useState<Set<Permission>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Only students with a Firebase Auth account can be promoted — they need a
  // user record to hang the new role on.
  const eligible = useMemo(
    () =>
      (students ?? []).filter(
        (s) => s.linkedUserId && s.linkedUserId.length > 0
      ),
    [students]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((s) =>
      [s.fullName, s.nickname, s.email]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [eligible, search]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelected(null);
      setExtras(new Set());
      setSubmitting(false);
    }
  }, [open]);

  const togglePerm = (p: Permission) =>
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const handleSubmit = async () => {
    if (!selected || !selected.linkedUserId || !firebaseUser) return;
    setSubmitting(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/team/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: selected.linkedUserId,
          academyId,
          extraPermissions: Array.from(extras),
          studentId: selected.id,
          email: selected.email,
          displayName: selected.fullName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro desconhecido');
      }
      success(`${selected.fullName} promovido a instrutor.`);
      onPromoted?.();
      onClose();
    } catch {
      showError('Erro ao promover aluno. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {selected ? `Promover ${selected.fullName}` : 'Promover aluno a instrutor'}
      </DialogTitle>
      <DialogContent>
        {selected ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              O aluno mantém o acesso aos dados pessoais como aluno, mas
              passa a ver os recursos de instrutor com as permissões
              selecionadas abaixo.
            </Typography>
            <Stack spacing={0}>
              {GRANTABLE_EXTRA_PERMISSIONS.map((def) => (
                <FormControlLabel
                  key={def.permission}
                  control={
                    <Checkbox
                      checked={extras.has(def.permission)}
                      onChange={() => togglePerm(def.permission)}
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
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Apenas alunos com conta criada aparecem na lista (vinculados
              via link-code anteriormente).
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="Buscar aluno por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            {studentsLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={24} />
              </Box>
            ) : filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                Nenhum aluno encontrado.
              </Typography>
            ) : (
              <List dense sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {filtered.map((s, idx) => (
                  <Box key={s.id}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItemButton onClick={() => setSelected(s)}>
                      <ListItemAvatar>
                        <Avatar src={s.photoUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                          {s.fullName.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={s.fullName}
                        secondary={s.email ?? '—'}
                      />
                    </ListItemButton>
                  </Box>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {selected ? (
          <>
            <Button onClick={() => setSelected(null)} disabled={submitting}>
              Voltar
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={
                submitting ? <CircularProgress size={14} color="inherit" /> : undefined
              }
            >
              {submitting ? 'Promovendo...' : 'Promover a instrutor'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Cancelar</Button>
        )}
      </DialogActions>
    </Dialog>
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
