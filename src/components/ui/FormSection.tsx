'use client';

import { ReactNode, useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import { LucideIcon, ChevronDown } from 'lucide-react';

// ============================================
// FormSection Component
// ============================================
interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Section content */
  children: ReactNode;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state (only for collapsible) */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Optional badge (e.g., "Obrigatório", "Opcional") */
  badge?: string;
  /** Badge color variant */
  badgeVariant?: 'default' | 'warning' | 'success' | 'error';
  /** Whether to show as a card with border */
  variant?: 'default' | 'card' | 'outlined';
  /** Additional padding */
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function FormSection({
  title,
  subtitle,
  icon: Icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  badge,
  badgeVariant = 'default',
  variant = 'default',
  padding = 'medium',
}: FormSectionProps) {
  // Use internal state if not controlled
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = () => {
    const newState = !isCollapsed;
    setInternalCollapsed(newState);
    onCollapsedChange?.(newState);
  };

  // Badge colors
  const badgeColors = {
    default: { bg: 'grey.100', text: 'text.secondary' },
    warning: { bg: '#FEF3C7', text: '#92400E' },
    success: { bg: '#DCFCE7', text: '#166534' },
    error: { bg: '#FEE2E2', text: '#991B1B' },
  };

  // Padding values
  const paddingValues = {
    none: 0,
    small: 2,
    medium: 3,
    large: 4,
  };

  // Wrapper styles based on variant
  const wrapperSx = variant === 'card'
    ? { borderRadius: 2, border: '1px solid', borderColor: 'grey.200', overflow: 'hidden', bgcolor: '#fff' }
    : variant === 'outlined'
    ? { borderRadius: 2, border: '1px solid', borderColor: 'grey.100', bgcolor: 'transparent', overflow: 'hidden' }
    : {};

  return (
    <Box sx={wrapperSx}>
      {/* Header */}
      <Box
        onClick={collapsible ? handleToggle : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: variant !== 'default' ? paddingValues[padding] : 0,
          py: variant !== 'default' ? 2 : 0,
          mb: variant === 'default' ? 2 : 0,
          cursor: collapsible ? 'pointer' : 'default',
          bgcolor: variant !== 'default' ? 'grey.50' : 'transparent',
          borderBottom: variant !== 'default' && !isCollapsed ? '1px solid' : 'none',
          borderColor: 'grey.100',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            bgcolor: collapsible && variant !== 'default' ? 'grey.100' : undefined,
          },
        }}
      >
        {/* Icon */}
        {Icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color="#666" />
          </Box>
        )}

        {/* Title and Subtitle */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                fontSize: '0.95rem',
              }}
            >
              {title}
            </Typography>
            {badge && (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: badgeColors[badgeVariant].bg,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: badgeColors[badgeVariant].text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {badge}
                </Typography>
              </Box>
            )}
          </Box>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 0.25,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Collapse Icon */}
        {collapsible && (
          <ChevronDown
            size={18}
            color="#666"
            style={{
              transition: 'transform 0.2s ease',
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </Box>

      {/* Content */}
      {collapsible ? (
        <Collapse in={!isCollapsed}>
          <Box sx={{ p: variant !== 'default' ? paddingValues[padding] : 0 }}>
            {children}
          </Box>
        </Collapse>
      ) : (
        <Box sx={{ p: variant !== 'default' ? paddingValues[padding] : 0 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

// ============================================
// FormDivider Component
// ============================================
interface FormDividerProps {
  /** Optional label in the middle */
  label?: string;
  /** Margin top and bottom */
  spacing?: 'small' | 'medium' | 'large';
}

export function FormDivider({ label, spacing = 'medium' }: FormDividerProps) {
  const spacingValues = {
    small: 2,
    medium: 3,
    large: 4,
  };

  if (label) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          my: spacingValues[spacing],
        }}
      >
        <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.200' }} />
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontSize: '0.7rem',
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.200' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: 1,
        bgcolor: 'grey.200',
        my: spacingValues[spacing],
      }}
    />
  );
}

// ============================================
// FormRow Component (for inline fields)
// ============================================
interface FormRowProps {
  children: ReactNode;
  /** Gap between items */
  gap?: number;
  /** Alignment */
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
}

export function FormRow({ children, gap = 2, alignItems = 'flex-start' }: FormRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap,
        alignItems,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        '& > *': {
          flex: { xs: '1 1 100%', sm: '1 1 0' },
          minWidth: 0,
        },
      }}
    >
      {children}
    </Box>
  );
}

export default FormSection;
