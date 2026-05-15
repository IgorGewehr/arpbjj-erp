'use client';

import { useParams } from 'next/navigation';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { NewsForm } from '@/components/features/news/NewsForm';
import { useNewsItem } from '@/hooks/useNews';

export default function EditarNoticiaPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { news, isLoading } = useNewsItem(id || null);

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

  if (!news) {
    return (
      <ProtectedRoute requiredRole="admin">
        <AppLayout>
          <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h6">Noticia nao encontrada</Typography>
            </Paper>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return <NewsForm mode="edit" initial={news} />;
}
