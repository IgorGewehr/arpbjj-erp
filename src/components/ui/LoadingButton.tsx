'use client';

import { forwardRef } from 'react';
import { Button, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';

export interface LoadingButtonProps extends ButtonProps {
  /** When true, swaps the start icon for a spinner and disables the button. */
  isLoading?: boolean;
  /** Optional label shown while `isLoading` is true. Defaults to children. */
  loadingText?: React.ReactNode;
  /** Spinner size in px. Default 16. */
  spinnerSize?: number;
}

/**
 * LoadingButton — MUI Button with an inline spinner instead of a full-screen
 * blocker. The button stays interactable layout-wise (same width) but is
 * `disabled` while loading.
 *
 * Replaces the recurring `{loading ? <CircularProgress /> : 'Salvar'}` pattern
 * across forms (login, criar-conta, criar-academia, configuracoes, etc.).
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    {
      isLoading = false,
      loadingText,
      spinnerSize = 16,
      children,
      disabled,
      startIcon,
      ...rest
    },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        {...rest}
        disabled={isLoading || disabled}
        startIcon={
          isLoading ? (
            <CircularProgress size={spinnerSize} color="inherit" thickness={5} />
          ) : (
            startIcon
          )
        }
      >
        {isLoading ? (loadingText ?? children) : children}
      </Button>
    );
  },
);
