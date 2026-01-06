'use client';

import { useState, useCallback, useEffect, useRef, forwardRef } from 'react';
import { TransitionProps } from '@mui/material/transitions';
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
  Paper,
  Popper,
  ClickAwayListener,
  CircularProgress,
  alpha,
  Dialog,
  Slide,
  TextField,
  InputAdornment,
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
  GraduationCap,
  CreditCard,
  X,
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth, useThemeMode } from '@/components/providers';
import { useRouter } from 'next/navigation';
import { studentService } from '@/services/studentService';
import { classService } from '@/services/classService';
import { planService } from '@/services/planService';
import { Student, Class, Plan } from '@/types';

// ============================================
// Search Result Types
// ============================================
type SearchResultType = 'student' | 'class' | 'plan';

interface SearchResult {
  id: string;
  name: string;
  type: SearchResultType;
  subtitle?: string;
}

// ============================================
// Slide Transition for Mobile Search Dialog
// ============================================
const SlideTransition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

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

  // Mobile search dialog state
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results: SearchResult[] = [];
        const searchLower = searchTerm.toLowerCase();

        // Search students using the new searchByName method
        const students = await studentService.searchByName(searchTerm);
        students.slice(0, 10).forEach((student: Student) => {
          results.push({
            id: student.id,
            name: student.fullName,
            type: 'student',
            subtitle: student.nickname || student.currentBelt,
          });
        });

        // Search classes (filter client-side)
        const classes = await classService.list();
        classes
          .filter((cls: Class) => cls.name.toLowerCase().includes(searchLower))
          .slice(0, 5)
          .forEach((cls: Class) => {
            results.push({
              id: cls.id,
              name: cls.name,
              type: 'class',
              subtitle: cls.category,
            });
          });

        // Search plans (filter client-side)
        const plans = await planService.list();
        plans
          .filter((plan: Plan) => plan.name.toLowerCase().includes(searchLower))
          .slice(0, 5)
          .forEach((plan: Plan) => {
            results.push({
              id: plan.id,
              name: plan.name,
              type: 'plan',
              subtitle: `R$ ${plan.monthlyValue}/mês`,
            });
          });

        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setShowResults(false);
    setSearchTerm('');
    switch (result.type) {
      case 'student':
        router.push(`/alunos/${result.id}`);
        break;
      case 'class':
        router.push(`/turmas/${result.id}`);
        break;
      case 'plan':
        router.push(`/planos/${result.id}`);
        break;
    }
  }, [router]);

  const handleClickAway = useCallback(() => {
    setShowResults(false);
  }, []);

  // Mobile search handlers
  const handleMobileSearchOpen = useCallback(() => {
    setMobileSearchOpen(true);
  }, []);

  const handleMobileSearchClose = useCallback(() => {
    setMobileSearchOpen(false);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  }, []);

  const handleMobileResultClick = useCallback((result: SearchResult) => {
    handleMobileSearchClose();
    switch (result.type) {
      case 'student':
        router.push(`/alunos/${result.id}`);
        break;
      case 'class':
        router.push(`/turmas/${result.id}`);
        break;
      case 'plan':
        router.push(`/planos/${result.id}`);
        break;
    }
  }, [router, handleMobileSearchClose]);

  const getResultIcon = (type: SearchResultType) => {
    switch (type) {
      case 'student':
        return <User size={16} />;
      case 'class':
        return <GraduationCap size={16} />;
      case 'plan':
        return <CreditCard size={16} />;
    }
  };

  const getResultTypeLabel = (type: SearchResultType) => {
    switch (type) {
      case 'student':
        return 'Aluno';
      case 'class':
        return 'Turma';
      case 'plan':
        return 'Plano';
    }
  };

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
    router.push('/configuracoes');
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
        {/* Logo on Mobile (replaces menu button since we have BottomNav) */}
        {isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                minWidth: 32,
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <Image
                src="/logo_conteudo.png"
                alt="T23"
                fill
                style={{ objectFit: 'cover' }}
              />
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              T23 JJ - Vamos avante, ombro a ombro
            </Typography>
          </Box>
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
        <ClickAwayListener onClickAway={handleClickAway}>
          <Box
            ref={searchContainerRef}
            sx={{
              flex: 1,
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              maxWidth: { sm: 280, md: 400 },
              mx: { sm: 1, md: 2 },
              position: 'relative',
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
              {isSearching ? (
                <CircularProgress size={18} sx={{ color: 'text.secondary' }} />
              ) : (
                <Search size={18} style={{ color: theme.palette.text.secondary }} />
              )}
              <InputBase
                ref={searchInputRef}
                placeholder="Buscar aluno"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
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

            {/* Search Results Dropdown */}
            <Popper
              open={showResults}
              anchorEl={searchContainerRef.current}
              placement="bottom-start"
              style={{ zIndex: theme.zIndex.modal + 1, width: searchContainerRef.current?.offsetWidth }}
            >
              <Paper
                elevation={8}
                sx={{
                  mt: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  borderRadius: 2,
                }}
              >
                {searchResults.length === 0 && !isSearching ? (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum resultado encontrado
                    </Typography>
                  </Box>
                ) : (
                  searchResults.map((result) => (
                    <MenuItem
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                        {getResultIcon(result.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={result.name}
                        secondary={result.subtitle}
                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          ml: 1,
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          fontWeight: 500,
                        }}
                      >
                        {getResultTypeLabel(result.type)}
                      </Typography>
                    </MenuItem>
                  ))
                )}
              </Paper>
            </Popper>
          </Box>
        </ClickAwayListener>

        {/* Spacer + Academy Label + Spacer - Only on Desktop */}
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />
        <Typography
          sx={{
            display: { xs: 'none', md: 'block' },
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '1.1rem',
            whiteSpace: 'nowrap',
          }}
        >
          Tropa Jiu-Jitsu - Vamos avante, ombro a ombro
        </Typography>
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />

        {/* Mobile Search Icon - Only on xs */}
        <IconButton
          onClick={handleMobileSearchOpen}
          sx={{
            display: { xs: 'flex', sm: 'none' },
            color: 'text.primary',
          }}
        >
          <Search size={20} />
        </IconButton>

        {/* Spacer - Only on Mobile/Tablet */}
        <Box sx={{ flex: 1, display: { xs: 'block', md: 'none' } }} />

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

      {/* Mobile Search Dialog */}
      <Dialog
        fullScreen
        open={mobileSearchOpen}
        onClose={handleMobileSearchClose}
        TransitionComponent={SlideTransition}
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'background.default',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Search Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <IconButton onClick={handleMobileSearchClose} sx={{ color: 'text.primary' }}>
              <ArrowLeft size={22} />
            </IconButton>
            <TextField
              autoFocus
              fullWidth
              placeholder="Buscar aluno"
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  '& fieldset': {
                    border: 'none',
                  },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      {isSearching ? (
                        <CircularProgress size={18} sx={{ color: 'text.secondary' }} />
                      ) : (
                        <Search size={18} style={{ color: theme.palette.text.secondary }} />
                      )}
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchTerm('');
                          setSearchResults([]);
                        }}
                      >
                        <X size={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Search Results */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {searchTerm && searchResults.length === 0 && !isSearching ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum resultado para &quot;{searchTerm}&quot;
                </Typography>
              </Box>
            ) : (
              searchResults.map((result) => (
                <Paper
                  key={`mobile-${result.type}-${result.id}`}
                  onClick={() => handleMobileResultClick(result)}
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    mb: 1,
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.15s ease',
                    '&:active': {
                      transform: 'scale(0.98)',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    }}
                  >
                    {getResultIcon(result.type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      fontWeight={500}
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {result.name}
                    </Typography>
                    {result.subtitle && (
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
                        {result.subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {getResultTypeLabel(result.type)}
                  </Typography>
                </Paper>
              ))
            )}

            {/* Empty state when no search */}
            {!searchTerm && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Search size={48} style={{ color: theme.palette.text.disabled, marginBottom: 16 }} />
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  O que você procura?
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                  Busque por alunos, turmas ou planos
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Dialog>
    </AppBar>
  );
}

export default TopBar;
