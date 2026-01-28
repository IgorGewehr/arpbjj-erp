'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  ArrowLeft,
  MoreVertical,
  Eye,
  PackageCheck,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  ShoppingCart,
  Filter,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStore } from '@/hooks';
import { useConfirmDialog } from '@/components/providers';
import {
  StoreOrder,
  StoreOrderStatus,
  STORE_ORDER_STATUS_LABELS,
  STORE_ORDER_STATUS_COLORS,
} from '@/types';

// ============================================
// Order Detail Dialog
// ============================================
interface OrderDetailDialogProps {
  order: StoreOrder | null;
  open: boolean;
  onClose: () => void;
}

function OrderDetailDialog({ order, open, onClose }: OrderDetailDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Pedido #{order.id.slice(-6).toUpperCase()}
          </Typography>
          <Chip
            label={STORE_ORDER_STATUS_LABELS[order.status]}
            color={STORE_ORDER_STATUS_COLORS[order.status]}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Cliente
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {order.studentName}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Data do Pedido
          </Typography>
          <Typography variant="body1">
            {format(order.createdAt, "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
          </Typography>
        </Box>

        {order.paidAt && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Data do Pagamento
            </Typography>
            <Typography variant="body1">
              {format(order.paidAt, "dd 'de' MMMM 'de' yyyy 'as' HH:mm", { locale: ptBR })}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Itens do Pedido
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell align="center">Qtd</TableCell>
                <TableCell align="right">Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2">{item.productName}</Typography>
                    {(item.size || item.color) && (
                      <Typography variant="caption" color="text.secondary">
                        {[item.size, item.color].filter(Boolean).join(' - ')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">
                    R$ {((item.unitPrice * item.quantity) / 100).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Total
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" fontWeight={600} color="primary">
                    R$ {(order.totalAmount / 100).toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {order.notes && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Observacoes
            </Typography>
            <Typography variant="body2">{order.notes}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Order Row Component
// ============================================
interface OrderRowProps {
  order: StoreOrder;
  onViewDetails: () => void;
  onUpdateStatus: (status: StoreOrderStatus) => void;
  onCancel: () => void;
}

function OrderRow({ order, onViewDetails, onUpdateStatus, onCancel }: OrderRowProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getNextStatus = (): StoreOrderStatus | null => {
    switch (order.status) {
      case 'paid':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'delivered';
      default:
        return null;
    }
  };

  const getNextStatusLabel = (): string => {
    const next = getNextStatus();
    if (!next) return '';
    return STORE_ORDER_STATUS_LABELS[next];
  };

  const getStatusIcon = (status: StoreOrderStatus) => {
    switch (status) {
      case 'pending_payment':
        return <ShoppingCart size={16} />;
      case 'paid':
        return <CheckCircle size={16} />;
      case 'preparing':
        return <Package size={16} />;
      case 'ready':
        return <PackageCheck size={16} />;
      case 'delivered':
        return <Truck size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
    }
  };

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          #{order.id.slice(-6).toUpperCase()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {format(order.createdAt, 'dd/MM/yyyy HH:mm')}
        </Typography>
      </TableCell>
      <TableCell>{order.studentName}</TableCell>
      <TableCell>
        <Typography variant="body2">
          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight={600}>
          R$ {(order.totalAmount / 100).toFixed(2)}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          icon={getStatusIcon(order.status)}
          label={STORE_ORDER_STATUS_LABELS[order.status]}
          color={STORE_ORDER_STATUS_COLORS[order.status]}
          size="small"
        />
      </TableCell>
      <TableCell align="right">
        <IconButton size="small" onClick={handleMenuOpen}>
          <MoreVertical size={18} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              handleMenuClose();
              onViewDetails();
            }}
          >
            <ListItemIcon>
              <Eye size={18} />
            </ListItemIcon>
            <ListItemText>Ver Detalhes</ListItemText>
          </MenuItem>
          {getNextStatus() && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onUpdateStatus(getNextStatus()!);
              }}
            >
              <ListItemIcon>
                {getStatusIcon(getNextStatus()!)}
              </ListItemIcon>
              <ListItemText>Marcar como {getNextStatusLabel()}</ListItemText>
            </MenuItem>
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onCancel();
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <XCircle size={18} color="currentColor" />
              </ListItemIcon>
              <ListItemText>Cancelar Pedido</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </TableCell>
    </TableRow>
  );
}

// ============================================
// Loading Skeleton
// ============================================
function TableSkeleton() {
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Pedido</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Itens</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Acoes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton variant="text" width={80} />
                <Skeleton variant="text" width={120} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={150} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={60} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={80} />
              </TableCell>
              <TableCell>
                <Skeleton variant="rounded" width={100} height={24} />
              </TableCell>
              <TableCell align="right">
                <Skeleton variant="circular" width={32} height={32} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ============================================
// Main Page
// ============================================
export default function PedidosPage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const {
    orders,
    isLoadingOrders,
    updateOrderStatus,
    cancelOrder,
    isUpdatingOrderStatus,
    isCancellingOrder,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StoreOrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.studentName.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  // Handlers
  const handleViewDetails = (order: StoreOrder) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleUpdateStatus = async (order: StoreOrder, status: StoreOrderStatus) => {
    await updateOrderStatus({ id: order.id, status });
  };

  const handleCancelOrder = async (order: StoreOrder) => {
    const confirmed = await confirm({
      title: 'Cancelar Pedido',
      message: `Tem certeza que deseja cancelar o pedido #${order.id.slice(-6).toUpperCase()}?`,
      confirmText: 'Cancelar Pedido',
      cancelText: 'Voltar',
      severity: 'error',
    });
    if (confirmed) {
      await cancelOrder(order.id);
    }
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value as StoreOrderStatus | 'all');
  };

  return (
    <ProtectedRoute>
      <AppLayout title="Pedidos">
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.push('/loja')}>
              <ArrowLeft />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Pedidos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie os pedidos da loja
              </Typography>
            </Box>
          </Box>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                placeholder="Buscar por cliente ou pedido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} />
                    </InputAdornment>
                  ),
                }}
                size="small"
                sx={{ minWidth: 250, flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                  startAdornment={
                    <InputAdornment position="start">
                      <Filter size={16} />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {Object.entries(STORE_ORDER_STATUS_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {/* Orders Table */}
          {isLoadingOrders ? (
            <TableSkeleton />
          ) : filteredOrders.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 2,
              }}
            >
              <ShoppingCart size={48} color="#9CA3AF" />
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Nenhum pedido encontrado'
                  : 'Nenhum pedido ainda'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery || statusFilter !== 'all'
                  ? 'Tente alterar os filtros'
                  : 'Quando alunos fizerem pedidos, eles aparecerao aqui'}
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pedido</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Itens</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Acoes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onViewDetails={() => handleViewDetails(order)}
                      onUpdateStatus={(status) => handleUpdateStatus(order, status)}
                      onCancel={() => handleCancelOrder(order)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Order Detail Dialog */}
          <OrderDetailDialog
            order={selectedOrder}
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
          />
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
