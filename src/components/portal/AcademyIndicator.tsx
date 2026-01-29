'use client';

import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { Building2, ArrowRightLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAcademy } from '@/contexts/AcademyContext';

interface AcademyIndicatorProps {
  /** Icon to display (defaults to Building2) */
  icon?: React.ReactNode;
  /** Label prefix (e.g., "Pagamentos de", "Horarios de") */
  label?: string;
}

/**
 * Academy indicator component for portal pages.
 * Shows current academy context for multi-academy users with switch option.
 * Returns null if user has only one academy.
 */
export function AcademyIndicator({ icon, label = 'Academia' }: AcademyIndicatorProps) {
  const theme = useTheme();
  const router = useRouter();
  const { academy, hasMultipleAcademies } = useAcademy();

  // Only show if user has multiple academies
  if (!hasMultipleAcademies || !academy) {
    return null;
  }

  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.2),
      }}
    >
      <Box
        sx={{
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {icon || <Building2 size={16} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'primary.main',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {academy.name}
        </Typography>
      </Box>
      <Button
        size="small"
        startIcon={<ArrowRightLeft size={14} />}
        onClick={() => router.push('/portal/academias')}
        sx={{
          color: 'primary.main',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'none',
          px: 1.5,
          py: 0.5,
          minWidth: 'auto',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        Trocar
      </Button>
    </Box>
  );
}

export default AcademyIndicator;
