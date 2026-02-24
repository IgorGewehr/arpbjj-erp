import { Box, Skeleton, Grid } from '@mui/material';

export default function RetencaoLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />

      {/* Risk summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>

      {/* Student list */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2, mb: 1.5 }} />
      ))}
    </Box>
  );
}
