'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  TextField,
  InputAdornment,
  Skeleton,
  Button,
  Badge,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  X,
} from 'lucide-react';
import { useStoreCart } from '@/hooks';
import { useAuth, useFeedback } from '@/components/providers';
import { StoreProduct, StoreOrderItem, STORE_CATEGORY_LABELS } from '@/types';

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
// Product Card Component
// ============================================
interface ProductCardProps {
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stockType === 'in_stock' && (product.stockQuantity ?? 0) === 0;

  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        opacity: isOutOfStock ? 0.6 : 1,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea onClick={() => !isOutOfStock && onAddToCart(product)} disabled={isOutOfStock}>
        <CardMedia
          component="div"
          sx={{
            height: 140,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
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
            <Package size={40} color="#9CA3AF" />
          )}
          {isOutOfStock && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'error.main',
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              Esgotado
            </Box>
          )}
        </CardMedia>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {product.name}
          </Typography>
          <Typography variant="h6" color="primary" fontWeight={700} sx={{ mt: 0.5 }}>
            R$ {(product.price / 100).toFixed(2)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            <Chip
              label={STORE_CATEGORY_LABELS[product.category]}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ============================================
// Product Detail Dialog
// ============================================
interface ProductDialogProps {
  product: StoreProduct | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (item: StoreOrderItem) => void;
}

function ProductDialog({ product, open, onClose, onAddToCart }: ProductDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const handleAdd = () => {
    if (!product) return;

    onAddToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });

    setQuantity(1);
    setSelectedSize('');
    setSelectedColor('');
    onClose();
  };

  if (!product) return null;

  const maxQuantity = product.stockType === 'in_stock' ? (product.stockQuantity ?? 0) : 99;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" fontWeight={600}>
            {product.name}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {product.images.length > 0 && (
          <Box
            sx={{
              height: 200,
              borderRadius: 2,
              overflow: 'hidden',
              mb: 2,
            }}
          >
            <img
              src={product.images[0]}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        )}

        {product.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {product.description}
          </Typography>
        )}

        <Typography variant="h5" color="primary" fontWeight={700} sx={{ mb: 2 }}>
          R$ {(product.price / 100).toFixed(2)}
        </Typography>

        <Grid container spacing={2}>
          {product.sizes && product.sizes.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tamanho</InputLabel>
                <Select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  label="Tamanho"
                >
                  {product.sizes.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {product.colors && product.colors.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cor</InputLabel>
                <Select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  label="Cor"
                >
                  {product.colors.map((color) => (
                    <MenuItem key={color} value={color}>
                      {color}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" fontWeight={500}>
                Quantidade:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </IconButton>
                <Typography variant="body1" fontWeight={600} sx={{ minWidth: 24, textAlign: 'center' }}>
                  {quantity}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus size={16} />
                </IconButton>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<ShoppingCart size={18} />}
          onClick={handleAdd}
          disabled={
            (product.sizes && product.sizes.length > 0 && !selectedSize) ||
            (product.colors && product.colors.length > 0 && !selectedColor)
          }
        >
          Adicionar ao Carrinho
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Loading Skeleton
// ============================================
function ProductsSkeleton() {
  return (
    <Grid container spacing={2}>
      {[1, 2, 3, 4].map((i) => (
        <Grid size={{ xs: 6 }} key={i}>
          <Card sx={{ borderRadius: 3 }}>
            <Skeleton variant="rectangular" height={140} />
            <CardContent sx={{ p: 2 }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="rounded" width={60} height={20} sx={{ mt: 1 }} />
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
export default function PortalLojaPage() {
  const router = useRouter();
  const { success } = useFeedback();
  const { products, isLoadingProducts, isStorePublished, welcomeMessage } = useStoreCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cartItems, setCartItems] = useState<StoreOrderItem[]>(() => getCart());

  // Calculate cart count
  const cartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

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
  const handleOpenProduct = (product: StoreProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleAddToCart = useCallback((item: StoreOrderItem) => {
    setCartItems((prev) => {
      // Check if same product with same options exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color
      );

      let newItems: StoreOrderItem[];
      if (existingIndex >= 0) {
        // Update quantity
        newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + item.quantity,
        };
      } else {
        // Add new item
        newItems = [...prev, item];
      }

      saveCart(newItems);
      return newItems;
    });
    success('Produto adicionado ao carrinho!');
  }, [success]);

  const handleGoToCart = () => {
    router.push('/portal/loja/carrinho');
  };

  if (!isStorePublished) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Package size={48} color="#9CA3AF" />
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Loja Indisponivel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          A loja da academia esta temporariamente fechada.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Loja
          </Typography>
          {welcomeMessage && (
            <Typography variant="body2" color="text.secondary">
              {welcomeMessage}
            </Typography>
          )}
        </Box>
        <Badge badgeContent={cartCount} color="primary">
          <IconButton
            onClick={handleGoToCart}
            sx={{
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'grey.200' },
            }}
          >
            <ShoppingCart size={20} />
          </IconButton>
        </Badge>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Buscar produtos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} />
            </InputAdornment>
          ),
        }}
        size="small"
        sx={{ mb: 3 }}
      />

      {/* Products Grid */}
      {isLoadingProducts ? (
        <ProductsSkeleton />
      ) : filteredProducts.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Package size={40} color="#9CA3AF" />
          <Typography variant="body1" sx={{ mt: 2 }}>
            {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto disponivel'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredProducts.map((product) => (
            <Grid size={{ xs: 6 }} key={product.id}>
              <ProductCard
                product={product}
                onAddToCart={handleOpenProduct}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Cart FAB */}
      {cartCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            size="large"
            startIcon={<ShoppingCart size={18} />}
            onClick={handleGoToCart}
            sx={{
              py: 1.5,
              borderRadius: 3,
              boxShadow: 4,
            }}
          >
            Ver Carrinho ({cartCount} {cartCount === 1 ? 'item' : 'itens'})
          </Button>
        </Box>
      )}

      {/* Product Detail Dialog */}
      <ProductDialog
        product={selectedProduct}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </Box>
  );
}
