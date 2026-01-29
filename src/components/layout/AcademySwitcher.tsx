'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  CircularProgress,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import {
  ChevronDown,
  Check,
  Star,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAcademy, AcademyInfo } from '@/contexts/AcademyContext';

interface AcademySwitcherProps {
  variant?: 'full' | 'compact';
}

export function AcademySwitcher({ variant = 'full' }: AcademySwitcherProps) {
  const theme = useTheme();
  const router = useRouter();
  const {
    academyId,
    academy,
    primaryAcademyId,
    academiesInfo,
    hasMultipleAcademies,
    isSwitching,
    setAcademy,
  } = useAcademy();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (hasMultipleAcademies) {
      setAnchorEl(event.currentTarget);
    }
  }, [hasMultipleAcademies]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelectAcademy = useCallback(async (selectedId: string) => {
    handleClose();
    if (selectedId !== academyId) {
      await setAcademy(selectedId);
    }
  }, [academyId, setAcademy, handleClose]);

  const handleManageAcademies = useCallback(() => {
    handleClose();
    router.push('/portal/academias');
  }, [router, handleClose]);

  // Single academy - just show name
  if (!hasMultipleAcademies) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src={academy?.logoUrl}
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          {academy?.name?.[0]?.toUpperCase() || 'A'}
        </Avatar>
        {variant === 'full' && (
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {academy?.name || 'Academia'}
          </Typography>
        )}
      </Box>
    );
  }

  // Multiple academies - show dropdown
  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isSwitching}
        sx={{
          textTransform: 'none',
          color: 'text.primary',
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          minWidth: 'auto',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <Avatar
          src={academy?.logoUrl}
          sx={{
            width: 28,
            height: 28,
            bgcolor: 'primary.main',
            fontSize: '0.8rem',
            fontWeight: 700,
            mr: variant === 'full' ? 1.5 : 0,
          }}
        >
          {academy?.name?.[0]?.toUpperCase() || 'A'}
        </Avatar>
        {variant === 'full' && (
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {academy?.name || 'Academia'}
          </Typography>
        )}
        {isSwitching ? (
          <CircularProgress size={16} sx={{ ml: 1 }} />
        ) : (
          <ChevronDown size={16} style={{ marginLeft: 4 }} />
        )}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            maxWidth: 320,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Minhas Academias
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Selecione para trocar
          </Typography>
        </Box>
        <Divider />

        {/* Academy List */}
        {academiesInfo.map((info) => (
          <AcademyMenuItem
            key={info.id}
            info={info}
            isSelected={info.id === academyId}
            isPrimary={info.id === primaryAcademyId}
            onClick={() => handleSelectAcademy(info.id)}
          />
        ))}

        <Divider sx={{ my: 1 }} />

        {/* Manage Academies */}
        <MenuItem onClick={handleManageAcademies} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          <ListItemText>Gerenciar Academias</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

// Academy menu item component
interface AcademyMenuItemProps {
  info: AcademyInfo;
  isSelected: boolean;
  isPrimary: boolean;
  onClick: () => void;
}

function AcademyMenuItem({ info, isSelected, isPrimary, onClick }: AcademyMenuItemProps) {
  const theme = useTheme();

  return (
    <MenuItem
      onClick={onClick}
      selected={isSelected}
      sx={{
        py: 1.5,
        px: 2,
        '&.Mui-selected': {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.12),
          },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 44 }}>
        <Avatar
          src={info.logoUrl}
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {info.name?.[0]?.toUpperCase() || 'A'}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              fontWeight={isSelected ? 600 : 500}
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
                icon={<Star size={10} />}
                label="Principal"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    fontSize: 10,
                    ml: 0.5,
                  },
                }}
              />
            )}
          </Box>
        }
        secondary={info.role === 'admin' ? 'Administrador' : info.role === 'instructor' ? 'Instrutor' : 'Aluno'}
        secondaryTypographyProps={{
          variant: 'caption',
          color: 'text.secondary',
        }}
      />
      {isSelected && (
        <Check size={18} style={{ color: theme.palette.success.main, marginLeft: 8 }} />
      )}
    </MenuItem>
  );
}

export default AcademySwitcher;
