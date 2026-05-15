'use client';

import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from '@/lib/theme';
import { ReactNode, useEffect } from 'react';
import { configureStatusBar } from '@/lib/capacitor';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Sync the native status bar with our app theme on Capacitor builds.
  // No-op on web (Capacitor.isNativePlatform() === false).
  useEffect(() => {
    const mode = lightTheme.palette.mode === 'dark' ? 'dark' : 'light';
    void configureStatusBar(mode);
  }, []);

  return (
    <MuiThemeProvider theme={lightTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
