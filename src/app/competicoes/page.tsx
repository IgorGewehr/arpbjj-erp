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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
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
  Image,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useConfirmDialog, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { createCompetitionService } from '@/services/competitionService';
import { Competition, CompetitionStatus } from '@/types';
import { CardSkeleton } from '@/components/common/SkeletonComponents';
import { EmptyCompetitionsIllustration } from '@/components/common/EmptyStateIllustrations';
import { FadeInView, ScaleOnPress, BottomSheet } from '@/components/mobile';
import { TeamGalleryDialog } from '@/components/features/competitions/TeamGalleryDialog';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { confirm } = useConfirmDialog();
  const { success, error: showError } = useFeedback();
  const { academy } = useAcademy();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [teamGalleryOpen, setTeamGalleryOpen] = useState(false);

  // ============================================
  // Load Competitions
  // ============================================
  useEffect(() => {
    if (academy?.id) {
      loadCompetitions();
    }
  }, [academy?.id]);

  const loadCompetitions = async () => {
    if (!academy?.id) return;
    const competitionService = createCompetitionService(academy.id);

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
    if (!academy?.id) return;

    const confirmed = await confirm({
      title: 'Excluir Competição',
      message: `Tem certeza que deseja excluir "${competition.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      severity: 'error',
    });

    if (confirmed) {
      const competitionService = createCompetitionService(academy.id);
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
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <FadeInView direction="down" delay={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                  Competições
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Gerencie as competições da academia
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={!isMobile && <Plus size={20} />}
                onClick={() => router.push('/competicoes/nova')}
                sx={{ borderRadius: 2 }}
                size={isMobile ? 'small' : 'medium'}
              >
                {isMobile ? <Plus size={18} /> : 'Nova Competição'}
              </Button>
            </Box>
          </FadeInView>

          {/* Trophy Showcase */}
          {(() => {
            const trophyCompetitions = competitions.filter((c) => c.teamPosition);
            const teamPositionConfig: Record<string, { label: string; emoji: string; bgColor: string; color: string; borderColor: string }> = {
              gold: { label: 'Campeao', emoji: '🏆', bgColor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' },
              silver: { label: 'Vice', emoji: '🏆', bgColor: '#F3F4F6', color: '#374151', borderColor: '#9CA3AF' },
              bronze: { label: '3o Lugar', emoji: '🏆', bgColor: '#FED7AA', color: '#7C2D12', borderColor: '#F97316' },
            };
            return (
              <FadeInView direction="up" delay={50}>
                <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: trophyCompetitions.length > 0 ? 2 : 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                      Trofeus da Academia {trophyCompetitions.length > 0 && `(${trophyCompetitions.length})`}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Image size={14} />}
                      onClick={() => setTeamGalleryOpen(true)}
                      sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                    >
                      Galeria da Equipe
                    </Button>
                  </Box>
                  {trophyCompetitions.length > 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        overflowX: 'auto',
                        scrollSnapType: 'x mandatory',
                        pb: 1,
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                      }}
                    >
                      {trophyCompetitions.map((comp) => {
                        const tpConfig = teamPositionConfig[comp.teamPosition!];
                        if (!tpConfig) return null;
                        return (
                          <Box
                            key={comp.id}
                            onClick={() => router.push(`/competicoes/${comp.id}`)}
                            sx={{
                              scrollSnapAlign: 'start',
                              minWidth: { xs: 160, sm: 180 },
                              p: 2,
                              bgcolor: tpConfig.bgColor,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: tpConfig.borderColor,
                              cursor: 'pointer',
                              flexShrink: 0,
                              '&:hover': { opacity: 0.85 },
                              transition: 'opacity 0.2s',
                            }}
                          >
                            <Typography sx={{ fontSize: '1.75rem', lineHeight: 1, mb: 1, filter: comp.teamPosition === 'silver' ? 'grayscale(0.8)' : comp.teamPosition === 'bronze' ? 'sepia(0.5)' : 'none' }}>
                              {tpConfig.emoji}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ color: tpConfig.color, fontSize: { xs: '0.8rem', sm: '0.85rem' } }}
                              noWrap
                            >
                              {comp.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: tpConfig.color, opacity: 0.7, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
                            >
                              {format(new Date(comp.date), "MMM yyyy", { locale: ptBR })}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              display="block"
                              sx={{ color: tpConfig.color, mt: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                            >
                              {tpConfig.label}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Trophy size={32} color="#ccc" />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        Registre o primeiro trofeu da academia!
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </FadeInView>
            );
          })()}

          {/* Filters */}
          <FadeInView direction="up" delay={100}>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  placeholder="Buscar competição..."
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 300 }, flex: { xs: 1, sm: 'none' } }}
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
                  value={tabValue}
                  onChange={(_, v) => setTabValue(v)}
                  variant={isMobile ? 'scrollable' : 'standard'}
                  scrollButtons={isMobile ? 'auto' : false}
                  allowScrollButtonsMobile
                  sx={{
                    width: { xs: '100%', md: 'auto' },
                    '& .MuiTab-root': {
                      fontSize: { xs: '0.7rem', sm: '0.875rem' },
                      minWidth: { xs: 'auto', sm: 90 },
                      px: { xs: 1, sm: 2 },
                    },
                  }}
                >
                  <Tab label={isMobile ? `Todas` : `Todas (${stats.total})`} />
                  <Tab label={isMobile ? `Prox.` : `Próximas (${stats.upcoming})`} />
                  <Tab label={isMobile ? `Andam.` : `Em Andamento (${stats.ongoing})`} />
                  <Tab label={isMobile ? `Concl.` : `Concluídas (${stats.completed})`} />
                </Tabs>
              </Box>
            </Paper>
          </FadeInView>

          {/* Competition Cards */}
          {loading ? (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <CardSkeleton hasActions />
                </Grid>
              ))}
            </Grid>
          ) : filteredCompetitions.length === 0 ? (
            <Paper sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center', borderRadius: 2 }}>
              <EmptyCompetitionsIllustration size={isMobile ? 80 : 100} />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {searchTerm ? 'Nenhuma competição encontrada' : 'Nenhuma competição cadastrada'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
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
            <FadeInView direction="up" delay={150}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {filteredCompetitions.map((competition) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={competition.id}>
                    <ScaleOnPress>
                      <CompetitionCard
                        competition={competition}
                        onView={() => router.push(`/competicoes/${competition.id}`)}
                        onEdit={() => router.push(`/competicoes/${competition.id}?edit=true`)}
                        onDelete={() => handleDelete(competition)}
                      />
                    </ScaleOnPress>
                  </Grid>
                ))}
              </Grid>
            </FadeInView>
          )}
        </Box>

        {/* Team Gallery Dialog */}
        <TeamGalleryDialog
          open={teamGalleryOpen}
          onClose={() => setTeamGalleryOpen(false)}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
