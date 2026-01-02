'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// ============================================
// Types
// ============================================
interface ToastOptions {
  message: string;
  type?: AlertColor;
  duration?: number;
  action?: ReactNode;
}

interface Toast extends ToastOptions {
  id: number;
  open: boolean;
}

interface FeedbackContextType {
  showToast: (options: ToastOptions) => number;
  success: (message: string, options?: Partial<ToastOptions>) => number;
  error: (message: string, options?: Partial<ToastOptions>) => number;
  warning: (message: string, options?: Partial<ToastOptions>) => number;
  info: (message: string, options?: Partial<ToastOptions>) => number;
  hideToast: (id: number) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

// ============================================
// Slide Transition
// ============================================
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

// ============================================
// Icon Map
// ============================================
const iconMap: Record<AlertColor, ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

// ============================================
// Provider Component
// ============================================
interface FeedbackProviderProps {
  children: ReactNode;
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ============================================
  // Show Toast
  // ============================================
  const showToast = useCallback((options: ToastOptions): number => {
    const id = Date.now() + Math.random();

    const toast: Toast = {
      id,
      open: true,
      type: 'info',
      duration: 4000,
      ...options,
    };

    setToasts((prev) => [...prev, toast]);

    return id;
  }, []);

  // ============================================
  // Hide Toast
  // ============================================
  const hideToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    );

    // Remove from array after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300);
  }, []);

  // ============================================
  // Convenience Methods
  // ============================================
  const success = useCallback(
    (message: string, options?: Partial<ToastOptions>) =>
      showToast({ message, type: 'success', ...options }),
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: Partial<ToastOptions>) =>
      showToast({ message, type: 'error', duration: 6000, ...options }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: Partial<ToastOptions>) =>
      showToast({ message, type: 'warning', ...options }),
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: Partial<ToastOptions>) =>
      showToast({ message, type: 'info', ...options }),
    [showToast]
  );

  // ============================================
  // Context Value
  // ============================================
  const contextValue = useMemo<FeedbackContextType>(
    () => ({
      showToast,
      success,
      error,
      warning,
      info,
      hideToast,
    }),
    [showToast, success, error, warning, info, hideToast]
  );

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      {/* Render all toasts */}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={toast.open}
          autoHideDuration={toast.duration}
          onClose={() => hideToast(toast.id)}
          TransitionComponent={SlideTransition}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center'
          }}
          sx={{
            bottom: { xs: 16 + index * 60, sm: 24 + index * 72 },
            left: { xs: '50%', sm: 'auto' },
            right: { xs: 'auto', sm: 24 },
            transform: { xs: 'translateX(-50%)', sm: 'none' },
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            maxWidth: { xs: 400, sm: 'none' },
          }}
        >
          <Alert
            severity={toast.type}
            onClose={() => hideToast(toast.id)}
            icon={iconMap[toast.type || 'info']}
            sx={{
              width: '100%',
              minWidth: { xs: 'auto', sm: 300 },
              alignItems: 'center',
              py: { xs: 0.5, sm: 1 },
              px: { xs: 1.5, sm: 2 },
              '& .MuiAlert-icon': {
                marginRight: { xs: 1, sm: 1.5 },
                '& svg': {
                  width: { xs: 18, sm: 20 },
                  height: { xs: 18, sm: 20 },
                },
              },
              '& .MuiAlert-message': {
                fontWeight: 500,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
              },
              '& .MuiAlert-action': {
                pt: 0,
                pr: { xs: 0, sm: 1 },
              },
            }}
            action={toast.action}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </FeedbackContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}
