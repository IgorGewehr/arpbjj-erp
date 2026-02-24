import { Box, Skeleton, Grid } from '@mui/material';

export default function CompeticoesLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Skeleton variant="text" width={140} height={40} />
          <Skeleton variant="text" width={220} height={24} sx={{ mt: 0.5 }} />
        </Box>
        <Skeleton variant="rounded" width={150} height={36} sx={{ borderRadius: 2 }} />
      </Box>

      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6 }}>
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
