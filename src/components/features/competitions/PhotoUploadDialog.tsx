'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

interface PhotoUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, caption?: string, photoType?: 'student' | 'team') => Promise<void>;
  maxPhotos: number;
  currentPhotos: number;
  isUploading?: boolean;
  isAdmin?: boolean;
  enrolledStudents?: { id: string; name: string }[];
  selectedStudentId?: string;
  onStudentSelect?: (studentId: string) => void;
}

export function PhotoUploadDialog({
  open,
  onClose,
  onUpload,
  maxPhotos,
  currentPhotos,
  isUploading = false,
  isAdmin = false,
  enrolledStudents = [],
  selectedStudentId = '',
  onStudentSelect,
}: PhotoUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'student' | 'team'>('student');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingPhotos = maxPhotos - currentPhotos;

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Tamanho máximo: 10MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile, caption || undefined, isAdmin ? photoType : undefined);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setError(null);
    setPhotoType('student');
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Adicionar Foto
        <Typography variant="caption" display="block" color="text.secondary">
          {remainingPhotos > 0
            ? `Você pode adicionar mais ${remainingPhotos} foto${remainingPhotos > 1 ? 's' : ''}`
            : 'Limite de fotos atingido'}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {isAdmin && (
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={photoType}
              exclusive
              onChange={(_, val) => val && setPhotoType(val)}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="student">Foto do Aluno</ToggleButton>
              <ToggleButton value="team">Foto da Equipe</ToggleButton>
            </ToggleButtonGroup>

            {photoType === 'student' && enrolledStudents.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Selecione o Aluno</InputLabel>
                <Select
                  value={selectedStudentId}
                  label="Selecione o Aluno"
                  onChange={(e) => onStudentSelect?.(e.target.value)}
                >
                  {enrolledStudents.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!selectedFile ? (
          <Box
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              Arraste uma foto aqui
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ou clique para selecionar
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              JPG, PNG ou WEBP • Máx 10MB
            </Typography>
          </Box>
        ) : (
          <Box>
            {preview && (
              <Box
                component="img"
                src={preview}
                alt="Preview"
                sx={{
                  width: '100%',
                  maxHeight: 300,
                  objectFit: 'contain',
                  borderRadius: 1,
                  mb: 2,
                }}
              />
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Legenda (opcional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              inputProps={{ maxLength: 200 }}
              helperText={`${caption.length}/200 caracteres`}
            />
          </Box>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {isUploading && <LinearProgress sx={{ mt: 2 }} />}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isUploading}>
          Cancelar
        </Button>
        {selectedFile && (
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={isUploading || (isAdmin && photoType === 'student' && !selectedStudentId)}
          >
            {isUploading ? 'Enviando...' : 'Fazer Upload'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
