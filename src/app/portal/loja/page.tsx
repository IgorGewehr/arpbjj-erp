'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Skeleton,
  Button,
  Badge,
  IconButton,
  Dialog,
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
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStoreCart } from '@/hooks';
import { useAuth, useFeedback } from '@/components/providers';
import { AcademyIndicator } from '@/components/portal/AcademyIndicator';
import { StoreProduct, CartItemInput, STORE_CATEGORY_LABELS } from '@/types';

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
// Product Card Component
// ============================================
interface ProductCardProps {
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stockType === 'in_stock' && (product.stockQuantity ?? 0) === 0;

  return (
    <Box
      onClick={() => !isOutOfStock && onAddToCart(product)}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        border: '1px solid',
        borderColor: 'grey.200',
        opacity: isOutOfStock ? 0.6 : 1,
        cursor: isOutOfStock ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': !isOutOfStock ? {
          borderColor: 'primary.main',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        } : {},
      }}
    >
      {/* Image */}
      <Box
        sx={{
          height: { xs: 100, sm: 120 },
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          <Package size={28} color="#D1D5DB" />
        )}
        {isOutOfStock && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
              Esgotado
            </Typography>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ p: 1.5 }}>
        <Typography
          sx={{
            fontSize: { xs: '0.8rem', sm: '0.85rem' },
            fontWeight: 600,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: { xs: '2.1rem', sm: '2.2rem' },
          }}
        >
          {product.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: '0.95rem', sm: '1rem' },
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            R$ {product.price.toFixed(2).replace('.', ',')}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.6rem',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              px: 0.75,
              py: 0.25,
              borderRadius: 0.5,
            }}
          >
            {STORE_CATEGORY_LABELS[product.category]}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ============================================
// Product Detail Dialog
// ============================================
interface ProductDialogProps {
  product: StoreProduct | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItemInput) => void;
}

function ProductDialog({ product, open, onClose, onAddToCart }: ProductDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [imageIndex, setImageIndex] = useState(0);

  const handleAdd = () => {
    if (!product) return;

    onAddToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      displayPrice: product.price,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });

    setQuantity(1);
    setSelectedSize('');
    setSelectedColor('');
    setImageIndex(0);
    onClose();
  };

  if (!product) return null;

  const maxQuantity = product.stockType === 'in_stock' ? (product.stockQuantity ?? 0) : 99;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'hidden' },
      }}
    >
      {/* Image carousel */}
      {product.images.length > 0 && (
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ height: 300, bgcolor: 'grey.100', overflow: 'hidden' }}>
            <img
              src={product.images[imageIndex]}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <X size={16} />
          </IconButton>
          {product.images.length > 1 && (
            <>
              <IconButton
                size="small"
                onClick={() => setImageIndex((i) => (i - 1 + product.images.length) % product.images.length)}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': { bgcolor: '#fff' },
                }}
              >
                <ChevronLeft size={16} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setImageIndex((i) => (i + 1) % product.images.length)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': { bgcolor: '#fff' },
                }}
              >
                <ChevronRight size={16} />
              </IconButton>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 0.5,
                }}
              >
                {product.images.map((_, i) => (
                  <Box
                    key={i}
                    onClick={() => setImageIndex(i)}
                    sx={{
                      width: i === imageIndex ? 16 : 6,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: i === imageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      <DialogContent sx={{ p: 2.5 }}>
        {!product.images.length && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <IconButton size="small" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </Box>
        )}

        <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, mb: 0.5 }}>
          {product.name}
        </Typography>

        <Typography
          sx={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'primary.main',
            mb: 1.5,
          }}
        >
          R$ {product.price.toFixed(2).replace('.', ',')}
        </Typography>

        {product.description && (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
            {product.description}
          </Typography>
        )}

        {product.stockType === 'in_stock' && (
          <Typography sx={{ fontSize: '0.8rem', color: (product.stockQuantity ?? 0) <= 5 ? 'warning.main' : 'text.secondary', mb: 1.5 }}>
            {product.stockQuantity ?? 0} disponível{(product.stockQuantity ?? 0) !== 1 ? 'is' : ''}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {product.sizes && product.sizes.length > 0 && (
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
          )}

          {product.colors && product.colors.length > 0 && (
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
          )}

          {/* Quantity */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              bgcolor: 'grey.50',
              borderRadius: 1.5,
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
              Quantidade
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton
                size="small"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                sx={{
                  width: 28,
                  height: 28,
                  border: '1px solid',
                  borderColor: 'grey.300',
                }}
              >
                <Minus size={14} />
              </IconButton>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, minWidth: 24, textAlign: 'center' }}>
                {quantity}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                sx={{
                  width: 28,
                  height: 28,
                  border: '1px solid',
                  borderColor: 'grey.300',
                }}
              >
                <Plus size={14} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<ShoppingCart size={16} />}
          onClick={handleAdd}
          disabled={
            (product.sizes && product.sizes.length > 0 && !selectedSize) ||
            (product.colors && product.colors.length > 0 && !selectedColor)
          }
          sx={{
            py: 1.25,
            borderRadius: 2,
            fontSize: '0.9rem',
          }}
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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
        gap: { xs: 1.5, sm: 2 },
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
          <Skeleton variant="rectangular" height={100} />
          <Box sx={{ p: 1.5 }}>
            <Skeleton variant="text" width="90%" height={18} />
            <Skeleton variant="text" width="60%" height={18} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="rounded" width={50} height={16} />
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
export default function PortalLojaPage() {
  const router = useRouter();
  const { success } = useFeedback();
  const { products, isLoadingProducts, isStorePublished, welcomeMessage } = useStoreCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItemInput[]>(() => getCart());

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

  const handleAddToCart = useCallback((item: CartItemInput) => {
    setCartItems((prev) => {
      // Check if same product with same options exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.color === item.color
      );

      let newItems: CartItemInput[];
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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Academy indicator for multi-academy users */}
      <AcademyIndicator label="Loja de" icon={<Store size={16} />} />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 700 }}>
            Loja
          </Typography>
          {welcomeMessage && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.25 }}>
              {welcomeMessage}
            </Typography>
          )}
        </Box>
        <Badge badgeContent={cartCount} color="primary">
          <IconButton
            onClick={handleGoToCart}
            sx={{
              bgcolor: '#fff',
              border: '1px solid',
              borderColor: 'grey.200',
              '&:hover': { bgcolor: 'grey.50' },
            }}
          >
            <ShoppingCart size={18} />
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
          <Package size={32} color="#D1D5DB" />
          <Typography sx={{ mt: 1.5, fontSize: '0.9rem', color: 'text.secondary' }}>
            {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto disponivel'}
          </Typography>
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
            },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleOpenProduct}
            />
          ))}
        </Box>
      )}

      {/* Cart FAB */}
      {cartCount > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 80, md: 24 },
            right: 24,
            zIndex: 1200,
          }}
        >
          <Button
            variant="contained"
            startIcon={<ShoppingCart size={16} />}
            onClick={handleGoToCart}
            sx={{
              py: 1.25,
              px: 2.5,
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              fontSize: '0.85rem',
            }}
          >
            Carrinho ({cartCount})
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
