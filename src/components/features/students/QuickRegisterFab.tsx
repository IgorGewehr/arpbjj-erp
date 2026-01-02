'use client';

import { useState, useCallback } from 'react';
import { Fab, Zoom } from '@mui/material';
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  return (
    <>
      <Zoom in timeout={300}>
        <Fab
          color="primary"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
            zIndex: 1000,
          }}
        >
          <Plus size={28} />
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
