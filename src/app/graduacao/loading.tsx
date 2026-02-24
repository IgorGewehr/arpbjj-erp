import { Box, Skeleton, Grid } from '@mui/material';

export default function GraduacaoLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Skeleton variant="text" width={140} height={40} />
          <Skeleton variant="text" width={240} height={24} sx={{ mt: 0.5 }} />
        </Box>
      </Box>

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {[80, 80, 80, 90, 80].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={32} sx={{ borderRadius: 4 }} />
        ))}
      </Box>

      {/* Eligible students */}
      <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
