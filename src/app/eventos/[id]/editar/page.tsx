'use client';

import { useParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { EventForm } from '@/components/features/events/EventForm';
import { useEventItem } from '@/hooks/useEvents';

export default function EditarEventoPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { event, isLoading } = useEventItem(id || null);

  if (isLoading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AppLayout>
          <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!event) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AppLayout>
          <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h6">Evento nao encontrado</Typography>
            </Paper>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return <EventForm mode="edit" initial={event} />;
}
