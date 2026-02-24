import { Box, Skeleton, Grid } from '@mui/material';

export default function FinanceiroLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="text" width={160} height={40} />
        <Skeleton variant="rounded" width={160} height={36} sx={{ borderRadius: 2 }} />
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {[100, 80, 90].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={36} sx={{ borderRadius: 1 }} />
        ))}
      </Box>

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>

      {/* Payment list */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2, mb: 1.5 }} />
      ))}
    </Box>
  );
}
