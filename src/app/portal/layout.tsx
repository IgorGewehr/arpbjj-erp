'use client';

import { ReactNode, useCallback, useMemo } from 'react';
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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LayoutDashboard,
  ClipboardCheck,
  DollarSign,
  Calendar,
  User,
  LogOut,
  Trophy,
  History,
  MoreHorizontal,
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
  showInBottomNav?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: LayoutDashboard, path: '/portal', showInBottomNav: true },
  { label: 'Meu Perfil', icon: User, path: '/portal/meu-perfil' },
  { label: 'Histórico', icon: History, path: '/portal/linha-do-tempo' },
  { label: 'Presenças', icon: ClipboardCheck, path: '/portal/presenca', showInBottomNav: true },
  { label: 'Horários', icon: Calendar, path: '/portal/horarios', showInBottomNav: true },
  { label: 'Competições', icon: Trophy, path: '/portal/competicoes', showInBottomNav: true },
  { label: 'Mais', icon: MoreHorizontal, path: '/portal/meu-perfil', showInBottomNav: true },
  { label: 'Financeiro', icon: DollarSign, path: '/portal/financeiro', requiresPlan: true },
];

interface PortalLayoutProps {
  children: ReactNode;
}

function PortalLayoutContent({ children }: PortalLayoutProps) {
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

  const bottomNavItems = useMemo(() => {
    return navItems.filter((item) => item.showInBottomNav);
  }, [navItems]);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [signOut, router]);

  const isActive = (path: string) => {
    if (path === '/portal') return pathname === '/portal';
    return pathname.startsWith(path);
  };

  // For "Mais" tab, check if any of the sub-pages are active
  const isMoreActive = () => {
    return pathname === '/portal/meu-perfil' ||
           pathname.startsWith('/portal/linha-do-tempo') ||
           pathname.startsWith('/portal/financeiro');
  };

  const displayName = student?.nickname || student?.fullName?.split(' ')[0] || user?.displayName || 'Aluno';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'grey.100' }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" letterSpacing={1}>
          PORTAL DO ALUNO
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {navItems.filter(item => item.label !== 'Mais').map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: 1.5,
                  py: 1.25,
                  px: 2,
                  bgcolor: active ? '#111' : 'transparent',
                  '&:hover': { bgcolor: active ? '#111' : 'grey.50' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon size={18} color={active ? '#fff' : '#666'} strokeWidth={active ? 2.5 : 2} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? '#fff' : 'text.secondary',
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
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'grey.50',
          }}
        >
          <Avatar
            src={student?.photoUrl}
            sx={{ width: 36, height: 36, bgcolor: '#111', fontSize: '0.8rem', fontWeight: 600 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {displayName}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleSignOut}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <LogOut size={16} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fafafa' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box component="nav" sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
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
        </Box>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: '#fff',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            top: 0,
          }}
        >
          <Toolbar sx={{ minHeight: 56, px: 2 }}>
            <Avatar
              src={student?.photoUrl}
              sx={{ width: 32, height: 32, bgcolor: '#111', fontSize: '0.75rem', fontWeight: 600 }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, ml: 1.5 }}>
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {displayName}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleSignOut}
              sx={{ color: 'text.secondary' }}
            >
              <LogOut size={18} />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: '100vh',
          pt: { xs: 7, md: 0 },
          pb: { xs: 10, md: 0 },
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
          {children}
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: '#fff',
            borderTop: '1px solid',
            borderColor: 'grey.200',
            zIndex: 1100,
            px: 1,
            py: 0.5,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.label === 'Mais' ? isMoreActive() : isActive(item.path);

              return (
                <Box
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    py: 1,
                    px: 2,
                    cursor: 'pointer',
                    borderRadius: 2,
                    minWidth: 64,
                    transition: 'all 0.15s',
                    bgcolor: active ? 'grey.100' : 'transparent',
                  }}
                >
                  <Icon
                    size={22}
                    color={active ? '#111' : '#888'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.25,
                      fontSize: '0.65rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
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
