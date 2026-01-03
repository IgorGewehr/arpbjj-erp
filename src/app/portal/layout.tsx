'use client';

import { ReactNode, useState, useCallback, useMemo } from 'react';
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
  Calendar,
  User,
  LogOut,
  Trophy,
  History,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, usePermissions } from '@/components/providers';
import { StudentPortalGuard } from '@/components/common';
import { studentService } from '@/services';

const DRAWER_WIDTH = 220;

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  requiresPlan?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: LayoutDashboard, path: '/portal' },
  { label: 'Perfil', icon: User, path: '/portal/meu-perfil' },
  { label: 'Presenças', icon: ClipboardCheck, path: '/portal/presenca' },
  { label: 'Competições', icon: Trophy, path: '/portal/competicoes' },
  { label: 'Histórico', icon: History, path: '/portal/linha-do-tempo' },
  { label: 'Financeiro', icon: DollarSign, path: '/portal/financeiro', requiresPlan: true },
  { label: 'Horários', icon: Calendar, path: '/portal/horarios' },
];

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
  const { linkedStudentIds } = usePermissions();

  const studentId = linkedStudentIds[0];

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.requiresPlan && !student?.planId) return false;
      return true;
    });
  }, [student?.planId]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
      if (isMobile) setMobileOpen(false);
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

  const isActive = (path: string) => {
    if (path === '/portal') return pathname === '/portal';
    return pathname.startsWith(path);
  };

  const displayName = student?.nickname || student?.fullName?.split(' ')[0] || user?.displayName || 'Aluno';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary" letterSpacing={0.5}>
          PORTAL
        </Typography>
        {isMobile && (
          <IconButton size="small" onClick={handleDrawerToggle} sx={{ color: 'text.secondary' }}>
            <X size={18} />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 1,
                  py: 1,
                  px: 1.5,
                  bgcolor: active ? 'grey.100' : 'transparent',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Icon size={18} color={active ? '#111' : '#666'} strokeWidth={active ? 2.5 : 2} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'text.primary' : 'text.secondary',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User Section */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            '&:hover': { opacity: 0.8 },
          }}
          onClick={() => handleNavigate('/portal/meu-perfil')}
        >
          <Avatar
            src={student?.photoUrl}
            sx={{ width: 32, height: 32, bgcolor: '#111', fontSize: '0.75rem', fontWeight: 600 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={500} noWrap>
              {displayName}
            </Typography>
          </Box>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleSignOut(); }} sx={{ color: 'text.secondary' }}>
            <LogOut size={16} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fafafa' }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{ bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'grey.200' }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 1, color: 'text.primary' }}>
              <MenuIcon size={20} />
            </IconButton>
            <Typography variant="body1" fontWeight={600} sx={{ flex: 1, color: 'text.primary' }}>
              {displayName}
            </Typography>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              <Avatar src={student?.photoUrl} sx={{ width: 28, height: 28, bgcolor: '#111', fontSize: '0.7rem' }}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                border: 'none',
                borderRight: '1px solid',
                borderColor: 'grey.200',
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
          minHeight: '100vh',
          mt: { xs: 7, md: 0 },
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1000, mx: 'auto' }}>
          {children}
        </Box>
      </Box>

      {/* Mobile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { mt: 1, minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' } }}
      >
        <MenuItem onClick={() => { handleMenuClose(); router.push('/portal/meu-perfil'); }}>
          <ListItemIcon><User size={16} /></ListItemIcon>
          <Typography variant="body2">Perfil</Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon><LogOut size={16} /></ListItemIcon>
          <Typography variant="body2">Sair</Typography>
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
