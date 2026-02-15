'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { X, Image } from 'lucide-react';
import { Close as CloseIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { PhotoCard } from './PhotoCard';
import { useAuth, usePermissions } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { createCompetitionPhotoService } from '@/services/competitionPhotoService';
import { CompetitionPhoto } from '@/types';

interface TeamGalleryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TeamGalleryDialog({ open, onClose }: TeamGalleryDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { academyId } = useAcademy();

  const [photos, setPhotos] = useState<CompetitionPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCompetitionId, setFilterCompetitionId] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Load all team photos
  useEffect(() => {
    if (!open || !academyId) return;

    const loadPhotos = async () => {
      setLoading(true);
      try {
        const photoService = createCompetitionPhotoService(academyId);
        const allPhotos = await photoService.getAllPhotos();
        const teamPhotos = allPhotos.filter(
          (p) => p.studentId === '__team__' || (p as any).photoType === 'team'
        );
        setPhotos(teamPhotos);
      } catch (err) {
        console.error('Error loading team photos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [open, academyId]);

  // Derive unique competitions from photos
  const competitions = useMemo(() => {
    const compMap = new Map<string, string>();
    photos.forEach((p) => {
      if (!compMap.has(p.competitionId)) {
        compMap.set(p.competitionId, p.competitionName);
      }
    });
    return Array.from(compMap.entries()).map(([id, name]) => ({ id, name }));
  }, [photos]);

  // Filter photos by selected competition
  const filteredPhotos = filterCompetitionId
    ? photos.filter((p) => p.competitionId === filterCompetitionId)
    : photos;

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevious = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
  };

  const handleNext = () => {
    setCurrentPhotoIndex((prev) => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
  };

  const currentPhoto = filteredPhotos[currentPhotoIndex];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Image size={20} />
            <Typography variant="h6" fontWeight={600}>
              Galeria da Equipe
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* Filter */}
          {competitions.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 250 }}>
                <InputLabel>Filtrar por Campeonato</InputLabel>
                <Select
                  value={filterCompetitionId}
                  label="Filtrar por Campeonato"
                  onChange={(e) => {
                    setFilterCompetitionId(e.target.value);
                    setCurrentPhotoIndex(0);
                  }}
                >
                  <MenuItem value="">Todos os Campeonatos</MenuItem>
                  {competitions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredPhotos.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {photos.length === 0
                ? 'Nenhuma foto de equipe foi adicionada ainda. Adicione fotos da equipe na galeria de cada campeonato.'
                : 'Nenhuma foto encontrada para este campeonato.'}
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
                {filterCompetitionId && ' (filtrado)'}
              </Typography>
              <Grid container spacing={2}>
                {filteredPhotos.map((photo, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={photo.id}>
                    <PhotoCard
                      photo={photo}
                      onClick={() => handlePhotoClick(index)}
                      canEdit={false}
                      canDelete={false}
                      canHighlight={false}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none',
          },
        }}
      >
        <Box position="relative">
          <IconButton
            onClick={() => setLightboxOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white', zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
          {filteredPhotos.length > 1 && (
            <>
              <IconButton
                onClick={handlePrevious}
                sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'white', zIndex: 1 }}
              >
                <ChevronLeft fontSize="large" />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'white', zIndex: 1 }}
              >
                <ChevronRight fontSize="large" />
              </IconButton>
            </>
          )}
          {currentPhoto && (
            <Box p={4}>
              <Box
                component="img"
                src={currentPhoto.url}
                alt={currentPhoto.caption || ''}
                sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', mb: 2 }}
              />
              <Box textAlign="center" color="white">
                <Typography variant="h6">{currentPhoto.competitionName}</Typography>
                {currentPhoto.caption && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {currentPhoto.caption}
                  </Typography>
                )}
                <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
                  {currentPhotoIndex + 1} / {filteredPhotos.length}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
}
