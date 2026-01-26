'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Copy,
  CheckCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useStoreCart } from '@/hooks';
import { useFeedback, useAuth } from '@/components/providers';
import { StoreOrderItem, FinancialPaymentLink } from '@/types';

// ============================================
// Cart Storage (localStorage)
// ============================================
const CART_KEY = 'marcusjj_cart';

function getCart(): StoreOrderItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
}

function saveCart(items: StoreOrderItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
}

// ============================================
// Cart Item Component
// ============================================
interface CartItemCardProps {
  item: StoreOrderItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartItemCard({ item, onUpdateQuantity, onRemove }: CartItemCardProps) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={600}>
            {item.productName}
          </Typography>
          {(item.size || item.color) && (
            <Typography variant="caption" color="text.secondary">
              {[item.size, item.color].filter(Boolean).join(' - ')}
            </Typography>
          )}
          <Typography variant="body2" color="primary" fontWeight={600} sx={{ mt: 0.5 }}>
            R$ {(item.unitPrice / 100).toFixed(2)} cada
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <IconButton size="small" onClick={onRemove} sx={{ color: 'error.main' }}>
            <Trash2 size={16} />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <Minus size={14} />
            </IconButton>
            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 24, textAlign: 'center' }}>
              {item.quantity}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <Plus size={14} />
            </IconButton>
          </Box>
        </Box>
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Subtotal
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          R$ {((item.unitPrice * item.quantity) / 100).toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );
}

// ============================================
// Payment Dialog
// ============================================
interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  paymentLink: FinancialPaymentLink | null;
  isLoading: boolean;
  orderId: string | null;
}

function PaymentDialog({ open, onClose, paymentLink, isLoading, orderId }: PaymentDialogProps) {
  const { success } = useFeedback();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (paymentLink?.pixCode) {
      QRCode.toDataURL(paymentLink.pixCode, { width: 256 })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [paymentLink?.pixCode]);

  const handleCopyCode = () => {
    if (paymentLink?.pixCode) {
      navigator.clipboard.writeText(paymentLink.pixCode);
      setCopied(true);
      success('Codigo PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Pagamento PIX
          </Typography>
          {orderId && (
            <Typography variant="caption" color="text.secondary">
              Pedido #{orderId.slice(-6).toUpperCase()}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Gerando QR Code...
            </Typography>
          </Box>
        ) : paymentLink ? (
          <Box sx={{ textAlign: 'center' }}>
            {qrCodeUrl ? (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  display: 'inline-block',
                  mb: 2,
                }}
              >
                <img src={qrCodeUrl} alt="QR Code PIX" style={{ display: 'block' }} />
              </Box>
            ) : (
              <Skeleton variant="rectangular" width={256} height={256} sx={{ mx: 'auto', mb: 2 }} />
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escaneie o QR Code ou copie o codigo PIX
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              startIcon={copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              onClick={handleCopyCode}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copiado!' : 'Copiar Codigo PIX'}
            </Button>

            <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
              Apos o pagamento, seu pedido sera atualizado automaticamente.
            </Alert>
          </Box>
        ) : (
          <Alert severity="error">
            Erro ao gerar pagamento. Tente novamente.
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Page
// ============================================
export default function CarrinhoPage() {
  const router = useRouter();
  const { success, error: showError } = useFeedback();
  const { user } = useAuth();
  const { createOrder, generatePayment, isCreatingOrder, isGeneratingPayment, minOrderAmount } = useStoreCart();

  const [cartItems, setCartItems] = useState<StoreOrderItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState<FinancialPaymentLink | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // Load cart from localStorage
  useEffect(() => {
    setCartItems(getCart());
  }, []);

  // Calculate total
  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  // Check minimum order amount
  const belowMinimum = !!(minOrderAmount && total < minOrderAmount);

  // Handlers
  const handleBack = () => {
    router.push('/portal/loja');
  };

  const handleUpdateQuantity = useCallback((index: number, quantity: number) => {
    setCartItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity };
      saveCart(newItems);
      return newItems;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setCartItems((prev) => {
      const newItems = prev.filter((_, i) => i !== index);
      saveCart(newItems);
      return newItems;
    });
    success('Item removido do carrinho');
  }, [success]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showError('Seu carrinho esta vazio');
      return;
    }

    if (belowMinimum) {
      showError(`Pedido minimo: R$ ${((minOrderAmount || 0) / 100).toFixed(2)}`);
      return;
    }

    try {
      // Create order
      const order = await createOrder(cartItems);
      setCurrentOrderId(order.id);

      // Generate payment
      setPaymentDialogOpen(true);
      const payment = await generatePayment(order.id);
      setPaymentLink(payment);

      // Clear cart
      clearCart();
      setCartItems([]);
    } catch (err) {
      showError('Erro ao processar pedido');
    }
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    if (currentOrderId) {
      router.push('/portal/loja/pedidos');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={handleBack}>
          <ArrowLeft size={20} />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          Carrinho
        </Typography>
      </Box>

      {/* Cart Items */}
      {cartItems.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <ShoppingCart size={48} color="#9CA3AF" />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Carrinho vazio
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adicione produtos para continuar
          </Typography>
          <Button variant="contained" onClick={handleBack}>
            Ver Produtos
          </Button>
        </Paper>
      ) : (
        <>
          {cartItems.map((item, index) => (
            <CartItemCard
              key={`${item.productId}-${item.size}-${item.color}`}
              item={item}
              onUpdateQuantity={(qty) => handleUpdateQuantity(index, qty)}
              onRemove={() => handleRemoveItem(index)}
            />
          ))}

          {/* Summary */}
          <Paper sx={{ p: 2, borderRadius: 2, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Itens ({cartItems.reduce((sum, i) => sum + i.quantity, 0)})
              </Typography>
              <Typography variant="body2">
                R$ {(total / 100).toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Total
              </Typography>
              <Typography variant="h6" color="primary" fontWeight={700}>
                R$ {(total / 100).toFixed(2)}
              </Typography>
            </Box>

            {belowMinimum && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Pedido minimo: R$ {((minOrderAmount || 0) / 100).toFixed(2)}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={
                isCreatingOrder ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <CreditCard size={18} />
                )
              }
              onClick={handleCheckout}
              disabled={isCreatingOrder || belowMinimum}
              sx={{ mt: 2, py: 1.5, borderRadius: 2 }}
            >
              {isCreatingOrder ? 'Processando...' : 'Finalizar Pedido'}
            </Button>

            <Button
              variant="text"
              fullWidth
              onClick={handleBack}
              sx={{ mt: 1 }}
            >
              Continuar Comprando
            </Button>
          </Paper>
        </>
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        paymentLink={paymentLink}
        isLoading={isGeneratingPayment}
        orderId={currentOrderId}
      />
    </Box>
  );
}
