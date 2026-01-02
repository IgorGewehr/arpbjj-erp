'use client';

import { useState, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Plus,
} from 'lucide-react';
import { useAuth, useThemeMode } from '@/components/providers';
import { useRouter } from 'next/navigation';

// ============================================
// Props Interface
// ============================================
interface TopBarProps {
  onMenuClick?: () => void;
  title?: string;
}

// ============================================
// TopBar Component
// ============================================
export function TopBar({ onMenuClick, title }: TopBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDark, toggleMode } = useThemeMode();

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  const handleNotificationOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  }, []);

  const handleNotificationClose = useCallback(() => {
    setNotificationAnchor(null);
  }, []);

  const handleProfile = useCallback(() => {
    handleUserMenuClose();
    router.push('/perfil');
  }, [handleUserMenuClose, router]);

  const handleSettings = useCallback(() => {
    handleUserMenuClose();
    router.push('/configuracoes');
  }, [handleUserMenuClose, router]);

  const handleSignOut = useCallback(async () => {
    handleUserMenuClose();
    await signOut();
    router.push('/login');
  }, [handleUserMenuClose, signOut, router]);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: { xs: 0.5, sm: 1, md: 2 }, px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
        {/* Menu Button (Mobile) */}
        {isMobile && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon size={22} />
          </IconButton>
        )}

        {/* Title */}
        {title && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              display: { xs: 'none', sm: 'block' },
              fontSize: { sm: '1rem', md: '1.25rem' },
            }}
          >
            {title}
          </Typography>
        )}

        {/* Search Bar - Hidden on xs, shown from sm */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            maxWidth: { sm: 280, md: 400 },
            mx: { sm: 1, md: 2 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'action.hover',
              borderRadius: 2,
              px: { sm: 1.5, md: 2 },
              py: 0.75,
              width: '100%',
            }}
          >
            <Search size={18} style={{ color: theme.palette.text.secondary }} />
            <InputBase
              placeholder="Buscar aluno, turma..."
              sx={{
                ml: 1,
                flex: 1,
                fontSize: { sm: '0.8rem', md: '0.9rem' },
                '& input': {
                  p: 0,
                },
              }}
            />
          </Box>
        </Box>

        {/* Mobile Search Icon - Only on xs */}
        <IconButton
          sx={{
            display: { xs: 'flex', sm: 'none' },
            color: 'text.primary',
          }}
        >
          <Search size={20} />
        </IconButton>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5, md: 1 } }}>
          {/* Quick Add Button - Hidden on xs */}
          <IconButton
            sx={{
              display: { xs: 'none', sm: 'flex' },
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: { sm: 36, md: 40 },
              height: { sm: 36, md: 40 },
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
            onClick={() => router.push('/alunos/novo')}
          >
            <Plus size={20} />
          </IconButton>

          {/* Theme Toggle */}
          <IconButton
            onClick={toggleMode}
            sx={{ color: 'text.primary', p: { xs: 0.75, sm: 1 } }}
          >
            {isDark ? <Sun size={isMobile ? 18 : 20} /> : <Moon size={isMobile ? 18 : 20} />}
          </IconButton>

          {/* Notifications */}
          <IconButton
            onClick={handleNotificationOpen}
            sx={{ color: 'text.primary', p: { xs: 0.75, sm: 1 } }}
          >
            <Bell size={isMobile ? 18 : 20} />
          </IconButton>

          {/* User Avatar */}
          <IconButton onClick={handleUserMenuOpen} sx={{ p: 0.5 }}>
            <Avatar
              src={user?.photoUrl}
              sx={{
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                bgcolor: 'primary.main',
                fontSize: { xs: '0.8rem', sm: '1rem' },
              }}
            >
              {user?.displayName?.[0] || 'U'}
            </Avatar>
          </IconButton>
        </Box>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: { xs: 180, sm: 200 },
              maxWidth: { xs: 'calc(100vw - 32px)', sm: 'none' },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <User size={18} />
            </ListItemIcon>
            <ListItemText>Meu Perfil</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleSettings}>
            <ListItemIcon>
              <Settings size={18} />
            </ListItemIcon>
            <ListItemText>Configurações</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut}>
            <ListItemIcon>
              <LogOut size={18} />
            </ListItemIcon>
            <ListItemText>Sair</ListItemText>
          </MenuItem>
        </Menu>

        {/* Notification Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: { xs: 280, sm: 320 },
              maxWidth: { xs: 'calc(100vw - 32px)', sm: 'none' },
              maxHeight: { xs: 350, sm: 400 },
            },
          }}
        >
          <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Notificações
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ px: { xs: 1.5, sm: 2 }, py: { xs: 2, sm: 3 }, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Nenhuma notificação
            </Typography>
          </Box>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default TopBar;
