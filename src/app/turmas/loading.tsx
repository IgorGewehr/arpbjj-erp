import { Box, Skeleton, Grid } from '@mui/material';

export default function TurmasLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Skeleton variant="text" width={100} height={40} />
          <Skeleton variant="text" width={220} height={24} sx={{ mt: 0.5 }} />
        </Box>
        <Skeleton variant="rounded" width={130} height={36} sx={{ borderRadius: 2 }} />
      </Box>

      {/* Cards */}
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
