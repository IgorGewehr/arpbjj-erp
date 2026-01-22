'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  X,
  Copy,
  Check,
  QrCode,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Financial, FinancialPaymentLink } from '@/types';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  financial: Financial;
  paymentLink?: FinancialPaymentLink | null;
  isLoading?: boolean;
  error?: string | null;
  onGenerateLink?: () => Promise<void>;
}

export function PaymentDialog({
  open,
  onClose,
  financial,
  paymentLink,
  isLoading = false,
  error = null,
  onGenerateLink,
}: PaymentDialogProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining for payment link
  useEffect(() => {
    if (!paymentLink?.expiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(paymentLink.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expirado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}min restantes`);
      } else {
        setTimeRemaining(`${minutes}min restantes`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [paymentLink?.expiresAt]);

  const handleCopyCode = async () => {
    if (!paymentLink?.pixCode) return;

    try {
      await navigator.clipboard.writeText(paymentLink.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = () => {
    switch (financial.status) {
      case 'paid':
        return theme.palette.success.main;
      case 'overdue':
        return theme.palette.error.main;
      case 'pending':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getStatusLabel = () => {
    switch (financial.status) {
      case 'paid':
        return 'Pago';
      case 'overdue':
        return 'Atrasado';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return financial.status;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CreditCard size={20} color="white" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Pagamento via PIX
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {financial.description || 'Mensalidade'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Payment Info Card */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Valor a pagar
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: `${getStatusColor()}20`,
                color: getStatusColor(),
              }}
            >
              <Typography variant="caption" fontWeight={600}>
                {getStatusLabel()}
              </Typography>
            </Box>
          </Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: theme.palette.primary.main }}
          >
            {formatCurrency(financial.amount)}
          </Typography>
          {financial.dueDate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Vencimento:{' '}
              {new Date(financial.dueDate).toLocaleDateString('pt-BR')}
            </Typography>
          )}
        </Box>

        {/* Error State */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<AlertCircle size={20} />}
          >
            {error}
          </Alert>
        )}

        {/* Already Paid State */}
        {financial.status === 'paid' && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: `${theme.palette.success.main}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <CheckCircle2 size={32} color={theme.palette.success.main} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              Pagamento Confirmado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Este pagamento já foi realizado
            </Typography>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && financial.status !== 'paid' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Gerando código PIX...
            </Typography>
          </Box>
        )}

        {/* Payment Link Display */}
        {!isLoading && paymentLink && financial.status !== 'paid' && (
          <Box>
            {/* QR Code */}
            {paymentLink.qrCodeUrl && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <img
                    src={paymentLink.qrCodeUrl}
                    alt="QR Code PIX"
                    style={{
                      width: 200,
                      height: 200,
                      display: 'block',
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Expiry Timer */}
            {timeRemaining && timeRemaining !== 'Expirado' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  mb: 2,
                }}
              >
                <Clock size={14} color={theme.palette.text.secondary} />
                <Typography variant="caption" color="text.secondary">
                  {timeRemaining}
                </Typography>
              </Box>
            )}

            {/* PIX Code */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Código PIX Copia e Cola
                </Typography>
                <Tooltip title={copied ? 'Copiado!' : 'Copiar código'}>
                  <IconButton
                    onClick={handleCopyCode}
                    size="small"
                    color={copied ? 'success' : 'default'}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  p: 1.5,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  maxHeight: 80,
                  overflow: 'auto',
                }}
              >
                {paymentLink.pixCode}
              </Typography>
            </Box>

            {/* Copy Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleCopyCode}
              startIcon={copied ? <Check size={18} /> : <Copy size={18} />}
              sx={{
                mt: 2,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
            </Button>
          </Box>
        )}

        {/* Generate Link Button */}
        {!isLoading &&
          !paymentLink &&
          financial.status !== 'paid' &&
          onGenerateLink && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <QrCode size={40} color={theme.palette.primary.main} />
              </Box>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                Pague com PIX
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Gere um código PIX para pagar instantaneamente
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={onGenerateLink}
                startIcon={<QrCode size={20} />}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Gerar Código PIX
              </Button>
            </Box>
          )}

        {/* Footer Info */}
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', textAlign: 'center', mt: 3 }}
        >
          Pagamentos processados com segurança via PIX
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentDialog;
