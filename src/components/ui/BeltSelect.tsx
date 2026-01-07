'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  ClickAwayListener,
  Popper,
  Grow,
  InputAdornment,
  TextField,
  Divider,
} from '@mui/material';
import { ChevronDown, Search, Check } from 'lucide-react';
import { StudentCategory } from '@/types';
import {
  BeltOption,
  BELT_GROUP_LABELS,
  getBeltOptionsByCategory,
  getGroupedBeltOptions,
  getBeltColor,
  getBeltLabel,
  getStripeColor,
} from '@/lib/constants/belts';

// ============================================
// Mini Belt Display (for dropdown items)
// ============================================
interface MiniBeltProps {
  color: string;
  stripeColor?: 'white' | 'black' | null;
  size?: 'small' | 'medium';
}

function MiniBelt({ color, stripeColor, size = 'small' }: MiniBeltProps) {
  const dimensions = size === 'small' ? { width: 32, height: 10 } : { width: 48, height: 14 };
  const stripeHeight = size === 'small' ? 2 : 3;

  return (
    <Box
      sx={{
        width: dimensions.width,
        height: dimensions.height,
        borderRadius: 0.5,
        bgcolor: color,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        border: color === '#F5F5F5' ? '1px solid #E5E5E5' : 'none',
        flexShrink: 0,
      }}
    >
      {/* Stripe in the middle */}
      {stripeColor && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: stripeHeight,
            bgcolor: stripeColor === 'white' ? '#FFFFFF' : '#171717',
          }}
        />
      )}
      {/* Black tip */}
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: size === 'small' ? 8 : 12,
          bgcolor: '#171717',
        }}
      />
    </Box>
  );
}

// ============================================
// Belt Option Item (in dropdown)
// ============================================
interface BeltOptionItemProps {
  option: BeltOption;
  isSelected: boolean;
  onClick: () => void;
}

function BeltOptionItem({ option, isSelected, onClick }: BeltOptionItemProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        cursor: 'pointer',
        borderRadius: 1,
        bgcolor: isSelected ? 'grey.100' : 'transparent',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: isSelected ? 'grey.100' : 'grey.50',
        },
      }}
    >
      <MiniBelt
        color={option.color}
        stripeColor={option.stripeColor}
        size="small"
      />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          fontWeight: isSelected ? 600 : 400,
          color: 'text.primary',
        }}
      >
        {option.label}
      </Typography>
      {isSelected && (
        <Check size={16} color="#10B981" strokeWidth={2.5} />
      )}
    </Box>
  );
}

// ============================================
// Group Header (in dropdown)
// ============================================
interface GroupHeaderProps {
  label: string;
  isFirst?: boolean;
}

function GroupHeader({ label, isFirst }: GroupHeaderProps) {
  return (
    <>
      {!isFirst && <Divider sx={{ my: 1 }} />}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          px: 1.5,
          py: 0.75,
          color: 'text.secondary',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontSize: '0.65rem',
        }}
      >
        {label}
      </Typography>
    </>
  );
}

// ============================================
// Main BeltSelect Component
// ============================================
interface BeltSelectProps {
  value: string;
  onChange: (value: string) => void;
  category: StudentCategory;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  showSearch?: boolean;
}

export function BeltSelect({
  value,
  onChange,
  category,
  label = 'Faixa',
  error = false,
  helperText,
  disabled = false,
  size = 'medium',
  fullWidth = true,
  showSearch = true,
}: BeltSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const anchorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get options based on category
  const allOptions = getBeltOptionsByCategory(category);
  const groupedOptions = getGroupedBeltOptions(category);

  // Filter options by search term
  const filteredGroupedOptions = Object.entries(groupedOptions).reduce((acc, [group, options]) => {
    const filtered = options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {} as Record<string, BeltOption[]>);

  // Get current selection
  const selectedOption = allOptions.find(opt => opt.value === value);

  // Handle open
  const handleToggle = useCallback(() => {
    if (!disabled) {
      setOpen(prev => !prev);
    }
  }, [disabled]);

  // Handle close
  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchTerm('');
  }, []);

  // Handle select
  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    handleClose();
  }, [onChange, handleClose]);

  // Focus search on open
  useEffect(() => {
    if (open && showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open, showSearch]);

  // Get group order
  const groupOrder = category === 'kids'
    ? ['plain', 'white-stripe', 'black-stripe']
    : ['adult'];

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      {/* Trigger/Field */}
      <Box
        ref={anchorRef}
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: size === 'small' ? 1 : 1.25,
          border: '1px solid',
          borderColor: error ? 'error.main' : open ? '#171717' : 'grey.300',
          borderRadius: 1.5,
          bgcolor: disabled ? 'grey.100' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: open ? '0 0 0 3px rgba(0,0,0,0.05)' : 'none',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            borderColor: disabled ? 'grey.300' : error ? 'error.main' : '#171717',
          },
        }}
      >
        {/* Belt Preview */}
        {selectedOption ? (
          <MiniBelt
            color={selectedOption.color}
            stripeColor={selectedOption.stripeColor}
            size="medium"
          />
        ) : (
          <Box
            sx={{
              width: 48,
              height: 14,
              borderRadius: 0.5,
              bgcolor: 'grey.200',
              flexShrink: 0,
            }}
          />
        )}

        {/* Label and Value */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              fontSize: '0.7rem',
              lineHeight: 1,
              mb: 0.25,
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: selectedOption ? 'text.primary' : 'text.secondary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {selectedOption ? selectedOption.label : 'Selecionar'}
          </Typography>
        </Box>

        {/* Chevron */}
        <ChevronDown
          size={18}
          color="#666"
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Box>

      {/* Helper Text */}
      {helperText && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            ml: 1.5,
            color: error ? 'error.main' : 'text.secondary',
          }}
        >
          {helperText}
        </Typography>
      )}

      {/* Dropdown */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        transition
        style={{ zIndex: 1300 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 4],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'top left' }}>
            <Paper
              elevation={8}
              sx={{
                width: anchorRef.current?.offsetWidth || 280,
                maxHeight: 360,
                overflow: 'hidden',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  {/* Search Input */}
                  {showSearch && (
                    <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'grey.100' }}>
                      <TextField
                        inputRef={searchInputRef}
                        size="small"
                        placeholder="Buscar faixa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search size={16} color="#999" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            bgcolor: 'grey.50',
                            '& fieldset': {
                              border: 'none',
                            },
                          },
                          '& .MuiInputBase-input': {
                            py: 0.75,
                            fontSize: '0.875rem',
                          },
                        }}
                      />
                    </Box>
                  )}

                  {/* Options List */}
                  <Box
                    sx={{
                      maxHeight: showSearch ? 300 : 340,
                      overflowY: 'auto',
                      py: 0.5,
                    }}
                  >
                    {Object.keys(filteredGroupedOptions).length === 0 ? (
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: 'center',
                          py: 3,
                          color: 'text.secondary',
                        }}
                      >
                        Nenhuma faixa encontrada
                      </Typography>
                    ) : (
                      groupOrder.map((groupKey, groupIndex) => {
                        const options = filteredGroupedOptions[groupKey];
                        if (!options || options.length === 0) return null;

                        const groupLabel = BELT_GROUP_LABELS[groupKey as keyof typeof BELT_GROUP_LABELS];

                        return (
                          <Box key={groupKey}>
                            <GroupHeader
                              label={groupLabel}
                              isFirst={groupIndex === 0 || !groupOrder.slice(0, groupIndex).some(g => filteredGroupedOptions[g]?.length)}
                            />
                            {options.map(option => (
                              <BeltOptionItem
                                key={option.value}
                                option={option}
                                isSelected={option.value === value}
                                onClick={() => handleSelect(option.value)}
                              />
                            ))}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
}

export default BeltSelect;
