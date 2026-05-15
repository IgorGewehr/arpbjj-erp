'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Send,
  EyeOff,
  MoreVertical,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useConfirmDialog } from '@/components/providers';
import {
  useEvents,
  useDeleteEvent,
  usePublishEvent,
} from '@/hooks/useEvents';
import { AcademyEvent } from '@/types';

type StatusFilter = 'all' | 'published' | 'draft';

export default function EventosPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { confirm } = useConfirmDialog();
  const { events, isLoading } = useEvents();
  const deleteEvent = useDeleteEvent();
  const publishEvent = usePublishEvent();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    item: AcademyEvent;
  } | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter === 'published' && !e.isPublished) return false;
      if (statusFilter === 'draft' && e.isPublished) return false;
      if (term && !e.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [events, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: events.length,
      published: events.filter((e) => e.isPublished).length,
      draft: events.filter((e) => !e.isPublished).length,
    }),
    [events]
  );

  const handleDelete = async (item: AcademyEvent) => {
    setMenuAnchor(null);
    const ok = await confirm({
      title: 'Excluir evento',
      message: `Tem certeza que deseja excluir "${item.title}"? Esta acao nao pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      severity: 'error',
    });
    if (!ok) return;
    await deleteEvent.mutateAsync(item.id);
  };

  const handleTogglePublish = async (item: AcademyEvent) => {
    setMenuAnchor(null);
    await publishEvent.mutateAsync({ id: item.id, publish: !item.isPublished });
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                Eventos
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                Divulgue eventos da academia no site publico
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={!isMobile && <Plus size={20} />}
              onClick={() => router.push('/eventos/novo')}
              sx={{ borderRadius: 2 }}
              size={isMobile ? 'small' : 'medium'}
            >
              {isMobile ? <Plus size={18} /> : 'Novo evento'}
            </Button>
          </Box>

          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, borderRadius: 2 }}>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <TextField
                placeholder="Buscar por titulo..."
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  minWidth: { xs: '100%', sm: 300 },
                  flex: { xs: 1, sm: 'none' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />
              <Tabs
                value={statusFilter}
                onChange={(_, v: StatusFilter) => setStatusFilter(v)}
                variant={isMobile ? 'scrollable' : 'standard'}
                scrollButtons={isMobile ? 'auto' : false}
                allowScrollButtonsMobile
              >
                <Tab value="all" label={`Todos (${stats.total})`} />
                <Tab value="published" label={`Publicados (${stats.published})`} />
                <Tab value="draft" label={`Rascunhos (${stats.draft})`} />
              </Tabs>
            </Box>
          </Paper>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center', borderRadius: 2 }}>
              <Calendar size={48} color="#bbb" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                {search || statusFilter !== 'all'
                  ? 'Nenhum evento encontrado'
                  : 'Nenhum evento cadastrado'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {search || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Clique no botao acima para criar o primeiro evento'}
              </Typography>
              {!search && statusFilter === 'all' && (
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={() => router.push('/eventos/novo')}
                >
                  Novo evento
                </Button>
              )}
            </Paper>
          ) : (
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 80 }}>Capa</TableCell>
                      <TableCell>Titulo</TableCell>
                      <TableCell sx={{ width: 180 }}>Inicio</TableCell>
                      <TableCell sx={{ width: 140 }}>Status</TableCell>
                      <TableCell sx={{ width: 80 }} align="right">
                        Acoes
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/eventos/${item.id}/editar`)}
                      >
                        <TableCell>
                          {item.coverUrl ? (
                            <Box
                              sx={{
                                width: 56,
                                height: 40,
                                borderRadius: 1,
                                overflow: 'hidden',
                                backgroundImage: `url(${item.coverUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 56,
                                height: 40,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'text.disabled',
                              }}
                            >
                              <ImageIcon size={18} />
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {item.title}
                          </Typography>
                          {item.location && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ display: 'block' }}
                            >
                              {item.location}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(item.startDate), "d 'de' MMM yyyy, HH:mm", {
                              locale: ptBR,
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.isPublished ? 'Publicado' : 'Rascunho'}
                            color={item.isPublished ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Acoes">
                            <IconButton
                              size="small"
                              onClick={(e) =>
                                setMenuAnchor({ el: e.currentTarget, item })
                              }
                            >
                              <MoreVertical size={18} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          <Menu
            anchorEl={menuAnchor?.el ?? null}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                if (menuAnchor) {
                  router.push(`/eventos/${menuAnchor.item.id}/editar`);
                  setMenuAnchor(null);
                }
              }}
            >
              <ListItemIcon>
                <Edit size={18} />
              </ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => menuAnchor && handleTogglePublish(menuAnchor.item)}
            >
              <ListItemIcon>
                {menuAnchor?.item.isPublished ? (
                  <EyeOff size={18} />
                ) : (
                  <Send size={18} />
                )}
              </ListItemIcon>
              <ListItemText>
                {menuAnchor?.item.isPublished ? 'Despublicar' : 'Publicar'}
              </ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => menuAnchor && handleDelete(menuAnchor.item)}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <Trash2 size={18} color="inherit" />
              </ListItemIcon>
              <ListItemText>Excluir</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
