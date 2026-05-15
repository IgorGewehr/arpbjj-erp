'use client';

import { useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Box, LinearProgress, useTheme, useMediaQuery } from '@mui/material';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { PageTransition } from '@/components/ui/PageTransition';
import { useFinancial, useSwipeNavigation } from '@/hooks';
import { useAcademy } from '@/contexts/AcademyContext';

// ============================================
// Constants
// ============================================
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

// ============================================
// Props Interface
// ============================================
interface AppLayoutProps {
  children: ReactNode;
}

// ============================================
// AppLayout Component
// ============================================
// Get initial collapsed state from localStorage (SSR-safe)
function getInitialCollapsedState(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  return saved === 'true';
}

export function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsedState);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const pushStatePatched = useRef(false);

  // Get academy settings for branding
  const { academy } = useAcademy();

  // Intercept history.pushState to detect navigation start
  useEffect(() => {
    if (pushStatePatched.current) return;
    pushStatePatched.current = true;

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args: Parameters<typeof window.history.pushState>) {
      setIsNavigating(true);
      return originalPushState.apply(window.history, args);
    };

    return () => {
      window.history.pushState = originalPushState;
      pushStatePatched.current = false;
    };
  }, []);

  // Hide progress bar when navigation completes (pathname changed)
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Get overdue payments count for BottomNav badge
  const { overduePayments } = useFinancial();

  // Swipe navigation for mobile
  const { handlers: swipeHandlers, swipeOffset, isSwiping } = useSwipeNavigation({
    enabled: isMobile,
    threshold: 80,
  });

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleSidebarCollapseToggle = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Current sidebar width based on collapsed state
  const currentSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Global Navigation Progress Bar */}
      <LinearProgress
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.tooltip + 1,
          height: 3,
          opacity: isNavigating ? 1 : 0,
          transition: 'opacity 0.25s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerToggle}
        collapsed={sidebarCollapsed}
        onCollapseToggle={handleSidebarCollapseToggle}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Fix for flexbox overflow
          width: isMobile ? '100%' : `calc(100% - ${currentSidebarWidth}px)`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* TopBar */}
        <TopBar
          onMenuClick={handleDrawerToggle}
          sidebarWidth={isMobile ? 0 : currentSidebarWidth}
        />

        {/* Page Content */}
        <Box
          {...(isMobile ? swipeHandlers : {})}
          sx={{
            flex: 1,
            // TopBar height + iOS notch inset on Capacitor builds (no-op on web)
            mt: 'calc(64px + env(safe-area-inset-top, 0px))',
            // Add padding-bottom for mobile BottomNav (56px + safe area)
            pb: { xs: 'calc(72px + env(safe-area-inset-bottom))', md: 0 },
            bgcolor: 'background.default',
            overflow: 'auto',
            // Swipe visual feedback
            transform: isSwiping ? `translateX(${swipeOffset * 0.3}px)` : 'none',
            transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
            touchAction: 'pan-y', // Allow vertical scrolling, handle horizontal
            // Custom background from academy settings
            ...(academy?.adminBackgroundUrl && {
              backgroundImage: `linear-gradient(rgba(250,250,250,0.9), rgba(250,250,250,0.9)), url(${academy.adminBackgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }),
          }}
        >
          <PageTransition>{children}</PageTransition>
        </Box>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <MobileBottomNav overdueCount={overduePayments.length} />
        )}
      </Box>
    </Box>
  );
}

export default AppLayout;
