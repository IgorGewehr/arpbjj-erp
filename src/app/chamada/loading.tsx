import { Box, Skeleton, Grid } from '@mui/material';

export default function ChamadaLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Skeleton variant="text" width={120} height={40} />
          <Skeleton variant="text" width={200} height={24} sx={{ mt: 0.5 }} />
        </Box>
        <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: 2 }} />
      </Box>

      {/* Class selector */}
      <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2, mb: 3 }} />

      {/* Student attendance grid */}
      <Grid container spacing={2}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
