'use client';

import { Box, Typography, Paper, Alert } from '@mui/material';
import { ClipboardCheck } from 'lucide-react';
import { AttendanceGrid } from '@/components/features/attendance';
import { useIsMonitor } from '@/hooks';

export default function MonitorChamadaPage() {
  const isMonitor = useIsMonitor();

  if (!isMonitor) {
    return (
      <Box>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Voce nao tem permissao para acessar esta pagina.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: '#111',
          color: '#fff',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ClipboardCheck size={24} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Chamada
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Registre a presenca dos alunos
          </Typography>
        </Box>
      </Paper>

      {/* Attendance Grid */}
      <AttendanceGrid />
    </Box>
  );
}
