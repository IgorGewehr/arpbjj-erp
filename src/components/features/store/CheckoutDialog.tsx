'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  Divider,
  CircularProgress,
  Alert,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Fade,
  Slide,
  IconButton,
} from '@mui/material';
import {
  X,
  CreditCard,
  QrCode,
  Copy,
  CheckCircle,
  ExternalLink,
  Clock,
  ShieldCheck,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CartItemInput, FinancialPaymentLink } from '@/types';
import { useFeedback } from '@/components/providers';

// ============================================
// Types
// ============================================
type PaymentMethod = 'PIX' | 'CARD';

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItemInput[];
  displayTotal: number;
  onCreateOrder: () => Promise<{ id: string }>;
  onGeneratePayment: (orderId: string, method: PaymentMethod) => Promise<FinancialPaymentLink | null>;
  isCreatingOrder: boolean;
  isGeneratingPayment: boolean;
  isCreditCardEnabled: boolean;
}

// ============================================
// Checkout Dialog Component
// ============================================
export function CheckoutDialog({
  open,
  onClose,
  cartItems,
  displayTotal,
  onCreateOrder,
  onGeneratePayment,
  isCreatingOrder,
  isGeneratingPayment,
  isCreditCardEnabled,
}: CheckoutDialogProps) {
  const { success, error: showError } = useFeedback();

  const [step, setStep] = useState<'summary' | 'payment'>('summary');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<FinancialPaymentLink | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [savedTotal, setSavedTotal] = useState<number>(0);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('summary');
      setPaymentMethod('PIX');
      setOrderId(null);
      setPaymentLink(null);
      setQrCodeUrl('');
      setCopied(false);
      setTimeRemaining('');
      setSavedTotal(0);
    }
  }, [open]);

  // Generate QR code from raw PIX br-code only (not from URLs)
  useEffect(() => {
    const qrContent = paymentLink?.pixCode;
    if (qrContent) {
      QRCode.toDataURL(qrContent, {
        width: 280,
        margin: 2,
        color: {
          dark: '#111111',
          light: '#ffffff',
        },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [paymentLink?.pixCode, paymentLink?.qrCodeUrl]);

  // Timer for PIX expiration
  useEffect(() => {
    if (!paymentLink?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(paymentLink.expiresAt);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expirado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [paymentLink?.expiresAt]);

  // Handle checkout
  const handleCheckout = async () => {
    try {
      // Save total before order creation clears the cart
      setSavedTotal(displayTotal);

      // Create order
      const order = await onCreateOrder();
      setOrderId(order.id);

      // Generate payment
      const payment = await onGeneratePayment(order.id, paymentMethod);

      if (payment) {
        setPaymentLink(payment);
        setStep('payment');
      } else {
        showError('Erro ao gerar pagamento. Tente novamente.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pedido';
      showError(errorMessage);
    }
  };

  // Handle copy PIX code
  const handleCopyCode = useCallback(() => {
    if (paymentLink?.pixCode) {
      navigator.clipboard.writeText(paymentLink.pixCode);
      setCopied(true);
      success('Codigo PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [paymentLink?.pixCode, success]);

  const isProcessing = isCreatingOrder || isGeneratingPayment;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' } as any}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #111 0%, #333 100%)',
          color: 'white',
          p: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {step === 'summary' ? (
                <CreditCard size={24} />
              ) : (
                <QrCode size={24} />
              )}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {step === 'summary' ? 'Finalizar Compra' : 'Pagar com PIX'}
              </Typography>
              {orderId && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Pedido #{orderId.slice(-6).toUpperCase()}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {step === 'summary' ? (
          <Box sx={{ p: 3 }}>
            {/* Order Summary */}
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              Resumo do Pedido
            </Typography>

            <Box sx={{ mt: 1.5, mb: 2 }}>
              {cartItems.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {item.quantity}x {item.productName}
                    </Typography>
                    {(item.size || item.color) && (
                      <Typography variant="caption" color="text.secondary">
                        {[item.size, item.color].filter(Boolean).join(' · ')}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    R$ {((item.displayPrice * item.quantity) ).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider />

            {/* Total */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2,
                px: 2,
                my: 2,
                bgcolor: '#f8f9fa',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Total
              </Typography>
              <Typography variant="h5" color="primary" fontWeight={800}>
                R$ {(displayTotal ).toFixed(2)}
              </Typography>
            </Box>

            {/* Payment Method Selection */}
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              Forma de Pagamento
            </Typography>

            <ToggleButtonGroup
              value={paymentMethod}
              exclusive
              onChange={(_, value) => value && setPaymentMethod(value)}
              fullWidth
              sx={{ mt: 1.5, mb: 2 }}
            >
              <ToggleButton
                value="PIX"
                sx={{
                  py: 2,
                  borderRadius: '12px !important',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCode size={22} />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight={600}>
                      PIX
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Aprovacao imediata
                    </Typography>
                  </Box>
                </Box>
              </ToggleButton>
              {isCreditCardEnabled && (
                <ToggleButton
                  value="CARD"
                  sx={{
                    py: 2,
                    ml: '12px !important',
                    borderRadius: '12px !important',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCard size={22} />
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" fontWeight={600}>
                        Cartao
                      </Typography>
                      <Chip label="Beta" size="small" sx={{ height: 18, fontSize: '0.6rem', ml: 0.5 }} />
                    </Box>
                  </Box>
                </ToggleButton>
              )}
            </ToggleButtonGroup>

            {paymentMethod === 'CARD' && (
              <Alert
                severity="info"
                icon={<ExternalLink size={18} />}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                Voce sera redirecionado para uma pagina segura.
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleCheckout}
              disabled={isProcessing || cartItems.length === 0}
              sx={{
                py: 2,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
              }}
            >
              {isProcessing ? (
                <CircularProgress size={24} color="inherit" />
              ) : paymentMethod === 'CARD' ? (
                <>
                  <ExternalLink size={20} style={{ marginRight: 8 }} />
                  Pagar com Cartao
                </>
              ) : (
                <>
                  <QrCode size={20} style={{ marginRight: 8 }} />
                  Gerar QR Code PIX
                </>
              )}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, gap: 1 }}>
              <ShieldCheck size={14} color="#666" />
              <Typography variant="caption" color="text.secondary">
                Pagamento 100% seguro
              </Typography>
            </Box>
          </Box>
        ) : (
          /* Payment Step */
          <Fade in={step === 'payment'}>
            <Box sx={{ p: 3, textAlign: 'center' }}>
              {isGeneratingPayment ? (
                <Box sx={{ py: 6 }}>
                  <CircularProgress size={48} />
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    Gerando pagamento...
                  </Typography>
                </Box>
              ) : paymentLink?.pixCode ? (
                <>
                  {/* Inline PIX QR Code (raw br-code) */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      mb: 3,
                      bgcolor: '#f8f9fa',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" color="text.secondary">
                        Valor a pagar
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="primary">
                        R$ {(savedTotal ).toFixed(2)}
                      </Typography>
                    </Box>
                    {timeRemaining && (
                      <Chip
                        icon={<Clock size={14} />}
                        label={timeRemaining}
                        size="small"
                        sx={{
                          bgcolor: timeRemaining === 'Expirado' ? 'error.light' : 'grey.100',
                          color: timeRemaining === 'Expirado' ? 'error.main' : 'text.secondary',
                        }}
                      />
                    )}
                  </Box>

                  {qrCodeUrl ? (
                    <Box
                      sx={{
                        p: 2.5,
                        bgcolor: 'white',
                        borderRadius: 4,
                        display: 'inline-block',
                        mb: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Image
                        src={qrCodeUrl}
                        alt="QR Code PIX"
                        width={280}
                        height={280}
                        unoptimized
                        style={{ display: 'block', borderRadius: 8 }}
                      />
                    </Box>
                  ) : (
                    <Skeleton variant="rectangular" width={280} height={280} sx={{ mx: 'auto', mb: 2, borderRadius: 4 }} />
                  )}

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Escaneie com o app do seu banco
                  </Typography>

                  <Button
                    variant={copied ? 'contained' : 'outlined'}
                    fullWidth
                    size="large"
                    startIcon={copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                    onClick={handleCopyCode}
                    color={copied ? 'success' : 'primary'}
                    sx={{ py: 1.5, borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
                  >
                    {copied ? 'Copiado!' : 'Copiar Codigo PIX'}
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    onClick={onClose}
                    sx={{ mt: 2, color: 'text.secondary' }}
                  >
                    Fechar
                  </Button>
                </>
              ) : paymentLink?.qrCodeUrl ? (
                <>
                  {/* AbacatePay hosted payment page */}
                  <Box
                    sx={{
                      p: 2,
                      mb: 3,
                      bgcolor: '#f8f9fa',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Valor a pagar
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="primary">
                      R$ {(savedTotal ).toFixed(2)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: '#f0f7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <CheckCircle size={40} color="#22c55e" />
                  </Box>

                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    Pedido criado!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Clique no botao abaixo para abrir a pagina de pagamento com o QR Code PIX
                  </Typography>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<QrCode size={20} />}
                    href={paymentLink.qrCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    component="a"
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      textDecoration: 'none',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
                    }}
                  >
                    Pagar com PIX
                  </Button>

                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1.5,
                    }}
                  >
                    <CircularProgress size={18} thickness={5} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Aguardando pagamento...
                    </Typography>
                  </Box>

                  <Button
                    variant="text"
                    fullWidth
                    onClick={onClose}
                    sx={{ mt: 2, color: 'text.secondary' }}
                  >
                    Fechar
                  </Button>
                </>
              ) : (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  Erro ao gerar pagamento. Tente novamente.
                </Alert>
              )}
            </Box>
          </Fade>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CheckoutDialog;
