'use client';

import { Box, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';

// ============================================
// Props Interface
// ============================================
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

// ============================================
// StatCard Component
// ============================================
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
}: StatCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        height: '100%',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-2px)' },
          boxShadow: { xs: 'inherit', sm: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={500}
            gutterBottom
            sx={{
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              color: '#1a1a1a',
              mb: 0.5,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
              lineHeight: 1.2,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: { xs: 1, sm: 1.5 },
            borderRadius: 2.5,
            bgcolor: bgColor,
            color,
            boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.06)',
            flexShrink: 0,
          }}
        >
          <Icon size={isMobile ? 18 : 24} />
        </Box>
      </Box>
    </Paper>
  );
}

export default StatCard;
