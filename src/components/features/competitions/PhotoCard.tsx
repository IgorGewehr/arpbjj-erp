'use client';

import { useState } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  Box,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  EmojiEvents as MedalIcon,
} from '@mui/icons-material';
import { CompetitionPhoto } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PhotoCardProps {
  photo: CompetitionPhoto;
  onDelete?: (photoId: string) => void;
  onUpdateCaption?: (photoId: string, caption: string) => void;
  onToggleHighlight?: (photoId: string, isHighlight: boolean) => void;
  onClick?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canHighlight?: boolean;
}

const MEDAL_COLORS: Record<string, string> = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  participant: '#757575',
};

const MEDAL_LABELS: Record<string, string> = {
  gold: 'Ouro',
  silver: 'Prata',
  bronze: 'Bronze',
  participant: 'Participante',
};

export function PhotoCard({
  photo,
  onDelete,
  onUpdateCaption,
  onToggleHighlight,
  onClick,
  canEdit = false,
  canDelete = false,
  canHighlight = false,
}: PhotoCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newCaption, setNewCaption] = useState(photo.caption || '');

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleHighlightClick = () => {
    onToggleHighlight?.(photo.id, !photo.isHighlight);
    handleMenuClose();
  };

  const handleSaveCaption = () => {
    onUpdateCaption?.(photo.id, newCaption);
    setEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    onDelete?.(photo.id);
    setDeleteDialogOpen(false);
  };

  const hasActions = canEdit || canDelete || canHighlight;

  return (
    <>
      <Card
        sx={{
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: onClick ? 'scale(1.02)' : 'none',
            boxShadow: onClick ? 6 : 1,
          },
        }}
        onClick={onClick}
      >
        {/* Medal Badge */}
        {photo.medalType && (
          <Chip
            icon={<MedalIcon />}
            label={MEDAL_LABELS[photo.medalType]}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 1,
              backgroundColor: MEDAL_COLORS[photo.medalType],
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        )}

        {/* Highlight Star */}
        {photo.isHighlight && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: hasActions ? 48 : 8,
              zIndex: 1,
            }}
          >
            <StarIcon sx={{ color: '#FFD700', fontSize: 32 }} />
          </Box>
        )}

        {/* Actions Menu */}
        {hasActions && (
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              zIndex: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              {canEdit && (
                <MenuItem onClick={handleEditClick}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Editar Legenda
                </MenuItem>
              )}
              {canHighlight && (
                <MenuItem onClick={handleHighlightClick}>
                  {photo.isHighlight ? (
                    <StarBorderIcon fontSize="small" sx={{ mr: 1 }} />
                  ) : (
                    <StarIcon fontSize="small" sx={{ mr: 1 }} />
                  )}
                  {photo.isHighlight ? 'Remover Destaque' : 'Destacar Foto'}
                </MenuItem>
              )}
              {canDelete && (
                <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Deletar
                </MenuItem>
              )}
            </Menu>
          </Box>
        )}

        {/* Photo */}
        <CardMedia
          component="img"
          height="240"
          image={photo.url}
          alt={photo.caption || `Foto de ${photo.studentName}`}
          sx={{
            objectFit: 'cover',
          }}
        />

        {/* Info */}
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {photo.studentName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {photo.studentName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(photo.createdAt, "d 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </Typography>
            </Box>
          </Box>

          {photo.caption && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {photo.caption}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Edit Caption Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Editar Legenda</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="Adicione uma legenda..."
            inputProps={{ maxLength: 200 }}
            helperText={`${newCaption.length}/200 caracteres`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveCaption} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Deletar Foto?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja deletar esta foto? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Deletar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
