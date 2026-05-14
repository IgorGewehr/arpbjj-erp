'use client';

import { ReactNode } from 'react';
import { Box, Typography, Stack, useTheme, alpha } from '@mui/material';
import { AcademySwitcher } from './AcademySwitcher';
import { useAcademy } from '@/contexts/AcademyContext';

interface AcademyPageHeaderProps {
  /** Main page title (e.g. "Alunos", "Financeiro", "Equipe") */
  title: string;
  /** Short page description rendered under the title */
  description?: string;
  /** Optional leading icon (lucide-react node) */
  icon?: ReactNode;
  /** Right-side action buttons (e.g. "Adicionar aluno") */
  actions?: ReactNode;
}

/**
 * Standard page header that always shows which academy is being viewed and,
 * when the admin has 2+ academies, lets them switch directly from the page.
 * Use at the top of any admin page that scopes its data to the current
 * academy (Alunos, Financeiro, Equipe, etc).
 *
 * For single-academy users it still renders the academy name as a subtle
 * chip — gives consistent context, but stays out of the way.
 */
export function AcademyPageHeader({
  title,
  description,
  icon,
  actions,
}: AcademyPageHeaderProps) {
  const theme = useTheme();
  const { academy, hasMultipleAcademies } = useAcademy();

  return (
    <Box
      sx={{
        mb: 3,
        pb: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        gap={2}
      >
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700} noWrap>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          gap={1.5}
          sx={{ flexWrap: 'wrap' }}
        >
          {hasMultipleAcademies ? (
            <AcademySwitcher variant="compact" />
          ) : academy ? (
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {academy.name}
            </Box>
          ) : null}
          {actions}
        </Stack>
      </Stack>
    </Box>
  );
}
