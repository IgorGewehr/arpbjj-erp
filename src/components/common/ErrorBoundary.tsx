'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

// ============================================
// Types
// ============================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================
// Default Error Fallback
// ============================================
interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'error.50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <AlertTriangle size={40} color="#DC2626" />
        </Box>

        <Typography variant="h5" fontWeight={700} gutterBottom>
          Algo deu errado
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Desculpe, ocorreu um erro inesperado. Nossa equipe foi notificada.
        </Typography>

        {error && process.env.NODE_ENV === 'development' && (
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'grey.100',
              textAlign: 'left',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            <Typography
              variant="caption"
              component="pre"
              sx={{
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                m: 0,
              }}
            >
              {error.message}
              {'\n\n'}
              {error.stack}
            </Typography>
          </Paper>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={18} />}
            onClick={resetError}
          >
            Tentar Novamente
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home size={18} />}
            onClick={() => (window.location.href = '/dashboard')}
          >
            Voltar ao Inicio
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

// ============================================
// Error Boundary Component
// ============================================
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================
// Inline Error Fallback (for smaller sections)
// ============================================
interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function InlineError({ message = 'Erro ao carregar', onRetry }: InlineErrorProps) {
  return (
    <Box
      sx={{
        p: 3,
        textAlign: 'center',
        bgcolor: 'error.50',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'error.200',
      }}
    >
      <Bug size={24} color="#DC2626" />
      <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button
          size="small"
          startIcon={<RefreshCw size={14} />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          Tentar novamente
        </Button>
      )}
    </Box>
  );
}

// ============================================
// Page Error Boundary Wrapper
// ============================================
interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log with page context
    console.error(`Error in ${pageName || 'Unknown Page'}:`, error, errorInfo);
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
