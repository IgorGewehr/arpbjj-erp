'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Skeleton,
  Alert,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  ShoppingCart,
  MoreVertical,
  Eye,
  EyeOff,
  Store,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStore } from '@/hooks';
import { useConfirmDialog } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { StoreProduct, STORE_CATEGORY_LABELS } from '@/types';

// ============================================
// Product Card Component
// ============================================
interface ProductCardProps {
  product: StoreProduct;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function ProductCard({ product, onEdit, onDelete, onToggleActive }: ProductCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit();
  };

  const handleToggleActive = () => {
    handleMenuClose();
    onToggleActive();
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete();
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'grey.200',
        opacity: product.active ? 1 : 0.5,
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      {/* Image */}
      <Box
        onClick={onEdit}
        sx={{
          height: 120,
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Package size={32} color="#D1D5DB" />
        )}
        {!product.active && (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              left: 6,
              bgcolor: 'grey.700',
              color: '#fff',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
              fontSize: '0.65rem',
              fontWeight: 600,
            }}
          >
            Inativo
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box
            onClick={onEdit}
            sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          >
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 600,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {product.name}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'primary.main',
                mt: 0.25,
              }}
            >
              R$ {product.price.toFixed(2).replace('.', ',')}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{ ml: 0.5, mt: -0.5 }}
          >
            <MoreVertical size={16} />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
            }}
          >
            {STORE_CATEGORY_LABELS[product.category]}
          </Typography>
          {product.stockType === 'in_stock' && (
            <Typography
              sx={{
                fontSize: '0.65rem',
                color: product.stockQuantity && product.stockQuantity > 0 ? '#16A34A' : '#DC2626',
                bgcolor: product.stockQuantity && product.stockQuantity > 0 ? '#DCFCE7' : '#FEE2E2',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
              }}
            >
              {product.stockQuantity ?? 0} em estoque
            </Typography>
          )}
          {product.stockType === 'on_demand' && (
            <Typography
              sx={{
                fontSize: '0.65rem',
                color: '#2563EB',
                bgcolor: '#DBEAFE',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
              }}
            >
              Sob demanda
            </Typography>
          )}
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit} sx={{ fontSize: '0.85rem' }}>
          <ListItemIcon>
            <Edit2 size={16} />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleActive} sx={{ fontSize: '0.85rem' }}>
          <ListItemIcon>
            {product.active ? <EyeOff size={16} /> : <Eye size={16} />}
          </ListItemIcon>
          <ListItemText>{product.active ? 'Desativar' : 'Ativar'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main', fontSize: '0.85rem' }}>
          <ListItemIcon>
            <Trash2 size={16} color="currentColor" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ============================================
// Products Loading Skeleton
// ============================================
function ProductsSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
          xl: 'repeat(6, 1fr)',
        },
        gap: 2,
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Box
          key={i}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Skeleton variant="rectangular" height={120} />
          <Box sx={{ p: 1.5 }}>
            <Skeleton variant="text" width="80%" height={18} />
            <Skeleton variant="text" width="50%" height={20} />
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
              <Skeleton variant="rounded" width={50} height={16} />
              <Skeleton variant="rounded" width={70} height={16} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ============================================
// Main Page
// ============================================
export default function LojaPage() {
  const router = useRouter();
  const { academy } = useAcademy();
  const { confirm } = useConfirmDialog();
  const {
    products,
    isLoadingProducts,
    deleteProduct,
    updateProduct,
    isDeletingProduct,
    isUpdatingProduct,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Handlers
  const handleCreateProduct = () => {
    router.push('/loja/produto/novo');
  };

  const handleEditProduct = (id: string) => {
    router.push(`/loja/produto/${id}`);
  };

  const handleDeleteProduct = async (product: StoreProduct) => {
    const confirmed = await confirm({
      title: 'Excluir Produto',
      message: `Tem certeza que deseja excluir o produto "${product.name}"?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      severity: 'error',
    });
    if (confirmed) {
      await deleteProduct(product.id);
    }
  };

  const handleToggleActive = async (product: StoreProduct) => {
    await updateProduct({
      id: product.id,
      data: { active: !product.active },
    });
  };

  const handleGoToOrders = () => {
    router.push('/loja/pedidos');
  };

  // Check if store is enabled
  if (!academy?.storeEnabled) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              p: 4,
            }}
          >
            <Store size={64} color="#9CA3AF" />
            <Typography variant="h5" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
              Loja Desativada
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Ative a loja nas configuracoes para comecar a vender produtos.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/configuracoes')}
            >
              Ir para Configuracoes
            </Button>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 700 }}>
                Loja
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                Gerencie produtos e acompanhe pedidos
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<ShoppingCart size={16} />}
                onClick={handleGoToOrders}
                sx={{ fontSize: '0.85rem' }}
              >
                Ver Pedidos
              </Button>
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={handleCreateProduct}
                sx={{ fontSize: '0.85rem' }}
              >
                Novo Produto
              </Button>
            </Box>
          </Box>

          {/* Store Status Alert */}
          {!academy?.storePublished && (
            <Alert
              severity="warning"
              sx={{ mb: 3, borderRadius: 2, fontSize: '0.85rem' }}
              icon={<AlertCircle size={18} />}
            >
              Sua loja esta em modo rascunho. Publique nas configuracoes quando estiver pronta.
            </Alert>
          )}

          {/* Search */}
          <TextField
            fullWidth
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#9CA3AF" />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fff',
                fontSize: '0.875rem',
              },
            }}
          />

          {/* Products Grid */}
          {isLoadingProducts ? (
            <ProductsSkeleton />
          ) : filteredProducts.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: '#fff',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Package size={36} color="#D1D5DB" />
              <Typography sx={{ mt: 1.5, fontSize: '0.95rem', fontWeight: 500 }}>
                {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
                {searchQuery
                  ? 'Tente buscar por outro termo'
                  : 'Comece adicionando seu primeiro produto'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={handleCreateProduct}
                >
                  Adicionar Produto
                </Button>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                  xl: 'repeat(6, 1fr)',
                },
                gap: 2,
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => handleEditProduct(product.id)}
                  onDelete={() => handleDeleteProduct(product)}
                  onToggleActive={() => handleToggleActive(product)}
                />
              ))}
            </Box>
          )}
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
