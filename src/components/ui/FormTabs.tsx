'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { LucideIcon, AlertCircle } from 'lucide-react';

// ============================================
// Types
// ============================================
interface FormTab {
  /** Unique key for the tab */
  key: string;
  /** Tab label */
  label: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Whether this tab has incomplete required fields */
  hasErrors?: boolean;
}

interface FormTabsProps {
  /** Array of tab configurations */
  tabs: FormTab[];
  /** Currently active tab key */
  activeTab: string;
  /** Callback when tab changes */
  onTabChange: (tabKey: string) => void;
  /** Overall form completion percentage (0-100) */
  progress?: number;
  /** Whether to show progress bar */
  showProgress?: boolean;
  /** Children content for each tab (use FormTabPanel) */
  children: ReactNode;
}

interface FormTabPanelProps {
  /** Tab key this panel belongs to */
  tabKey: string;
  /** Currently active tab */
  activeTab: string;
  /** Panel content */
  children: ReactNode;
}

// ============================================
// FormTabs Component
// ============================================
export function FormTabs({
  tabs,
  activeTab,
  onTabChange,
  progress = 0,
  showProgress = true,
  children,
}: FormTabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update indicator position when active tab changes
  useEffect(() => {
    if (tabsRef.current) {
      const activeIndex = tabs.findIndex(t => t.key === activeTab);
      const tabElements = tabsRef.current.querySelectorAll('[data-tab]');
      const activeElement = tabElements[activeIndex] as HTMLElement;

      if (activeElement) {
        setIndicatorStyle({
          left: activeElement.offsetLeft,
          width: activeElement.offsetWidth,
        });
      }
    }
  }, [activeTab, tabs]);

  return (
    <Box>
      {/* Progress Bar */}
      {showProgress && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Progresso do formulário
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: progress === 100 ? '#10B981' : '#171717',
                transition: 'transform 0.4s ease, background-color 0.3s ease',
              },
            }}
          />
        </Box>
      )}

      {/* Tabs Container */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          mb: 3,
          position: 'relative',
        }}
      >
        {/* Tabs */}
        <Box
          ref={tabsRef}
          sx={{
            display: 'flex',
            gap: { xs: 0, sm: 1 },
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            pb: 0.5,
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            const Icon = tab.icon;

            return (
              <Box
                key={tab.key}
                data-tab={tab.key}
                onClick={() => onTabChange(tab.key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: { xs: 2, sm: 2.5 },
                  py: 1.5,
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  flexShrink: 0,
                  bgcolor: isActive ? 'transparent' : 'transparent',
                  '&:hover': {
                    bgcolor: isActive ? 'transparent' : 'grey.50',
                  },
                }}
              >
                {/* Icon */}
                {Icon && (
                  <Icon
                    size={18}
                    color={isActive ? '#171717' : '#9CA3AF'}
                    style={{ transition: 'color 0.2s ease' }}
                  />
                )}

                {/* Label */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </Typography>

                {/* Error indicator */}
                {tab.hasErrors && (
                  <AlertCircle
                    size={14}
                    color="#DC2626"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Active Tab Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            height: 2,
            bgcolor: '#171717',
            borderRadius: 1,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </Box>

      {/* Tab Content */}
      <Box>{children}</Box>
    </Box>
  );
}

// ============================================
// FormTabPanel Component
// ============================================
export function FormTabPanel({ tabKey, activeTab, children }: FormTabPanelProps) {
  const isActive = tabKey === activeTab;

  if (!isActive) return null;

  return (
    <Box
      role="tabpanel"
      sx={{
        animation: 'fadeIn 0.3s ease',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {children}
    </Box>
  );
}

export default FormTabs;
