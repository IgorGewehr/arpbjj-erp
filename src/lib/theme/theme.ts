'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';

// ============================================
// MarcusJJ Theme - Jiu-Jitsu Belt Colors
// ============================================

// Belt Colors (Brazilian Jiu-Jitsu)
export const beltColors = {
  white: '#F5F5F5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
  // Kids Belts
  grey: '#6B7280',
  yellow: '#EAB308',
  orange: '#EA580C',
  green: '#16A34A',
};

// Core Palette
const palette = {
  primary: {
    main: '#171717',      // Black belt color - main brand
    light: '#404040',
    dark: '#0A0A0A',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#1E40AF',      // Blue belt - secondary accent
    light: '#3B82F6',
    dark: '#1E3A8A',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#16A34A',
    light: '#22C55E',
    dark: '#15803D',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#EAB308',
    light: '#FACC15',
    dark: '#CA8A04',
    contrastText: '#000000',
  },
  error: {
    main: '#DC2626',
    light: '#EF4444',
    dark: '#B91C1C',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#0891B2',
    light: '#06B6D4',
    dark: '#0E7490',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#171717',
    secondary: '#525252',
    disabled: '#A3A3A3',
  },
  divider: '#E5E5E5',
};

// Dark Mode Palette
const darkPalette = {
  primary: {
    main: '#FFFFFF',
    light: '#F5F5F5',
    dark: '#E5E5E5',
    contrastText: '#171717',
  },
  secondary: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#1E40AF',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#22C55E',
    light: '#4ADE80',
    dark: '#16A34A',
    contrastText: '#000000',
  },
  warning: {
    main: '#FACC15',
    light: '#FDE047',
    dark: '#EAB308',
    contrastText: '#000000',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#06B6D4',
    light: '#22D3EE',
    dark: '#0891B2',
    contrastText: '#000000',
  },
  background: {
    default: '#0A0A0A',
    paper: '#171717',
  },
  text: {
    primary: '#FAFAFA',
    secondary: '#A3A3A3',
    disabled: '#525252',
  },
  divider: '#404040',
};

// Typography
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '1.875rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none' as const,
    letterSpacing: '0.01em',
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.5,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
};

// Component Overrides
const components: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        padding: '10px 20px',
        fontWeight: 600,
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
      },
      outlined: {
        borderWidth: '2px',
        '&:hover': {
          borderWidth: '2px',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.06)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
      },
      elevation1: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '6px',
        fontWeight: 500,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: '16px',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: 0,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid',
        borderColor: 'inherit',
      },
      head: {
        fontWeight: 600,
        backgroundColor: 'inherit',
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: '6px',
        fontSize: '0.75rem',
      },
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiSnackbarContent-root': {
          borderRadius: '8px',
        },
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: '4px',
      },
    },
  },
  MuiSkeleton: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
      },
    },
  },
};

// Shape
const shape = {
  borderRadius: 8,
};

// Breakpoints (optimized for desktop 14"-25")
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
};

// Create Light Theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...palette,
  },
  typography,
  components,
  shape,
  breakpoints,
});

// Create Dark Theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
  typography,
  components: {
    ...components,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.08)',
        },
      },
    },
  },
  shape,
  breakpoints,
});

// Export helper function to get belt color
export const getBeltColor = (belt: string): string => {
  return beltColors[belt as keyof typeof beltColors] || beltColors.white;
};

// Export belt color for chip/badge background with contrast
export const getBeltChipColor = (belt: string): { bg: string; text: string } => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    white: { bg: '#F5F5F5', text: '#171717' },
    blue: { bg: '#1E40AF', text: '#FFFFFF' },
    purple: { bg: '#7C3AED', text: '#FFFFFF' },
    brown: { bg: '#78350F', text: '#FFFFFF' },
    black: { bg: '#171717', text: '#FFFFFF' },
    grey: { bg: '#6B7280', text: '#FFFFFF' },
    yellow: { bg: '#EAB308', text: '#171717' },
    orange: { bg: '#EA580C', text: '#FFFFFF' },
    green: { bg: '#16A34A', text: '#FFFFFF' },
  };
  return colorMap[belt] || colorMap.white;
};

export default lightTheme;
