'use client';

import { useState, useCallback, useRef } from 'react';
import { Avatar, IconButton, Dialog, DialogContent, DialogTitle, DialogActions, Button, Box, Slider, CircularProgress, Alert } from '@mui/material';
import { PhotoCamera, Delete, Close } from '@mui/icons-material';
import Cropper, { Area } from 'react-easy-crop';
import { useProfilePhotoUpload } from '@/hooks/useProfilePhotoUpload';

interface ProfilePhotoUploadProps {
  academyId: string;
  studentId: string;
  photoUrl?: string;
  fullName: string;
  currentBelt?: string;
  editable?: boolean;
  size?: number;
  onPhotoUpdated?: (photoUrl: string) => void;
}

// ============================================
// Helper: Get initials from name
// ============================================
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// ============================================
// Helper: Get belt color
// ============================================
const getBeltColor = (belt?: string): string => {
  const colors: Record<string, string> = {
    white: '#FFFFFF',
    blue: '#2196F3',
    purple: '#9C27B0',
    brown: '#795548',
    black: '#212121',
    'grey-white': '#9E9E9E',
    'grey-black': '#616161',
    yellow: '#FFC107',
    orange: '#FF9800',
    green: '#4CAF50',
  };
  return colors[belt || 'white'] || '#FFFFFF';
};

// ============================================
// Component: Profile Photo Upload
// ============================================
export default function ProfilePhotoUpload({
  academyId,
  studentId,
  photoUrl,
  fullName,
  currentBelt,
  editable = false,
  size = 120,
  onPhotoUpdated,
}: ProfilePhotoUploadProps) {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(photoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadPhoto, deletePhoto, uploading, error } = useProfilePhotoUpload({
    academyId,
    studentId,
    onSuccess: (url) => {
      setCurrentPhotoUrl(url);
      setOpen(false);
      setImageSrc(null);
      onPhotoUpdated?.(url);
    },
  });

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !fileInputRef.current?.files?.[0]) {
      return;
    }

    try {
      await uploadPhoto(fileInputRef.current.files[0], croppedAreaPixels);
    } catch (err) {
      // Error handled by hook
      console.error('Upload error:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja remover a foto?')) {
      return;
    }

    try {
      await deletePhoto();
      setCurrentPhotoUrl('');
      onPhotoUpdated?.('');
    } catch (err) {
      // Error handled by hook
      console.error('Delete error:', err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarClick = () => {
    if (editable) {
      fileInputRef.current?.click();
    }
  };

  // Scale buttons proportionally to avatar size
  const btnSize = Math.max(18, Math.round(size * 0.35));
  const iconSize = Math.max(12, Math.round(btnSize * 0.6));

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          '&:hover .photo-action-btn': editable ? { opacity: 1 } : {},
        }}
      >
        <Avatar
          src={currentPhotoUrl}
          alt={fullName}
          sx={{
            width: size,
            height: size,
            bgcolor: currentPhotoUrl ? 'transparent' : getBeltColor(currentBelt),
            color: currentBelt === 'white' ? '#000' : '#fff',
            fontSize: size / 3,
            fontWeight: 600,
            cursor: editable ? 'pointer' : 'default',
            border: `3px solid ${getBeltColor(currentBelt)}`,
            '&:hover': editable ? {
              opacity: 0.8,
            } : {},
          }}
          onClick={handleAvatarClick}
        >
          {!currentPhotoUrl && getInitials(fullName)}
        </Avatar>

        {editable && (
          <>
            <IconButton
              className="photo-action-btn"
              sx={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: btnSize,
                height: btnSize,
                minWidth: 0,
                p: 0,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: 1,
              }}
              onClick={handleAvatarClick}
            >
              <PhotoCamera sx={{ fontSize: iconSize }} />
            </IconButton>

            {currentPhotoUrl && (
              <IconButton
                className="photo-action-btn"
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: btnSize,
                  height: btnSize,
                  minWidth: 0,
                  p: 0,
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' },
                  boxShadow: 1,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                onClick={handleDelete}
                disabled={uploading}
              >
                {uploading ? <CircularProgress size={iconSize} color="inherit" /> : <Delete sx={{ fontSize: iconSize }} />}
              </IconButton>
            )}
          </>
        )}

        {uploading && !open && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
            }}
          >
            <CircularProgress size={size / 3} sx={{ color: 'white' }} />
          </Box>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: 500 },
        }}
      >
        <DialogTitle>
          Ajustar Foto de Perfil
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {imageSrc && (
            <>
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 400,
                  bgcolor: '#000',
                }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </Box>

              <Box sx={{ px: 3, py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ fontSize: 14, fontWeight: 500, minWidth: 50 }}>Zoom:</Box>
                  <Slider
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(_, value) => setZoom(value as number)}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={uploading || !croppedAreaPixels}
            startIcon={uploading ? <CircularProgress size={16} /> : null}
          >
            {uploading ? 'Enviando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
