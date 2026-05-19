'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Plus,
  Star,
  MoreVertical,
  ArrowRightLeft,
  Unlink,
  Check,
  Info,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { api } from '@/lib/api/client';
import { useFeedback } from '@/components/providers';
import { useAcademy, AcademyInfo } from '@/contexts/AcademyContext';

export default function AcademiasPage() {
  const router = useRouter();
  const theme = useTheme();
  const { firebaseUser } = useAuth();
  const { success, error: showError } = useFeedback();
  const {
    academyId: selectedAcademyId,
    primaryAcademyId,
    academiesInfo,
    hasMultipleAcademies,
    isLoading,
    setAcademy,
    setPrimaryAcademy,
    refreshAcademiesInfo,
  } = useAcademy();

  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; academyId: string } | null>(null);
  const [unlinkDialog, setUnlinkDialog] = useState<AcademyInfo | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, academyId: string) => {
    setMenuAnchor({ el: event.currentTarget, academyId });
  }, []);

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
  }, []);

  const handleSwitchAcademy = useCallback(async (academyId: string) => {
    handleMenuClose();
    await setAcademy(academyId);
    router.push('/portal');
  }, [setAcademy, router, handleMenuClose]);

  const handleSetPrimary = useCallback(async (academyId: string) => {
    handleMenuClose();
    setIsSettingPrimary(true);
    try {
      await setPrimaryAcademy(academyId);
      success('Academia definida como principal');
    } catch (err) {
      showError('Erro ao definir academia principal');
    } finally {
      setIsSettingPrimary(false);
    }
  }, [setPrimaryAcademy, success, showError, handleMenuClose]);

  const handleUnlinkConfirm = useCallback(async () => {
    if (!unlinkDialog || !firebaseUser) return;

    setIsUnlinking(true);
    try {
      const academyId = unlinkDialog.id;
      const userId = firebaseUser.uid;

      await api.delete(`/v1/academies/${academyId}/users/${userId}`);

      success(`Desvinculado de ${unlinkDialog.name}`);
      setUnlinkDialog(null);

      await refreshAcademiesInfo();

      if (academyId === selectedAcademyId) {
        const remaining = academiesInfo.filter(a => a.id !== academyId);
        if (remaining.length > 0) {
          await setAcademy(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Error unlinking academy:', err);
      showError('Erro ao desvincular academia');
    } finally {
      setIsUnlinking(false);
    }
  }, [unlinkDialog, firebaseUser, selectedAcademyId, academiesInfo, setAcademy, refreshAcademiesInfo, success, showError]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  const canUnlink = academiesInfo.length > 1;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Minhas Academias
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gerencie suas academias vinculadas
        </Typography>
      </Box>

      {/* Info Alert */}
      <Alert
        severity="info"
        icon={<Info size={20} />}
        sx={{ mb: 3, borderRadius: 2 }}
      >
        Voce pode treinar em multiplas academias. A academia principal e usada como padrao ao fazer login.
      </Alert>

      {/* Academy List */}
      {academiesInfo.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <Building2 size={40} color={theme.palette.text.secondary} />
            </Box>
            <Typography variant="h6" gutterBottom>
              Nenhuma Academia
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Voce ainda nao esta vinculado a nenhuma academia.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => router.push('/portal/academias/adicionar')}
            >
              Adicionar Academia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {academiesInfo.map((info) => {
            const isSelected = info.id === selectedAcademyId;
            const isPrimary = info.id === primaryAcademyId;

            return (
              <Card
                key={info.id}
                sx={{
                  border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Logo */}
                    <Avatar
                      src={info.logoUrl}
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'primary.main',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                      variant="rounded"
                    >
                      {info.name?.[0]?.toUpperCase() || 'A'}
                    </Avatar>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={600}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {info.name}
                        </Typography>
                        {isPrimary && (
                          <Chip
                            icon={<Star size={12} />}
                            label="Principal"
                            size="small"
                            color="primary"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              '& .MuiChip-icon': {
                                fontSize: 12,
                              },
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {info.role === 'admin' ? 'Administrador' : info.role === 'instructor' ? 'Instrutor' : 'Aluno'}
                      </Typography>
                      {isSelected && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'success.main',
                            }}
                          />
                          <Typography variant="caption" color="success.main" fontWeight={500}>
                            Ativa
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Actions */}
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, info.id)}
                      disabled={isSettingPrimary}
                    >
                      <MoreVertical size={20} />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Add Academy Button */}
      {academiesInfo.length > 0 && (
        <Button
          variant="outlined"
          fullWidth
          startIcon={<Plus size={18} />}
          onClick={() => router.push('/portal/academias/adicionar')}
          sx={{ mt: 3 }}
        >
          Adicionar Academia
        </Button>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { minWidth: 200, borderRadius: 2 },
        }}
      >
        {menuAnchor && menuAnchor.academyId !== primaryAcademyId && (
          <MenuItem onClick={() => handleSetPrimary(menuAnchor.academyId)}>
            <ListItemIcon>
              <Star size={18} />
            </ListItemIcon>
            <ListItemText>Definir como Principal</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => menuAnchor && handleSwitchAcademy(menuAnchor.academyId)}>
          <ListItemIcon>
            <ArrowRightLeft size={18} />
          </ListItemIcon>
          <ListItemText>Trocar para esta Academia</ListItemText>
        </MenuItem>
        {canUnlink && (
          <MenuItem
            onClick={() => {
              const academy = academiesInfo.find(a => a.id === menuAnchor?.academyId);
              if (academy) {
                handleMenuClose();
                setUnlinkDialog(academy);
              }
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <Unlink size={18} color={theme.palette.error.main} />
            </ListItemIcon>
            <ListItemText>Desvincular</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Unlink Confirmation Dialog */}
      <Dialog
        open={Boolean(unlinkDialog)}
        onClose={() => !isUnlinking && setUnlinkDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Desvincular Academia</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja desvincular de <strong>&quot;{unlinkDialog?.name}&quot;</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Voce perdera acesso aos dados desta academia.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setUnlinkDialog(null)}
            disabled={isUnlinking}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleUnlinkConfirm}
            disabled={isUnlinking}
            startIcon={isUnlinking && <CircularProgress size={16} color="inherit" />}
          >
            {isUnlinking ? 'Desvinculando...' : 'Desvincular'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
