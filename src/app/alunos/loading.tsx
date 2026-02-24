import { Box, Skeleton } from '@mui/material';

export default function AlunosLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Skeleton variant="text" width={120} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />

      {/* Filters row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[180, 140, 140, 140, 140].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={40} sx={{ borderRadius: 1 }} />
        ))}
      </Box>

      {/* Student grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(auto-fill, minmax(140px, 1fr))',
            sm: 'repeat(auto-fill, minmax(200px, 1fr))',
            md: 'repeat(auto-fill, minmax(240px, 1fr))',
          },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={165} sx={{ borderRadius: 3 }} />
        ))}
      </Box>
    </Box>
  );
}
