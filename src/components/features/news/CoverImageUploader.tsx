'use client';

import { useRef, useState } from 'react';
import { Box, Typography, IconButton, CircularProgress, Button } from '@mui/material';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useFeedback } from '@/components/providers';

interface CoverImageUploaderProps {
  basePath: string;
  coverUrl?: string;
  coverStoragePath?: string;
  onChange: (data: { coverUrl?: string; coverStoragePath?: string }) => void;
  helperText?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function CoverImageUploader({
  basePath,
  coverUrl,
  coverStoragePath,
  onChange,
  helperText,
}: CoverImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { success, error: showError } = useFeedback();

  const handleSelect = () => inputRef.current?.click();

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      showError('Formato nao suportado. Use JPG, PNG ou WEBP.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      showError('Imagem muito grande. Tamanho maximo: 5MB.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const storagePath = `${basePath}/${filename}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);

      if (coverStoragePath) {
        try {
          await deleteObject(ref(storage, coverStoragePath));
        } catch {
          // ignore if previous file is gone
        }
      }

      onChange({ coverUrl: downloadURL, coverStoragePath: storagePath });
      success('Capa atualizada');
    } catch (err) {
      console.error('Cover upload error', err);
      showError('Erro ao enviar imagem de capa');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (!coverUrl) return;
    setUploading(true);
    try {
      if (coverStoragePath) {
        try {
          await deleteObject(ref(storage, coverStoragePath));
        } catch {
          // ignore if file already absent
        }
      }
      onChange({ coverUrl: undefined, coverStoragePath: undefined });
      success('Capa removida');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Capa
      </Typography>
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {helperText}
        </Typography>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleUpload}
      />

      {coverUrl ? (
        <Box sx={{ position: 'relative', maxWidth: 480 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Upload size={16} />}
              onClick={handleSelect}
              disabled={uploading}
            >
              Trocar imagem
            </Button>
            <IconButton
              size="small"
              color="error"
              onClick={handleRemove}
              disabled={uploading}
              aria-label="Remover capa"
            >
              {uploading ? <CircularProgress size={16} /> : <Trash2 size={16} />}
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box
          onClick={uploading ? undefined : handleSelect}
          sx={{
            maxWidth: 480,
            aspectRatio: '16 / 9',
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'default' : 'pointer',
            bgcolor: 'background.default',
            color: 'text.secondary',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': {
              borderColor: uploading ? 'divider' : 'primary.main',
              bgcolor: uploading ? 'background.default' : 'action.hover',
            },
          }}
        >
          {uploading ? (
            <CircularProgress size={28} />
          ) : (
            <>
              <ImageIcon size={32} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Clique para enviar uma imagem
              </Typography>
              <Typography variant="caption">JPG, PNG ou WEBP, ate 5MB</Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default CoverImageUploader;
