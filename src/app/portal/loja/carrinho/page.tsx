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
  Alert,
} from '@mui/material';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import { useStoreCart } from '@/hooks';
import { useFeedback } from '@/components/providers';
import { CartItemInput } from '@/types';
import { CheckoutDialog } from '@/components/features/store';

// ============================================
// Cart Storage (localStorage)
// Note: displayPrice is stored for UI display only
// Actual prices are always fetched from server on checkout
// ============================================
const CART_KEY = 'marcusjj_cart';

function getCart(): CartItemInput[] {
  if (typeof window === 'undefined') return [];
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItemInput[]): void {
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
  item: CartItemInput;
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
            R$ {(item.displayPrice ).toFixed(2)} cada
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
          Subtotal (estimado)
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          R$ {((item.displayPrice * item.quantity) ).toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );
}

// ============================================
// Main Page
// ============================================
export default function CarrinhoPage() {
  const router = useRouter();
  const { success, error: showError } = useFeedback();
  const {
    createOrder,
    generatePayment,
    isCreatingOrder,
    isGeneratingPayment,
    minOrderAmount,
    isCreditCardEnabled,
  } = useStoreCart();

  const [cartItems, setCartItems] = useState<CartItemInput[]>([]);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    setCartItems(getCart());
  }, []);

  // Calculate display total (for UI only - actual total calculated server-side)
  const displayTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.displayPrice * item.quantity, 0);
  }, [cartItems]);

  // Check minimum order amount (using display total as estimate)
  const belowMinimum = !!(minOrderAmount && displayTotal < minOrderAmount);

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

  const handleOpenCheckout = () => {
    if (cartItems.length === 0) {
      showError('Seu carrinho esta vazio');
      return;
    }

    if (belowMinimum) {
      showError(`Pedido minimo: R$ ${((minOrderAmount || 0) ).toFixed(2)}`);
      return;
    }

    setCheckoutDialogOpen(true);
  };

  const handleCreateOrder = async () => {
    const order = await createOrder(cartItems);
    // Clear cart after successful order creation
    clearCart();
    setCartItems([]);
    return order;
  };

  const handleCloseCheckoutDialog = () => {
    setCheckoutDialogOpen(false);
    // If cart is empty (order was created), redirect to orders page
    if (cartItems.length === 0) {
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
                R$ {(displayTotal ).toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Total Estimado
              </Typography>
              <Typography variant="h6" color="primary" fontWeight={700}>
                R$ {(displayTotal ).toFixed(2)}
              </Typography>
            </Box>

            {belowMinimum && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Pedido minimo: R$ {((minOrderAmount || 0) ).toFixed(2)}
              </Alert>
            )}

            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }} icon={false}>
              Os precos e disponibilidade serao confirmados no momento do pedido.
            </Alert>

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<CreditCard size={18} />}
              onClick={handleOpenCheckout}
              disabled={belowMinimum}
              sx={{ mt: 2, py: 1.5, borderRadius: 2 }}
            >
              Finalizar Pedido
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

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutDialogOpen}
        onClose={handleCloseCheckoutDialog}
        cartItems={cartItems}
        displayTotal={displayTotal}
        onCreateOrder={handleCreateOrder}
        onGeneratePayment={generatePayment}
        isCreatingOrder={isCreatingOrder}
        isGeneratingPayment={isGeneratingPayment}
        isCreditCardEnabled={isCreditCardEnabled}
      />
    </Box>
  );
}
