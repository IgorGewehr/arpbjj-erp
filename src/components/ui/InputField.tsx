'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  TextFieldProps,
  InputAdornment,
} from '@mui/material';
import { LucideIcon, Check, AlertCircle } from 'lucide-react';

// ============================================
// Types
// ============================================
interface InputFieldProps extends Omit<TextFieldProps, 'variant'> {
  /** Icon to show at the start of the input */
  startIcon?: LucideIcon;
  /** Icon to show at the end of the input */
  endIcon?: LucideIcon;
  /** Show success state with checkmark */
  success?: boolean;
  /** Custom helper text for success state */
  successText?: string;
  /** Format function for input value */
  formatValue?: (value: string) => string;
}

// ============================================
// InputField Component
// ============================================
export function InputField({
  startIcon: StartIcon,
  endIcon: EndIcon,
  success = false,
  successText,
  formatValue,
  error,
  helperText,
  onChange,
  onFocus,
  onBlur,
  sx,
  ...props
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Handle focus
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  // Handle blur
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  // Handle change with formatting
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (formatValue) {
        const formatted = formatValue(e.target.value);
        e.target.value = formatted;
      }
      onChange?.(e);
    },
    [onChange, formatValue]
  );

  // Determine visual state
  const hasError = Boolean(error);
  const hasSuccess = success && !hasError;

  // Build start adornment
  const startAdornment = StartIcon ? (
    <InputAdornment position="start">
      <StartIcon
        size={18}
        color={hasError ? '#DC2626' : hasSuccess ? '#10B981' : isFocused ? '#171717' : '#9CA3AF'}
        style={{ transition: 'color 0.2s ease' }}
      />
    </InputAdornment>
  ) : undefined;

  // Build end adornment
  const endAdornment = (
    <>
      {hasError && (
        <InputAdornment position="end">
          <AlertCircle size={18} color="#DC2626" />
        </InputAdornment>
      )}
      {hasSuccess && (
        <InputAdornment position="end">
          <Check size={18} color="#10B981" />
        </InputAdornment>
      )}
      {EndIcon && !hasError && !hasSuccess && (
        <InputAdornment position="end">
          <EndIcon size={18} color={isFocused ? '#171717' : '#9CA3AF'} />
        </InputAdornment>
      )}
    </>
  );

  // Determine helper text
  const displayHelperText = hasSuccess && successText ? successText : helperText;

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <TextField
        variant="outlined"
        error={hasError}
        helperText={displayHelperText}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        InputProps={{
          startAdornment,
          endAdornment,
        }}
        FormHelperTextProps={{
          sx: {
            mx: 0.5,
            mt: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: hasError ? 'error.main' : hasSuccess ? '#10B981' : 'text.secondary',
            transition: 'color 0.2s ease',
          },
        }}
        sx={{
          width: '100%',
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            transition: 'all 0.2s ease',
            bgcolor: hasError ? 'rgba(220, 38, 38, 0.02)' : hasSuccess ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
            '& fieldset': {
              borderColor: hasError ? 'error.main' : hasSuccess ? '#10B981' : 'grey.300',
              borderWidth: 1,
              transition: 'all 0.2s ease',
            },
            '&:hover fieldset': {
              borderColor: hasError ? 'error.main' : hasSuccess ? '#10B981' : '#171717',
            },
            '&.Mui-focused fieldset': {
              borderColor: hasError ? 'error.main' : hasSuccess ? '#10B981' : '#171717',
              borderWidth: 2,
            },
            '&.Mui-focused': {
              boxShadow: hasError
                ? '0 0 0 3px rgba(220, 38, 38, 0.1)'
                : hasSuccess
                ? '0 0 0 3px rgba(16, 185, 129, 0.1)'
                : '0 0 0 3px rgba(0, 0, 0, 0.05)',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'text.secondary',
            '&.Mui-focused': {
              color: hasError ? 'error.main' : hasSuccess ? '#10B981' : '#171717',
            },
            '&.Mui-error': {
              color: 'error.main',
            },
          },
          '& .MuiInputBase-input': {
            py: 1.25,
            fontSize: '0.95rem',
          },
        }}
        {...props}
      />
    </Box>
  );
}

// ============================================
// Specialized Input Components
// ============================================

// Phone Input with auto-formatting
export function PhoneInput(props: Omit<InputFieldProps, 'formatValue'>) {
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  return (
    <InputField
      {...props}
      formatValue={formatPhone}
      placeholder="(00) 00000-0000"
    />
  );
}

// CPF Input with auto-formatting
export function CPFInput(props: Omit<InputFieldProps, 'formatValue'>) {
  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
  };

  return (
    <InputField
      {...props}
      formatValue={formatCPF}
      placeholder="000.000.000-00"
    />
  );
}

// CEP Input with auto-formatting
export function CEPInput(props: Omit<InputFieldProps, 'formatValue'>) {
  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
  };

  return (
    <InputField
      {...props}
      formatValue={formatCEP}
      placeholder="00000-000"
    />
  );
}

export default InputField;
