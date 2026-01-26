'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  IconButton,
  Chip,
  Skeleton,
  Alert,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
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
    <Card
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        opacity: product.active ? 1 : 0.6,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={onEdit}>
        <CardMedia
          component="div"
          sx={{
            height: 160,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
            <Package size={48} color="#9CA3AF" />
          )}
        </CardMedia>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {product.name}
              </Typography>
              <Typography variant="h6" color="primary" fontWeight={700}>
                R$ {(product.price / 100).toFixed(2)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{ ml: 1 }}
            >
              <MoreVertical size={18} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={STORE_CATEGORY_LABELS[product.category]}
              size="small"
              variant="outlined"
            />
            {product.stockType === 'in_stock' && (
              <Chip
                label={`${product.stockQuantity ?? 0} em estoque`}
                size="small"
                color={product.stockQuantity && product.stockQuantity > 0 ? 'success' : 'error'}
                variant="outlined"
              />
            )}
            {product.stockType === 'on_demand' && (
              <Chip
                label="Sob demanda"
                size="small"
                color="info"
                variant="outlined"
              />
            )}
            {!product.active && (
              <Chip
                label="Inativo"
                size="small"
                color="default"
              />
            )}
          </Box>
        </CardContent>
      </CardActionArea>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit2 size={18} />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleActive}>
          <ListItemIcon>
            {product.active ? <EyeOff size={18} /> : <Eye size={18} />}
          </ListItemIcon>
          <ListItemText>{product.active ? 'Desativar' : 'Ativar'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Trash2 size={18} color="currentColor" />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}

// ============================================
// Products Loading Skeleton
// ============================================
function ProductsSkeleton() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
          <Card sx={{ borderRadius: 2 }}>
            <Skeleton variant="rectangular" height={160} />
            <CardContent>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Skeleton variant="rounded" width={80} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
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
        <AppLayout title="Loja">
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
      <AppLayout title="Loja">
        <Box>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 3,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Loja
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie produtos e acompanhe pedidos
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ShoppingCart size={18} />}
                onClick={handleGoToOrders}
              >
                Ver Pedidos
              </Button>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={handleCreateProduct}
              >
                Novo Produto
              </Button>
            </Box>
          </Box>

          {/* Store Status Alert */}
          {!academy?.storePublished && (
            <Alert
              severity="warning"
              sx={{ mb: 3, borderRadius: 2 }}
              icon={<AlertCircle size={20} />}
            >
              Sua loja esta em modo rascunho. Os alunos nao conseguem ver os produtos.
              Publique a loja nas configuracoes quando estiver pronta.
            </Alert>
          )}

          {/* Search */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar produtos..."
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
            />
          </Paper>

          {/* Products Grid */}
          {isLoadingProducts ? (
            <ProductsSkeleton />
          ) : filteredProducts.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 2,
              }}
            >
              <Package size={48} color="#9CA3AF" />
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery
                  ? 'Tente buscar por outro termo'
                  : 'Comece adicionando seu primeiro produto'}
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={handleCreateProduct}
                >
                  Adicionar Produto
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredProducts.map((product) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <ProductCard
                    product={product}
                    onEdit={() => handleEditProduct(product.id)}
                    onDelete={() => handleDeleteProduct(product)}
                    onToggleActive={() => handleToggleActive(product)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
