import { Box, Skeleton, Grid } from '@mui/material';

export default function DashboardLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={280} height={24} sx={{ mb: 3 }} />

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>

      {/* Quick actions */}
      <Skeleton variant="text" width={140} height={28} sx={{ mb: 1.5 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" width={120} height={80} sx={{ borderRadius: 2 }} />
        ))}
      </Box>

      {/* Charts / content */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
    </Box>
  );
}
