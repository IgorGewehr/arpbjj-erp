'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
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
  title?: string;
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

export function AppLayout({ children, title }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsedState);

  // Get academy settings for branding
  const { academy } = useAcademy();

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
          title={title}
        />

        {/* Page Content */}
        <Box
          {...(isMobile ? swipeHandlers : {})}
          sx={{
            flex: 1,
            mt: '64px', // TopBar height
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
          {children}
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
