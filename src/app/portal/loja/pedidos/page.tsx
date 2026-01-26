'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  ShoppingCart,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';
import { useStoreCart } from '@/hooks';
import { useFeedback } from '@/components/providers';
import {
  StoreOrder,
  STORE_ORDER_STATUS_LABELS,
  STORE_ORDER_STATUS_COLORS,
  FinancialPaymentLink,
} from '@/types';

// ============================================
// Order Card Component
// ============================================
interface OrderCardProps {
  order: StoreOrder;
  onViewDetails: () => void;
  onPayNow: () => void;
}

function OrderCard({ order, onViewDetails, onPayNow }: OrderCardProps) {
  const getStatusIcon = () => {
    switch (order.status) {
      case 'pending_payment':
        return <Clock size={16} />;
      case 'paid':
        return <CheckCircle size={16} />;
      case 'preparing':
        return <Package size={16} />;
      case 'ready':
        return <Package size={16} />;
      case 'delivered':
        return <Truck size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        mb: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
        },
      }}
      onClick={onViewDetails}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            Pedido #{order.id.slice(-6).toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format(order.createdAt, "dd 'de' MMM, HH:mm", { locale: ptBR })}
          </Typography>
        </Box>
        <Chip
          icon={getStatusIcon()}
          label={STORE_ORDER_STATUS_LABELS[order.status]}
          color={STORE_ORDER_STATUS_COLORS[order.status]}
          size="small"
        />
      </Box>

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
          </Typography>
          <Typography variant="subtitle1" fontWeight={700} color="primary">
            R$ {(order.totalAmount / 100).toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {order.status === 'pending_payment' && (
            <Button
              size="small"
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                onPayNow();
              }}
            >
              Pagar
            </Button>
          )}
          <ChevronRight size={18} color="#9CA3AF" />
        </Box>
      </Box>
    </Paper>
  );
}

// ============================================
// Order Detail Dialog
// ============================================
interface OrderDetailDialogProps {
  order: StoreOrder | null;
  open: boolean;
  onClose: () => void;
  onPayNow: () => void;
}

function OrderDetailDialog({ order, open, onClose, onPayNow }: OrderDetailDialogProps) {
  if (!order) return null;

  const getStatusIcon = () => {
    switch (order.status) {
      case 'pending_payment':
        return <Clock size={20} />;
      case 'paid':
        return <CheckCircle size={20} />;
      case 'preparing':
        return <Package size={20} />;
      case 'ready':
        return <Package size={20} />;
      case 'delivered':
        return <Truck size={20} />;
      case 'cancelled':
        return <XCircle size={20} />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            Pedido #{order.id.slice(-6).toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {format(order.createdAt, "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Chip
            icon={getStatusIcon()}
            label={STORE_ORDER_STATUS_LABELS[order.status]}
            color={STORE_ORDER_STATUS_COLORS[order.status]}
          />
        </Box>

        {order.status === 'ready' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Seu pedido esta pronto para retirada!
          </Alert>
        )}

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Itens do Pedido
        </Typography>

        {order.items.map((item, index) => (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {item.productName}
                </Typography>
                {(item.size || item.color) && (
                  <Typography variant="caption" color="text.secondary">
                    {[item.size, item.color].filter(Boolean).join(' - ')}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2">
                {item.quantity}x R$ {(item.unitPrice / 100).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Total
          </Typography>
          <Typography variant="h6" color="primary" fontWeight={700}>
            R$ {(order.totalAmount / 100).toFixed(2)}
          </Typography>
        </Box>

        {order.status === 'pending_payment' && (
          <Button
            variant="contained"
            fullWidth
            onClick={onPayNow}
            sx={{ mt: 2 }}
          >
            Pagar Agora
          </Button>
        )}

        <Button
          variant="text"
          fullWidth
          onClick={onClose}
          sx={{ mt: 1 }}
        >
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Payment Dialog
// ============================================
interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: StoreOrder | null;
  paymentLink: FinancialPaymentLink | null;
  isLoading: boolean;
}

function PaymentDialog({ open, onClose, order, paymentLink, isLoading }: PaymentDialogProps) {
  const { success } = useFeedback();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const pixCode = paymentLink?.pixCode || order?.pixCode;
    if (pixCode) {
      QRCode.toDataURL(pixCode, { width: 256 })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [paymentLink?.pixCode, order?.pixCode]);

  const handleCopyCode = () => {
    const pixCode = paymentLink?.pixCode || order?.pixCode;
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      success('Codigo PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pixCode = paymentLink?.pixCode || order?.pixCode;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Pagamento PIX
          </Typography>
          {order && (
            <Typography variant="caption" color="text.secondary">
              Pedido #{order.id.slice(-6).toUpperCase()}
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
        ) : pixCode ? (
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

        <Button
          variant="text"
          fullWidth
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Loading Skeleton
// ============================================
function OrdersSkeleton() {
  return (
    <Box>
      {[1, 2, 3].map((i) => (
        <Paper key={i} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Box>
              <Skeleton variant="text" width={120} />
              <Skeleton variant="text" width={80} />
            </Box>
            <Skeleton variant="rounded" width={100} height={24} />
          </Box>
          <Skeleton variant="rectangular" height={1} sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Skeleton variant="text" width={60} />
              <Skeleton variant="text" width={80} />
            </Box>
            <Skeleton variant="rounded" width={60} height={32} />
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

// ============================================
// Main Page
// ============================================
export default function MeusPedidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success: showSuccess } = useFeedback();
  const { orders, isLoadingOrders, generatePayment, isGeneratingPayment, refreshOrders } = useStoreCart();

  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState<FinancialPaymentLink | null>(null);

  // Check for success parameter
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showSuccess('Pedido realizado com sucesso!');
      // Remove the parameter from URL
      router.replace('/portal/loja/pedidos');
    }
  }, [searchParams, showSuccess, router]);

  // Auto-refresh orders
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refreshOrders]);

  // Handlers
  const handleBack = () => {
    router.push('/portal/loja');
  };

  const handleViewDetails = (order: StoreOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handlePayNow = async (order: StoreOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(false);

    // If order already has PIX code, show it directly
    if (order.pixCode) {
      setPaymentLink(null);
      setPaymentDialogOpen(true);
      return;
    }

    // Otherwise generate new payment
    setPaymentDialogOpen(true);
    try {
      const payment = await generatePayment(order.id);
      setPaymentLink(payment);
    } catch (err) {
      // Error handled by hook
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
          Meus Pedidos
        </Typography>
      </Box>

      {/* Orders List */}
      {isLoadingOrders ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <ShoppingCart size={48} color="#9CA3AF" />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Nenhum pedido ainda
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Seus pedidos aparecerao aqui
          </Typography>
          <Button variant="contained" onClick={handleBack}>
            Ver Produtos
          </Button>
        </Paper>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onViewDetails={() => handleViewDetails(order)}
            onPayNow={() => handlePayNow(order)}
          />
        ))
      )}

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        onPayNow={() => selectedOrder && handlePayNow(selectedOrder)}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        order={selectedOrder}
        paymentLink={paymentLink}
        isLoading={isGeneratingPayment}
      />
    </Box>
  );
}
