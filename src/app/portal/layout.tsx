'use client';

import { ReactNode, useCallback, useMemo, useState } from 'react';
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
  Star,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useAuth, usePermissions } from '@/components/providers';
import { StudentPortalGuard } from '@/components/common';
import { studentService, planService } from '@/services';
import { BottomSheet, ScaleOnPress } from '@/components/mobile';

const DRAWER_WIDTH = 220;

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  requiresPlan?: boolean;
  requiresKids?: boolean;
  showInBottomNav?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', icon: LayoutDashboard, path: '/portal', showInBottomNav: true },
  { label: 'Perfil', icon: User, path: '/portal/meu-perfil', showInBottomNav: true },
  { label: 'Presenças', icon: ClipboardCheck, path: '/portal/presenca', showInBottomNav: true },
  { label: 'Competições', icon: Trophy, path: '/portal/competicoes', showInBottomNav: true },
  { label: 'Mais', icon: MoreHorizontal, path: '', showInBottomNav: true },
  // Items below will appear in "Mais" menu
  { label: 'Horários', icon: Calendar, path: '/portal/horarios' },
  { label: 'Histórico', icon: History, path: '/portal/linha-do-tempo' },
  { label: 'Comportamento', icon: Star, path: '/portal/comportamento', requiresKids: true },
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const { user, signOut } = useAuth();
  const { linkedStudentIds } = usePermissions();

  const studentId = linkedStudentIds[0];

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  // Validate if the plan actually exists (handles orphaned planIds)
  const { data: plan } = useQuery({
    queryKey: ['plan', student?.planId],
    queryFn: () => planService.getById(student!.planId!),
    enabled: !!student?.planId,
  });

  // Only consider student has a valid plan if the plan exists
  const hasValidPlan = !!student?.planId && !!plan;

  const navItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.requiresPlan && !hasValidPlan) return false;
      if (item.requiresKids && student?.category !== 'kids') return false;
      return true;
    });
  }, [hasValidPlan, student?.category]);

  const bottomNavItems = useMemo(() => {
    return navItems.filter((item) => item.showInBottomNav);
  }, [navItems]);

  // Items for the "Mais" BottomSheet menu (items not shown in bottom nav)
  const moreMenuItems = useMemo(() => {
    return navItems.filter((item) => !item.showInBottomNav && item.label !== 'Mais');
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
    return pathname.startsWith('/portal/horarios') ||
           pathname.startsWith('/portal/linha-do-tempo') ||
           pathname.startsWith('/portal/comportamento') ||
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Image
                  src="/logo_login.png"
                  alt="T23"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    fontSize: '0.85rem',
                  }}
                >
                  T23 JJ
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.65rem',
                    fontStyle: 'italic',
                  }}
                >
                  - Vamos avante, ombro a ombro
                </Typography>
              </Box>
            </Box>
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

      {/* Mobile Bottom Navigation - Modern Fintech Style */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
            zIndex: 1100,
            px: 1,
            py: 0.75,
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)',
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
              const isMoreButton = item.label === 'Mais';

              return (
                <Box
                  key={item.label}
                  onClick={() => isMoreButton ? setMoreMenuOpen(true) : handleNavigate(item.path)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    py: 0.75,
                    px: 1.5,
                    cursor: 'pointer',
                    borderRadius: 2,
                    minWidth: 56,
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    '&:active': {
                      transform: 'scale(0.95)',
                    },
                  }}
                >
                  {/* Active Indicator Pill */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 28,
                      borderRadius: 3,
                      bgcolor: active ? '#111' : 'transparent',
                      transition: 'all 0.2s ease',
                      mb: 0.25,
                    }}
                  >
                    <Icon
                      size={20}
                      color={active ? '#fff' : '#666'}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: active ? 600 : 500,
                      color: active ? 'text.primary' : 'text.secondary',
                      letterSpacing: 0.2,
                    }}
                  >
                    {item.label}
                  </Typography>
                  {/* Active Dot Indicator */}
                  {active && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: '#111',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* More Menu BottomSheet */}
      <BottomSheet
        open={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title="Mais opções"
        height="auto"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {moreMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <ScaleOnPress key={item.path}>
                <Box
                  onClick={() => {
                    handleNavigate(item.path);
                    setMoreMenuOpen(false);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: active ? '#111' : 'grey.50',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: active ? 'rgba(255,255,255,0.1)' : 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color={active ? '#fff' : '#444'} />
                  </Box>
                  <Typography
                    variant="body1"
                    fontWeight={active ? 600 : 500}
                    sx={{ flex: 1, color: active ? '#fff' : 'text.primary' }}
                  >
                    {item.label}
                  </Typography>
                  <ChevronRight size={18} color={active ? '#fff' : '#999'} />
                </Box>
              </ScaleOnPress>
            );
          })}
        </Box>
      </BottomSheet>
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
