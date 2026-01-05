'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { useFinancial, useSwipeNavigation } from '@/hooks';

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
export function AppLayout({ children, title }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerToggle}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Fix for flexbox overflow
          width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`,
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
            p: { xs: 2, sm: 3 },
            mt: '64px', // TopBar height
            // Add padding-bottom for mobile BottomNav (56px + safe area)
            pb: { xs: 'calc(72px + env(safe-area-inset-bottom))', md: 0 },
            bgcolor: 'background.default',
            overflow: 'auto',
            // Swipe visual feedback
            transform: isSwiping ? `translateX(${swipeOffset * 0.3}px)` : 'none',
            transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
            touchAction: 'pan-y', // Allow vertical scrolling, handle horizontal
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
