'use client';

import { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  CardActions,
  Avatar,
  Tooltip,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Plus,
  Search,
  Trophy,
  Calendar,
  MapPin,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useConfirmDialog, useFeedback } from '@/components/providers';
import { competitionService } from '@/services/competitionService';
import { Competition, CompetitionStatus } from '@/types';

// ============================================
// Status Config
// ============================================
const statusConfig: Record<CompetitionStatus, { label: string; color: 'warning' | 'info' | 'success'; icon: React.ReactNode }> = {
  upcoming: { label: 'Próxima', color: 'warning', icon: <Clock size={16} /> },
  ongoing: { label: 'Em Andamento', color: 'info', icon: <AlertCircle size={16} /> },
  completed: { label: 'Concluída', color: 'success', icon: <CheckCircle size={16} /> },
};

// ============================================
// Competition Card Component
// ============================================
interface CompetitionCardProps {
  competition: Competition;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CompetitionCard({ competition, onView, onEdit, onDelete }: CompetitionCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const status = statusConfig[competition.status];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={onView}
    >
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: status.color === 'warning' ? 'warning.light' : status.color === 'info' ? 'info.light' : 'success.light',
              color: status.color === 'warning' ? 'warning.dark' : status.color === 'info' ? 'info.dark' : 'success.dark',
              width: 48,
              height: 48,
            }}
          >
            <Trophy size={24} />
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={status.label}
              color={status.color}
              icon={<Box sx={{ display: 'flex', ml: 0.5 }}>{status.icon}</Box>}
            />
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertical size={18} />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
          {competition.name}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar size={16} color="#666" />
            <Typography variant="body2" color="text.secondary">
              {format(new Date(competition.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapPin size={16} color="#666" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {competition.location}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={16} color="#666" />
            <Typography variant="body2" color="text.secondary">
              {competition.enrolledStudentIds.length} aluno(s) inscrito(s)
            </Typography>
          </Box>
        </Box>

        {competition.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {competition.description}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button size="small" startIcon={<Eye size={16} />} onClick={(e) => { e.stopPropagation(); onView(); }}>
          Ver Detalhes
        </Button>
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { handleMenuClose(); onView(); }}>
          <ListItemIcon><Eye size={18} /></ListItemIcon>
          <ListItemText>Ver Detalhes</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); onEdit(); }}>
          <ListItemIcon><Edit size={18} /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); onDelete(); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><Trash2 size={18} color="inherit" /></ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function CompetitionsPage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { success, error: showError } = useFeedback();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // ============================================
  // Load Competitions
  // ============================================
  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const data = await competitionService.list();
      setCompetitions(data);
    } catch (err) {
      showError('Erro ao carregar competições');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Filter Competitions
  // ============================================
  const filteredCompetitions = competitions.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());

    if (tabValue === 0) return matchesSearch; // Todas
    if (tabValue === 1) return matchesSearch && c.status === 'upcoming';
    if (tabValue === 2) return matchesSearch && c.status === 'ongoing';
    if (tabValue === 3) return matchesSearch && c.status === 'completed';
    return matchesSearch;
  });

  // ============================================
  // Handlers
  // ============================================
  const handleDelete = async (competition: Competition) => {
    const confirmed = await confirm({
      title: 'Excluir Competição',
      message: `Tem certeza que deseja excluir "${competition.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      severity: 'error',
    });

    if (confirmed) {
      try {
        await competitionService.delete(competition.id);
        success('Competição excluída com sucesso');
        loadCompetitions();
      } catch (err) {
        showError('Erro ao excluir competição');
      }
    }
  };

  // ============================================
  // Stats
  // ============================================
  const stats = {
    total: competitions.length,
    upcoming: competitions.filter((c) => c.status === 'upcoming').length,
    ongoing: competitions.filter((c) => c.status === 'ongoing').length,
    completed: competitions.filter((c) => c.status === 'completed').length,
  };

  return (
    <ProtectedRoute>
      <AppLayout title="Competições">
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Competições
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie as competições da academia
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => router.push('/competicoes/nova')}
              sx={{ borderRadius: 2 }}
            >
              Nova Competição
            </Button>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {stats.upcoming}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Próximas
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {stats.ongoing}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Em Andamento
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {stats.completed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Concluídas
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                placeholder="Buscar competição..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} />
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ flex: 1 }} />
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                <Tab label={`Todas (${stats.total})`} />
                <Tab label={`Próximas (${stats.upcoming})`} />
                <Tab label={`Em Andamento (${stats.ongoing})`} />
                <Tab label={`Concluídas (${stats.completed})`} />
              </Tabs>
            </Box>
          </Paper>

          {/* Competition Cards */}
          {loading ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Skeleton variant="rounded" height={280} />
                </Grid>
              ))}
            </Grid>
          ) : filteredCompetitions.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
              <Trophy size={64} color="#ccc" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                {searchTerm ? 'Nenhuma competição encontrada' : 'Nenhuma competição cadastrada'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm ? 'Tente ajustar os filtros de busca' : 'Clique no botão acima para criar a primeira competição'}
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={() => router.push('/competicoes/nova')}
                >
                  Nova Competição
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredCompetitions.map((competition) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={competition.id}>
                  <CompetitionCard
                    competition={competition}
                    onView={() => router.push(`/competicoes/${competition.id}`)}
                    onEdit={() => router.push(`/competicoes/${competition.id}?edit=true`)}
                    onDelete={() => handleDelete(competition)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
