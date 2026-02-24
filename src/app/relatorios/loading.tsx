import { Box, Skeleton, Grid } from '@mui/material';

export default function RelatoriosLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Skeleton variant="text" width={120} height={40} sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3, mb: 3 }} />
          <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3, mb: 2 }} />
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
        </Grid>
      </Grid>
    </Box>
  );
}
