'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { AlertTriangle, Info, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ============================================
// Types
// ============================================
type Severity = 'info' | 'warning' | 'error' | 'success';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: Severity;
  showCancel?: boolean;
}

interface ConfirmDialogState extends ConfirmOptions {
  open: boolean;
  isLoading: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmOptions, 'cancelText' | 'showCancel'>) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

// ============================================
// Icon Map (with responsive sizes)
// ============================================
const getIcon = (severity: Severity, size: number): ReactNode => {
  const icons: Record<Severity, ReactNode> = {
    info: <Info size={size} color="#2563EB" />,
    warning: <AlertTriangle size={size} color="#D97706" />,
    error: <XCircle size={size} color="#DC2626" />,
    success: <CheckCircle size={size} color="#16A34A" />,
  };
  return icons[severity];
};

const colorMap: Record<Severity, 'info' | 'warning' | 'error' | 'success'> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
  success: 'success',
};

// ============================================
// Provider Component
// ============================================
interface ConfirmDialogProviderProps {
  children: ReactNode;
}

const initialState: ConfirmDialogState = {
  open: false,
  isLoading: false,
  title: '',
  message: '',
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  severity: 'warning',
  showCancel: true,
  resolve: null,
};

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [state, setState] = useState<ConfirmDialogState>(initialState);

  // ============================================
  // Confirm Dialog
  // ============================================
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        isLoading: false,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        severity: options.severity || 'warning',
        showCancel: options.showCancel !== false,
        resolve,
      });
    });
  }, []);

  // ============================================
  // Alert Dialog (no cancel)
  // ============================================
  const alert = useCallback(
    (options: Omit<ConfirmOptions, 'cancelText' | 'showCancel'>): Promise<boolean> => {
      return confirm({
        ...options,
        showCancel: false,
        confirmText: options.confirmText || 'OK',
      });
    },
    [confirm]
  );

  // ============================================
  // Handle Close
  // ============================================
  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (state.resolve) {
        state.resolve(confirmed);
      }
      setState((prev) => ({ ...prev, open: false }));
      // Reset state after animation
      setTimeout(() => {
        setState(initialState);
      }, 200);
    },
    [state.resolve]
  );

  // ============================================
  // Context Value
  // ============================================
  const contextValue = useMemo<ConfirmDialogContextType>(
    () => ({
      confirm,
      alert,
    }),
    [confirm, alert]
  );

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}

      <Dialog
        open={state.open}
        onClose={() => handleClose(false)}
        maxWidth="xs"
        fullWidth
        TransitionComponent={Fade}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: { xs: 2, sm: 3 },
            mx: { xs: 2, sm: 3 },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            {getIcon(state.severity || 'warning', isMobile ? 22 : 28)}
            <Box
              component="span"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 600 }}
            >
              {state.title}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <DialogContentText sx={{ color: 'text.primary', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
            {state.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 }, pt: 1, gap: { xs: 0.5, sm: 1 } }}>
          {state.showCancel && (
            <Button
              onClick={() => handleClose(false)}
              color="inherit"
              disabled={state.isLoading}
              size={isMobile ? 'small' : 'medium'}
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              {state.cancelText}
            </Button>
          )}
          <Button
            onClick={() => handleClose(true)}
            variant="contained"
            color={colorMap[state.severity || 'warning']}
            disabled={state.isLoading}
            size={isMobile ? 'small' : 'medium'}
            startIcon={state.isLoading ? <CircularProgress size={isMobile ? 14 : 16} color="inherit" /> : null}
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            autoFocus
          >
            {state.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================
export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
}
