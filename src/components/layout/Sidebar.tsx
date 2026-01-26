'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  Avatar,
  useTheme,
  useMediaQuery,
  SwipeableDrawer,
} from '@mui/material';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Trophy,
  X,
  Store,
  Wallet,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';

// ============================================
// Constants
// ============================================
const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 72;

// ============================================
// Navigation Items
// ============================================
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Chamada', icon: ClipboardCheck, path: '/chamada' },
  { label: 'Alunos', icon: Users, path: '/alunos' },
  { label: 'Turmas', icon: Calendar, path: '/turmas' },
  { label: 'Competições', icon: Trophy, path: '/competicoes' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { label: 'Relatórios', icon: BarChart3, path: '/relatorios' },
];

const storeNavItem: NavItem = { label: 'Loja', icon: Store, path: '/loja' };
const walletNavItem: NavItem = { label: 'Carteira', icon: Wallet, path: '/carteira' };

const bottomNavItems: NavItem[] = [
  { label: 'Configurações', icon: Settings, path: '/configuracoes' },
];

// ============================================
// Sidebar Component
// ============================================
interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, signOut } = useAuth();
  const { academy } = useAcademy();

  // Compute nav items based on academy settings
  const mainNavItems = useMemo(() => {
    const items = [...baseNavItems];
    let insertIndex = 6; // After Financeiro

    // Add Carteira after Financeiro if AbacatePay is enabled
    if (academy?.abacatePayEnabled) {
      items.splice(insertIndex, 0, walletNavItem);
      insertIndex++;
    }

    // Add Store after Carteira/Financeiro if store is enabled
    if (academy?.storeEnabled) {
      items.splice(insertIndex, 0, storeNavItem);
    }

    return items;
  }, [academy?.storeEnabled, academy?.abacatePayEnabled]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
      if (isMobile && onMobileClose) {
        onMobileClose();
      }
    },
    [router, isMobile, onMobileClose]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [signOut, router]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  // Modern minimal scrollbar styles
  const scrollbarStyles = {
    overflowY: 'auto' as const,
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: isScrolling ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
      borderRadius: '3px',
      transition: 'background 0.3s ease',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: 'rgba(0, 0, 0, 0.3)',
    },
    // Firefox
    scrollbarWidth: 'thin' as const,
    scrollbarColor: isScrolling ? 'rgba(0, 0, 0, 0.2) transparent' : 'transparent transparent',
  };

  // Drawer content
  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        ...(academy?.sidebarBackgroundUrl && {
          backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${academy.sidebarBackgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
    >
      {/* Logo/Brand */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                mr: '1px',
              }}
            >
              <Image
                src={academy?.sidebarLogoUrl || academy?.logoUrl || '/logo_conteudo.png'}
                alt={academy?.name || 'Academia'}
                fill
                style={{ objectFit: 'cover' }}
              />
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.3,
                  fontSize: '0.85rem',
                }}
              >
                {academy?.name || 'Academia'}
              </Typography>
              {academy?.portalSlogan && (
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    lineHeight: 1.3,
                    fontSize: '0.85rem',
                  }}
                >
                  - {academy.portalSlogan}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {collapsed && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Image
              src={academy?.sidebarLogoUrl || academy?.logoUrl || '/logo_conteudo.png'}
              alt={academy?.name || 'Academia'}
              fill
              style={{ objectFit: 'cover' }}
            />
          </Box>
        )}

        {!isMobile && (
          <IconButton size="small" onClick={toggleCollapsed}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box
        onScroll={handleScroll}
        sx={{ flex: 1, py: 1, ...scrollbarStyles }}
      >
        <List disablePadding>
          {mainNavItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 40,
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                  }}
                >
                  <item.icon size={22} />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive(item.path) ? 600 : 500,
                      fontSize: '0.9rem',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

      </Box>

      <Divider />

      {/* Bottom Navigation */}
      <Box sx={{ py: 1 }}>
        <List disablePadding>
          {bottomNavItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 40,
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                  }}
                >
                  <item.icon size={22} />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive(item.path) ? 600 : 500,
                      fontSize: '0.9rem',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* User Profile */}
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
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              fontSize: '0.9rem',
            }}
          >
            {user?.displayName?.[0] || 'U'}
          </Avatar>
          {!collapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.displayName || 'Usuário'}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {user?.email}
              </Typography>
            </Box>
          )}
          {!collapsed && (
            <IconButton size="small" onClick={handleSignOut}>
              <LogOut size={18} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  );

  // Mobile drawer content with close button
  const mobileDrawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        ...(academy?.sidebarBackgroundUrl && {
          backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${academy.sidebarBackgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
    >
      {/* Mobile Header with Close Button */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 56,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <Image
              src={academy?.sidebarLogoUrl || academy?.logoUrl || '/logo_conteudo.png'}
              alt={academy?.name || 'Academia'}
              fill
              style={{ objectFit: 'cover' }}
            />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.2,
                fontSize: '1rem',
              }}
            >
              {academy?.name || 'Academia'}
            </Typography>
            {academy?.portalSlogan && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1, fontSize: '0.7rem' }}
              >
                {academy.portalSlogan}
              </Typography>
            )}
          </Box>
        </Box>

        <IconButton size="small" onClick={onMobileClose} sx={{ color: 'text.secondary' }}>
          <X size={20} />
        </IconButton>
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
        <List disablePadding>
          {mainNavItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                    },
                  },
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                  }}
                >
                  <item.icon size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 500,
                    fontSize: '0.875rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* Bottom Navigation */}
      <Box sx={{ py: 1 }}>
        <List disablePadding>
          {bottomNavItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1, py: 0.25 }}>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  minHeight: 44,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                  }}
                >
                  <item.icon size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 500,
                    fontSize: '0.875rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* User Profile */}
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
            sx={{
              width: 32,
              height: 32,
              bgcolor: 'primary.main',
              fontSize: '0.8rem',
            }}
          >
            {user?.displayName?.[0] || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
              }}
            >
              {user?.displayName || 'Usuário'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                fontSize: '0.7rem',
              }}
            >
              {user?.email}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleSignOut}>
            <LogOut size={16} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <SwipeableDrawer
        variant="temporary"
        open={mobileOpen}
        onOpen={() => {}}
        onClose={onMobileClose || (() => {})}
        disableSwipeToOpen
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '85vw', sm: DRAWER_WIDTH },
            maxWidth: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {mobileDrawerContent}
      </SwipeableDrawer>
    );
  }

  // Desktop drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export const SIDEBAR_WIDTH = DRAWER_WIDTH;
export const SIDEBAR_COLLAPSED_WIDTH = DRAWER_COLLAPSED_WIDTH;

export default Sidebar;
