'use client';

import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from '@/lib/theme';
import { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <MuiThemeProvider theme={lightTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
