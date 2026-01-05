'use client';

import { useState, useCallback } from 'react';
import { Fab, Zoom, useTheme, useMediaQuery } from '@mui/material';
import { Plus } from 'lucide-react';
import { QuickRegisterDialog } from './QuickRegisterDialog';

// ============================================
// Props Interface
// ============================================
interface QuickRegisterFabProps {
  onSuccess?: (studentId: string) => void;
}

// ============================================
// QuickRegisterFab Component
// ============================================
export function QuickRegisterFab({ onSuccess }: QuickRegisterFabProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  // On mobile, position FAB above the bottom navigation bar
  // Bottom nav is ~60px + safe area, so we add extra margin
  const bottomPosition = isMobile ? 80 : 24;

  return (
    <>
      <Zoom in timeout={300}>
        <Fab
          color="primary"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: bottomPosition,
            right: { xs: 16, sm: 24 },
            width: { xs: 56, sm: 64 },
            height: { xs: 56, sm: 64 },
            zIndex: 1000,
          }}
        >
          <Plus size={isMobile ? 24 : 28} />
        </Fab>
      </Zoom>

      <QuickRegisterDialog
        open={dialogOpen}
        onClose={handleClose}
        onSuccess={onSuccess}
      />
    </>
  );
}

export default QuickRegisterFab;
