'use client';

import { useCallback, useRef, useMemo } from 'react';
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
  alpha,
  Tooltip,
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
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onCollapseToggle,
}: SidebarProps) {
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

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  // Navigation item component
  const NavItemButton = ({ item, isCompact = false }: { item: NavItem; isCompact?: boolean }) => {
    const active = isActive(item.path);

    const button = (
      <ListItemButton
        onClick={() => handleNavigate(item.path)}
        selected={active}
        sx={{
          borderRadius: 2,
          minHeight: isCompact ? 44 : 48,
          justifyContent: collapsed && !isCompact ? 'center' : 'flex-start',
          px: collapsed && !isCompact ? 1.5 : 2,
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
            bgcolor: active ? 'primary.dark' : 'action.hover',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed && !isCompact ? 0 : isCompact ? 36 : 40,
            color: active ? 'inherit' : 'text.secondary',
          }}
        >
          <item.icon size={isCompact ? 20 : 22} />
        </ListItemIcon>
        {(!collapsed || isCompact) && (
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: active ? 600 : 500,
              fontSize: isCompact ? '0.875rem' : '0.9rem',
            }}
          />
        )}
      </ListItemButton>
    );

    if (collapsed && !isCompact) {
      return (
        <Tooltip title={item.label} placement="right" arrow>
          {button}
        </Tooltip>
      );
    }

    return button;
  };

  // Drawer content
  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        position: 'relative',
        ...(academy?.sidebarBackgroundUrl && {
          backgroundImage: `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${academy.sidebarBackgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }),
      }}
    >
      {/* Logo/Brand Header with Collapse Toggle */}
      <Box
        sx={{
          p: collapsed ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
          gap: 1,
        }}
      >
        {collapsed ? (
          /* Collapsed state: only show expand arrow */
          !isMobile && onCollapseToggle && (
            <Tooltip title="Expandir menu" placement="right">
              <IconButton
                size="small"
                onClick={onCollapseToggle}
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                  },
                }}
              >
                <ChevronRight size={20} />
              </IconButton>
            </Tooltip>
          )
        ) : (
          /* Expanded state: logo + text + collapse arrow */
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <Image
                  src="/bjjeasy_logo.png"
                  alt="BJJEasy"
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.2,
                  fontSize: '1rem',
                }}
              >
                BJJEasy
              </Typography>
            </Box>
            {!isMobile && onCollapseToggle && (
              <Tooltip title="Recolher menu" placement="right">
                <IconButton
                  size="small"
                  onClick={onCollapseToggle}
                  sx={{
                    width: 32,
                    height: 32,
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      color: 'primary.main',
                    },
                  }}
                >
                  <ChevronLeft size={18} />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
        <List disablePadding>
          {mainNavItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ px: 1, py: 0.25 }}>
              <NavItemButton item={item} />
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
              <NavItemButton item={item} />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* User Profile */}
      <Box sx={{ p: 1.5 }}>
        {collapsed ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Tooltip title={user?.displayName || 'Usuário'} placement="right">
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
            </Tooltip>
            <Tooltip title="Sair" placement="right">
              <IconButton size="small" onClick={handleSignOut}>
                <LogOut size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
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
            <Tooltip title="Sair">
              <IconButton size="small" onClick={handleSignOut}>
                <LogOut size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1, overflow: 'hidden' }}>
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
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.2,
                fontSize: '1rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {academy?.name || 'Academia'}
            </Typography>
            {academy?.portalSlogan && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1,
                  fontSize: '0.7rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
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
              <NavItemButton item={item} isCompact />
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
              <NavItemButton item={item} isCompact />
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
          overflow: 'visible', // Allow toggle button to overflow
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
