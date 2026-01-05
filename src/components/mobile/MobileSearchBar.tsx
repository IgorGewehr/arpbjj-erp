'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { Box, InputBase, IconButton, Chip, Typography, Paper } from '@mui/material';
import { Search, X, Clock, ArrowLeft } from 'lucide-react';

// ============================================
// MobileSearchBar Component
// ============================================
interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  recentSearches?: string[];
  onRecentSearchClick?: (search: string) => void;
  onClearRecent?: () => void;
  filters?: FilterChip[];
  activeFilters?: string[];
  onFilterToggle?: (filterId: string) => void;
  autoFocus?: boolean;
  expandable?: boolean;
}

interface FilterChip {
  id: string;
  label: string;
  icon?: React.ElementType;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  onFocus,
  onBlur,
  recentSearches = [],
  onRecentSearchClick,
  onClearRecent,
  filters = [],
  activeFilters = [],
  onFilterToggle,
  autoFocus = false,
  expandable = true,
}: MobileSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!expandable);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (expandable) setIsExpanded(true);
    onFocus?.();
  }, [expandable, onFocus]);

  const handleBlur = useCallback(() => {
    // Delay to allow click events on suggestions
    setTimeout(() => {
      setIsFocused(false);
      if (expandable && !value) setIsExpanded(false);
      onBlur?.();
    }, 150);
  }, [expandable, value, onBlur]);

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleCancel = useCallback(() => {
    onChange('');
    setIsFocused(false);
    setIsExpanded(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleRecentClick = useCallback((search: string) => {
    onChange(search);
    onRecentSearchClick?.(search);
    inputRef.current?.blur();
  }, [onChange, onRecentSearchClick]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Expandable collapsed state
  if (expandable && !isExpanded) {
    return (
      <Box
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          bgcolor: 'grey.100',
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        <Search size={20} color="#666" />
        <Typography variant="body2" color="text.secondary">
          {placeholder}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Search Input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          bgcolor: isFocused ? '#fff' : 'grey.100',
          borderRadius: 2,
          border: '1px solid',
          borderColor: isFocused ? 'primary.main' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        {expandable && isFocused ? (
          <IconButton size="small" onClick={handleCancel} sx={{ p: 0.5 }}>
            <ArrowLeft size={20} color="#666" />
          </IconButton>
        ) : (
          <Search size={20} color="#666" style={{ marginLeft: 4 }} />
        )}

        <InputBase
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          sx={{
            flex: 1,
            fontSize: '0.95rem',
            '& input': {
              p: 0,
            },
          }}
        />

        {value && (
          <IconButton size="small" onClick={handleClear} sx={{ p: 0.5 }}>
            <X size={18} color="#999" />
          </IconButton>
        )}
      </Box>

      {/* Filter Chips */}
      {filters.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mt: 1.5,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {filters.map((filter) => {
            const isActive = activeFilters.includes(filter.id);
            const Icon = filter.icon;

            return (
              <Chip
                key={filter.id}
                label={filter.label}
                icon={Icon ? <Icon size={14} /> : undefined}
                onClick={() => onFilterToggle?.(filter.id)}
                sx={{
                  bgcolor: isActive ? '#111' : '#fff',
                  color: isActive ? '#fff' : 'text.primary',
                  border: '1px solid',
                  borderColor: isActive ? '#111' : 'grey.300',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  height: 32,
                  '&:hover': {
                    bgcolor: isActive ? '#222' : 'grey.50',
                  },
                  '& .MuiChip-icon': {
                    color: isActive ? '#fff' : 'text.secondary',
                  },
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Recent Searches Dropdown */}
      {isFocused && !value && recentSearches.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            borderRadius: 2,
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
            }}
          >
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Buscas recentes
            </Typography>
            {onClearRecent && (
              <Typography
                variant="caption"
                color="primary"
                onClick={onClearRecent}
                sx={{ cursor: 'pointer', fontWeight: 500 }}
              >
                Limpar
              </Typography>
            )}
          </Box>

          {recentSearches.slice(0, 5).map((search, index) => (
            <Box
              key={index}
              onClick={() => handleRecentClick(search)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'grey.50' },
                '&:active': { bgcolor: 'grey.100' },
              }}
            >
              <Clock size={16} color="#999" />
              <Typography variant="body2">{search}</Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

// ============================================
// SimpleSearchBar Component (non-expandable)
// ============================================
interface SimpleSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SimpleSearchBar({ value, onChange, placeholder = 'Buscar...' }: SimpleSearchBarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        bgcolor: 'grey.100',
        borderRadius: 2,
      }}
    >
      <Search size={18} color="#666" />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{
          flex: 1,
          fontSize: '0.9rem',
          '& input': { p: 0 },
        }}
      />
      {value && (
        <IconButton size="small" onClick={() => onChange('')} sx={{ p: 0.5 }}>
          <X size={16} color="#999" />
        </IconButton>
      )}
    </Box>
  );
}

// ============================================
// Exports
// ============================================
export default MobileSearchBar;
