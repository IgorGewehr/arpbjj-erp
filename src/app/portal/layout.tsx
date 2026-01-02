'use client';

import { ReactNode, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LayoutDashboard,
  ClipboardCheck,
  DollarSign,
  Award,
  Calendar,
  User,
  LogOut,
  ChevronRight,
  Trophy,
  History,
} from 'lucide-react';
import { useAuth, usePermissions } from '@/components/providers';
import { StudentPortalGuard } from '@/components/common';

// ============================================
// Constants
// ============================================
const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Início', icon: LayoutDashboard, path: '/portal' },
  { label: 'Meu Perfil', icon: User, path: '/portal/meu-perfil' },
  { label: 'Minhas Presenças', icon: ClipboardCheck, path: '/portal/presenca' },
  { label: 'Competições', icon: Trophy, path: '/portal/competicoes' },
  { label: 'Linha do Tempo', icon: History, path: '/portal/linha-do-tempo' },
  { label: 'Financeiro', icon: DollarSign, path: '/portal/financeiro' },
  { label: 'Horários', icon: Calendar, path: '/portal/horarios' },
];

// ============================================
// Portal Layout
// ============================================
interface PortalLayoutProps {
  children: ReactNode;
}

function PortalLayoutContent({ children }: PortalLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { user, signOut } = useAuth();
  const { roleLabel } = usePermissions();

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
      if (isMobile) {
        setMobileOpen(false);
      }
    },
    [router, isMobile]
  );

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    handleMenuClose();
    await signOut();
    router.push('/login');
  }, [signOut, router, handleMenuClose]);

  const isActive = (path: string) => pathname === path;

  // Drawer content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Award size={24} color="white" />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Portal do Aluno
          </Typography>
          <Typography variant="caption" color="text.secondary">
            MarcusJJ Academia
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
        <List disablePadding>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'inherit' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                  }}
                >
                  <item.icon size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 500,
                    fontSize: '0.9rem',
                  }}
                />
                {isActive(item.path) && <ChevronRight size={16} />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* User */}
      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
          }}
        >
          <Avatar
            src={user?.photoUrl}
            sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}
          >
            {user?.displayName?.[0] || 'A'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {user?.displayName || 'Aluno'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {roleLabel}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleSignOut}>
            <LogOut size={18} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar (Mobile) */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 1,
          }}
        >
          <Toolbar>
            <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
              Portal do Aluno
            </Typography>
            <IconButton onClick={handleMenuOpen}>
              <Avatar
                src={user?.photoUrl}
                sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              >
                {user?.displayName?.[0] || 'A'}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: 3,
          mt: { xs: 8, md: 0 },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>

      {/* User Menu (Mobile) */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { handleMenuClose(); router.push('/portal/perfil'); }}>
          <ListItemIcon><User size={18} /></ListItemIcon>
          Meu Perfil
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon><LogOut size={18} /></ListItemIcon>
          Sair
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <StudentPortalGuard>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </StudentPortalGuard>
  );
}
