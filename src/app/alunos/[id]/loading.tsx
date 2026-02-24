import { Box, Skeleton, Paper, Grid } from '@mui/material';

// Shown by Next.js App Router immediately during navigation to /alunos/[id]
export default function StudentProfileLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Back button */}
      <Skeleton variant="rounded" width={120} height={36} sx={{ mb: 3, borderRadius: 2 }} />

      <Grid container spacing={3}>
        {/* Left column — profile card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            {/* Avatar */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Skeleton variant="circular" width={96} height={96} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={160} height={32} />
              <Skeleton variant="text" width={120} height={20} sx={{ mt: 0.5 }} />
            </Box>

            {/* Belt display */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: 1 }} />
            </Box>

            {/* Info rows */}
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Skeleton variant="text" width={80} height={20} />
                <Skeleton variant="text" width={120} height={20} />
              </Box>
            ))}

            {/* Buttons */}
            <Skeleton variant="rounded" height={36} sx={{ mt: 2, borderRadius: 2 }} />
            <Skeleton variant="rounded" height={36} sx={{ mt: 1, borderRadius: 2 }} />
          </Paper>
        </Grid>

        {/* Right column — tabs content */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ borderRadius: 3 }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, py: 1.5 }}>
                {[120, 100, 90, 80, 100].map((w, i) => (
                  <Skeleton key={i} variant="rounded" width={w} height={32} sx={{ borderRadius: 1 }} />
                ))}
              </Box>
            </Box>

            {/* Tab content */}
            <Box sx={{ p: 3 }}>
              {/* Stats row */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ flex: 1 }}>
                    <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
                  </Box>
                ))}
              </Box>

              {/* Content rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Skeleton variant="text" width={180} height={20} />
                    <Skeleton variant="text" width={120} height={16} sx={{ mt: 0.5 }} />
                  </Box>
                  <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 1 }} />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
