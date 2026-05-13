'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Alert,
  LinearProgress,
} from '@mui/material';
import { ArrowLeft, QrCode, RefreshCw, Tv, X } from 'lucide-react';
import QRCode from 'qrcode';
import { useClasses } from '@/hooks';
import { useAcademy } from '@/contexts/AcademyContext';
import type { Class } from '@/types';

// Rotation interval (ms). Matches the TTL window enforced by the mobile app
// scanner (60s) — we refresh at half the TTL so students always have a
// fresh token. Keep in sync with kQrTokenTtl in graduabjj.
const QR_ROTATE_MS = 30_000;

const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

interface ScheduledClass {
  cls: Class;
  startTime: string;
  endTime: string;
}

function buildPayload(academyId: string, classId: string): string {
  return JSON.stringify({
    v: 1,
    a: academyId,
    c: classId,
    t: Math.floor(Date.now() / 1000),
  });
}

function classHappeningNow(cls: Class): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const s of cls.schedule || []) {
    if (s.dayOfWeek !== dayOfWeek) continue;
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    if (currentMinutes >= sh * 60 + sm && currentMinutes <= eh * 60 + em) {
      return true;
    }
  }
  return false;
}

export function AttendanceQrManager() {
  const { academyId } = useAcademy();
  const { classes, isLoading, refresh } = useClasses();
  const [selected, setSelected] = useState<ScheduledClass | null>(null);
  const today = new Date();
  const dayOfWeek = today.getDay();

  const scheduled = useMemo<ScheduledClass[]>(() => {
    const list: ScheduledClass[] = [];
    for (const cls of classes || []) {
      if (cls.isActive === false) continue;
      for (const s of cls.schedule || []) {
        if (s.dayOfWeek === dayOfWeek) {
          list.push({
            cls,
            startTime: s.startTime,
            endTime: s.endTime,
          });
        }
      }
    }
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return list;
  }, [classes, dayOfWeek]);

  if (selected && academyId) {
    return (
      <QrFullscreen
        academyId={academyId}
        scheduled={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Chamada por QR
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Turmas de {WEEKDAYS[dayOfWeek]}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshCw size={14} />}
          onClick={() => refresh()}
        >
          Atualizar
        </Button>
      </Stack>

      <Alert
        severity="info"
        icon={<QrCode size={18} />}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        Selecione a turma para mostrar o QR em tela cheia. Alunos matriculados podem escanear pelo app dentro da janela de horário (30min antes do início até 1h após o fim).
      </Alert>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      ) : scheduled.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: 3,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body1">Nenhuma turma com aula hoje.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {scheduled.map((entry, idx) => {
            const live = classHappeningNow(entry.cls);
            return (
              <Paper
                key={`${entry.cls.id}-${idx}`}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-1px)',
                  },
                }}
                onClick={() => setSelected(entry)}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  p={2}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      bgcolor: live ? 'success.light' : 'action.hover',
                      color: live ? 'success.main' : 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QrCode size={20} />
                  </Box>
                  <Box flex={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {entry.cls.name}
                      </Typography>
                      {live && (
                        <Chip
                          label="AO VIVO"
                          size="small"
                          color="success"
                          sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {entry.startTime} – {entry.endTime}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Tv size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(entry);
                    }}
                  >
                    Abrir QR
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

interface QrFullscreenProps {
  academyId: string;
  scheduled: ScheduledClass;
  onBack: () => void;
}

function QrFullscreen({ academyId, scheduled, onBack }: QrFullscreenProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [rotationKey, setRotationKey] = useState(0);

  // Regenerate the QR payload on a fixed cadence. Each render stamps the
  // payload with Date.now(), and the mobile app rejects tokens older than
  // its TTL — so a stale screenshot cannot grant a late check-in.
  useEffect(() => {
    let cancelled = false;
    const render = () => {
      const payload = buildPayload(academyId, scheduled.cls.id);
      QRCode.toDataURL(payload, {
        width: 720,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#111111', light: '#ffffff' },
      })
        .then((url) => {
          if (!cancelled) setQrDataUrl(url);
        })
        .catch(() => {
          if (!cancelled) setError('Falha ao gerar QR');
        });
    };
    render();
    const interval = setInterval(() => {
      render();
      setRotationKey((k) => k + 1);
    }, QR_ROTATE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [academyId, scheduled.cls.id]);

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 8 },
        px: 2,
        position: 'relative',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ position: 'absolute', top: 16, left: 16 }}
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowLeft size={14} />}
          onClick={onBack}
        >
          Voltar
        </Button>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{ position: 'absolute', top: 16, right: 16 }}
      >
        <Button
          variant="text"
          size="small"
          startIcon={<X size={14} />}
          onClick={onBack}
        >
          Fechar
        </Button>
      </Stack>

      <Typography variant="h3" fontWeight={700} textAlign="center" gutterBottom>
        {scheduled.cls.name}
      </Typography>
      <Typography variant="h6" color="text.secondary" textAlign="center" mb={4}>
        {scheduled.startTime} – {scheduled.endTime}
      </Typography>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : qrDataUrl ? (
        <Box
          sx={{
            p: 3,
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR de chamada"
            style={{
              width: 'min(72vmin, 560px)',
              height: 'min(72vmin, 560px)',
              display: 'block',
            }}
          />
        </Box>
      ) : (
        <CircularProgress />
      )}

      <Box sx={{ width: 240, mt: 4 }}>
        <RotationCountdown key={rotationKey} durationMs={QR_ROTATE_MS} />
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        mt={2}
        textAlign="center"
      >
        O QR renova a cada {QR_ROTATE_MS / 1000}s. Mantenha esta tela aberta durante a aula.
      </Typography>
    </Box>
  );
}

function RotationCountdown({ durationMs }: { durationMs: number }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, durationMs - elapsed);
      setProgress((remaining / durationMs) * 100);
      if (remaining <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [durationMs]);

  const secondsLeft = Math.ceil((progress / 100) * (durationMs / 1000));

  return (
    <Stack alignItems="center" spacing={0.5}>
      <Box sx={{ width: '100%' }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 4, borderRadius: 999 }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Próximo QR em {secondsLeft}s
      </Typography>
    </Stack>
  );
}

export default AttendanceQrManager;
