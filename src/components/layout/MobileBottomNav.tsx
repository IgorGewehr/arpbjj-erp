'use client';

import { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  useTheme,
} from '@mui/material';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  DollarSign,
  MoreHorizontal,
  Calendar,
  Trophy,
  BarChart3,
  Settings,
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

interface MobileBottomNavProps {
  overdueCount?: number;
}

// ============================================
// Primary Navigation Items (Bottom Bar)
// ============================================
const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Chamada', icon: ClipboardCheck, path: '/chamada' },
  { label: 'Alunos', icon: Users, path: '/alunos' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
];

// ============================================
// Secondary Navigation Items (More Menu)
// ============================================
const secondaryNavItems: NavItem[] = [
  { label: 'Turmas', icon: Calendar, path: '/turmas' },
  { label: 'Competicoes', icon: Trophy, path: '/competicoes' },
  { label: 'Relatorios', icon: BarChart3, path: '/relatorios' },
  { label: 'Configuracoes', icon: Settings, path: '/configuracoes' },
];

// ============================================
// Navigation ordered for swipe
// ============================================
export const SWIPE_NAV_ORDER = ['/dashboard', '/chamada', '/alunos', '/financeiro'];

// ============================================
// MobileBottomNav Component
// ============================================
export function MobileBottomNav({ overdueCount = 0 }: MobileBottomNavProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);

  const handleNavigate = useCallback((path: string) => {
    router.push(path);
    setMoreAnchor(null);
  }, [router]);

  const handleMoreOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMoreAnchor(event.currentTarget);
  }, []);

  const handleMoreClose = useCallback(() => {
    setMoreAnchor(null);
  }, []);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  // Check if any secondary item is active
  const isSecondaryActive = secondaryNavItems.some(item => isActive(item.path));

  return (
    <>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar + 1,
          display: { xs: 'flex', md: 'none' },
          borderRadius: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          // Safe area for iPhones with notch
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-around',
            alignItems: 'center',
            py: 0.5,
          }}
        >
          {primaryNavItems.map((item) => {
            const active = isActive(item.path);
            const showBadge = item.path === '/financeiro' && overdueCount > 0;

            return (
              <Box
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  py: 1,
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 32,
                    borderRadius: 4,
                    bgcolor: active ? 'primary.main' : 'transparent',
                    transition: 'all 0.2s ease',
                    mb: 0.25,
                  }}
                >
                  <Badge
                    badgeContent={showBadge ? overdueCount : 0}
                    color="error"
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        height: 16,
                        minWidth: 16,
                      },
                    }}
                  >
                    <item.icon
                      size={22}
                      color={active ? '#fff' : theme.palette.text.secondary}
                    />
                  </Badge>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'primary.main' : 'text.secondary',
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}

          {/* More Button */}
          <Box
            onClick={handleMoreOpen}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              py: 1,
              cursor: 'pointer',
              transition: 'transform 0.1s ease',
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 32,
                borderRadius: 4,
                bgcolor: isSecondaryActive ? 'primary.main' : 'transparent',
                transition: 'all 0.2s ease',
                mb: 0.25,
              }}
            >
              <MoreHorizontal
                size={22}
                color={isSecondaryActive ? '#fff' : theme.palette.text.secondary}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                fontWeight: isSecondaryActive ? 600 : 400,
                color: isSecondaryActive ? 'primary.main' : 'text.secondary',
                lineHeight: 1,
              }}
            >
              Mais
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* More Menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={handleMoreClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 3,
            minWidth: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            mb: 1,
          },
        }}
      >
        {secondaryNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <MenuItem
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              selected={active}
              sx={{
                py: 1.5,
                borderRadius: 1,
                mx: 0.5,
                my: 0.25,
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
              }}
            >
              <ListItemIcon sx={{ color: active ? 'inherit' : 'text.secondary' }}>
                <item.icon size={20} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem',
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export default MobileBottomNav;
