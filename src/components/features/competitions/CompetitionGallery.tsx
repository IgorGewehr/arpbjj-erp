'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { PhotoCard } from './PhotoCard';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { useCompetitionPhotos } from '@/hooks/useCompetitionPhotos';
import { CompetitionPhoto } from '@/types';
import { usePermissions, useAuth } from '@/components/providers';

interface CompetitionGalleryProps {
  competitionId: string;
  competitionName: string;
  studentId?: string;
  studentName?: string;
  isEnrolled?: boolean;
  enrolledStudents?: { id: string; name: string }[];
}

export function CompetitionGallery({
  competitionId,
  competitionName,
  studentId,
  studentName,
  isEnrolled = false,
  enrolledStudents = [],
}: CompetitionGalleryProps) {
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');

  const {
    photos,
    photoCount,
    isLoadingPhotos,
    isLoadingCount,
    isUploading,
    uploadPhoto,
    updateCaption,
    toggleHighlight,
    deletePhoto,
    canUploadMore,
    getRemainingUploads,
  } = useCompetitionPhotos({
    competitionId,
    studentId,
  });

  const canUpload = isAdmin || (isEnrolled && studentId && canUploadMore(photoCount, isAdmin));
  const remainingUploads = studentId ? getRemainingUploads(photoCount, isAdmin) : 0;

  // Derive student list for filter from enrolled students or from photos themselves
  const filterStudents = useMemo(() => {
    if (enrolledStudents.length > 0) return enrolledStudents;
    // Build unique student list from existing photos
    const studentMap = new Map<string, string>();
    photos.forEach((p) => {
      if (!studentMap.has(p.studentId)) {
        studentMap.set(p.studentId, p.studentName);
      }
    });
    return Array.from(studentMap.entries()).map(([id, name]) => ({ id, name }));
  }, [enrolledStudents, photos]);

  const filteredPhotos = filterStudentId
    ? photos.filter((p) => p.studentId === filterStudentId)
    : photos;

  const handleUpload = async (file: File, caption?: string) => {
    const uploadStudentId = isAdmin ? selectedStudentId : studentId;
    const uploadStudentName = isAdmin
      ? (enrolledStudents.find((s) => s.id === selectedStudentId)?.name || '')
      : (studentName || '');

    if (!uploadStudentId || !uploadStudentName) {
      throw new Error('Selecione um aluno para fazer upload');
    }

    uploadPhoto({
      competitionId,
      competitionName,
      studentId: uploadStudentId,
      studentName: uploadStudentName,
      file,
      caption,
    });
  };

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

  if (isLoadingPhotos) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Galeria de Fotos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
            {filterStudentId && ` (filtrado)`}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          {filterStudents.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filtrar por Aluno</InputLabel>
              <Select
                value={filterStudentId}
                label="Filtrar por Aluno"
                onChange={(e) => {
                  setFilterStudentId(e.target.value);
                  setCurrentPhotoIndex(0);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {filterStudents.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {canUpload && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUploadDialogOpen(true)}
              disabled={isUploading}
            >
              Adicionar Foto
              {!isAdmin && studentId && (
                <Typography
                  variant="caption"
                  sx={{ ml: 1, opacity: 0.8 }}
                >
                  ({photoCount}/5)
                </Typography>
              )}
            </Button>
          )}
        </Box>
      </Box>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <Alert severity="info">
          {filterStudentId
            ? 'Nenhuma foto encontrada para este aluno.'
            : `Ainda não há fotos nesta competição. ${canUpload ? 'Seja o primeiro a adicionar!' : ''}`}
        </Alert>
      )}

      {/* Photo Grid */}
      <Grid container spacing={2}>
        {filteredPhotos.map((photo, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={photo.id}>
            <PhotoCard
              photo={photo}
              onClick={() => handlePhotoClick(index)}
              canEdit={isAdmin || photo.createdBy === user?.id}
              canDelete={isAdmin || photo.createdBy === user?.id}
              canHighlight={isAdmin}
              onDelete={(photoId) => deletePhoto(photoId)}
              onUpdateCaption={(photoId, caption) => updateCaption({ photoId, caption })}
              onToggleHighlight={(photoId, isHighlight) => toggleHighlight({ photoId, isHighlight })}
            />
          </Grid>
        ))}
      </Grid>

      {/* Upload Dialog */}
      <PhotoUploadDialog
        open={uploadDialogOpen}
        onClose={() => {
          setUploadDialogOpen(false);
          setSelectedStudentId('');
        }}
        onUpload={handleUpload}
        maxPhotos={isAdmin ? 999 : 5}
        currentPhotos={photoCount}
        isUploading={isUploading}
        isAdmin={isAdmin}
        enrolledStudents={enrolledStudents}
        selectedStudentId={selectedStudentId}
        onStudentSelect={setSelectedStudentId}
      />

      {/* Lightbox Dialog */}
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
          {/* Close Button */}
          <IconButton
            onClick={() => setLightboxOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Navigation */}
          {filteredPhotos.length > 1 && (
            <>
              <IconButton
                onClick={handlePrevious}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  zIndex: 1,
                }}
              >
                <ChevronLeft fontSize="large" />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  zIndex: 1,
                }}
              >
                <ChevronRight fontSize="large" />
              </IconButton>
            </>
          )}

          {/* Photo */}
          {currentPhoto && (
            <Box p={4}>
              <Box
                component="img"
                src={currentPhoto.url}
                alt={currentPhoto.caption || ''}
                sx={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  mb: 2,
                }}
              />
              <Box textAlign="center" color="white">
                <Typography variant="h6">{currentPhoto.studentName}</Typography>
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
    </Box>
  );
}
