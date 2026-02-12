'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Skeleton,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Plus,
  Package,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStore } from '@/hooks';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { StoreProductCategory, StoreStockType, STORE_CATEGORY_LABELS } from '@/types';

// ============================================
// Constants
// ============================================
const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

// ============================================
// Loading Skeleton
// ============================================
function FormSkeleton() {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant="rectangular" height={56} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant="rectangular" height={100} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Skeleton variant="rectangular" height={56} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Skeleton variant="rectangular" height={56} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant="rectangular" height={40} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Skeleton variant="rectangular" height={120} />
        </Grid>
      </Grid>
    </Paper>
  );
}

// ============================================
// Main Page
// ============================================
export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { academy, isLoading: isAcademyLoading } = useAcademy();
  const { success, error: showError } = useFeedback();
  const { getProduct, updateProduct, isUpdatingProduct } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<StoreProductCategory>('uniform');
  const [stockType, setStockType] = useState<StoreStockType>('in_stock');
  const [stockQuantity, setStockQuantity] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load product data
  useEffect(() => {
    // Wait for academy to load
    if (isAcademyLoading || !academy) return;

    const loadProduct = async () => {
      try {
        const product = await getProduct(productId);
        if (!product) {
          setNotFound(true);
          return;
        }

        setName(product.name);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setCategory(product.category);
        setStockType(product.stockType);
        setStockQuantity(product.stockQuantity?.toString() || '');
        setSizes(product.sizes || []);
        setColors(product.colors || []);
        setImages(product.images || []);
        setActive(product.active);
      } catch (err) {
        showError('Erro ao carregar produto');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, getProduct, showError, isAcademyLoading, academy]);

  // Handlers
  const handleAddSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes([...sizes, newSize.trim()]);
      setNewSize('');
    }
  };

  const handleRemoveSize = (size: string) => {
    setSizes(sizes.filter((s) => s !== size));
  };

  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors([...colors, newColor.trim()]);
      setNewColor('');
    }
  };

  const handleRemoveColor = (color: string) => {
    setColors(colors.filter((c) => c !== color));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      showError(`Maximo de ${MAX_IMAGES} imagens permitido`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error('Arquivo deve ser uma imagem');
        }

        if (file.size > MAX_IMAGE_SIZE) {
          throw new Error('Imagem deve ter no maximo 1MB');
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const storageRef = ref(
          storage,
          `academies/${academy?.id}/products/${productId}_${timestamp}_${randomId}`
        );
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      });

      const urls = await Promise.all(uploadPromises);
      setImages([...images, ...urls]);
      success('Imagens enviadas!');
    } catch (err: any) {
      showError(err.message || 'Erro ao enviar imagens');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      showError('Nome do produto e obrigatorio');
      return;
    }

    const priceValue = parseFloat(price || '0');
    if (priceValue <= 0) {
      showError('Preco deve ser maior que zero');
      return;
    }

    if (stockType === 'in_stock') {
      const stockValue = parseInt(stockQuantity || '0');
      if (stockValue < 0) {
        showError('Quantidade em estoque nao pode ser negativa');
        return;
      }
    }

    try {
      await updateProduct({
        id: productId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          price: priceValue,
          images,
          category,
          stockType,
          stockQuantity: stockType === 'in_stock' ? parseInt(stockQuantity || '0') : undefined,
          sizes: sizes.length > 0 ? sizes : undefined,
          colors: colors.length > 0 ? colors : undefined,
          active,
        },
      });

      router.push('/loja');
    } catch (err) {
      // Error handled by mutation
    }
  };

  if (loading || isAcademyLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box>
                <Skeleton variant="text" width={200} />
                <Skeleton variant="text" width={150} />
              </Box>
            </Box>
            <FormSkeleton />
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (notFound) {
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
            <Package size={64} color="#9CA3AF" />
            <Typography variant="h5" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
              Produto nao encontrado
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              O produto que voce esta procurando nao existe ou foi removido.
            </Typography>
            <Button variant="contained" onClick={() => router.push('/loja')}>
              Voltar para Loja
            </Button>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <IconButton onClick={() => router.back()}>
              <ArrowLeft />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Editar Produto
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Atualize as informacoes do produto
              </Typography>
            </Box>
          </Box>

          {/* Form */}
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nome do Produto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Package size={18} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Descricao"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Descreva o produto..."
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Preco (R$)"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as StoreProductCategory)}
                    label="Categoria"
                  >
                    {Object.entries(STORE_CATEGORY_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Stock Type */}
              <Grid size={{ xs: 12 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Tipo de Estoque</FormLabel>
                  <RadioGroup
                    row
                    value={stockType}
                    onChange={(e) => setStockType(e.target.value as StoreStockType)}
                  >
                    <FormControlLabel
                      value="in_stock"
                      control={<Radio />}
                      label="Manter estoque"
                    />
                    <FormControlLabel
                      value="on_demand"
                      control={<Radio />}
                      label="Sob demanda"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {stockType === 'in_stock' && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Quantidade em Estoque"
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              )}

              {/* Sizes */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Tamanhos Disponiveis
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {sizes.map((size) => (
                    <Chip
                      key={size}
                      label={size}
                      onDelete={() => handleRemoveSize(size)}
                      size="small"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Ex: M, G, GG"
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSize()}
                    sx={{ width: 150 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddSize}
                    startIcon={<Plus size={16} />}
                  >
                    Adicionar
                  </Button>
                </Box>
              </Grid>

              {/* Colors */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Cores Disponiveis
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {colors.map((color) => (
                    <Chip
                      key={color}
                      label={color}
                      onDelete={() => handleRemoveColor(color)}
                      size="small"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Ex: Branco, Azul"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddColor()}
                    sx={{ width: 150 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddColor}
                    startIcon={<Plus size={16} />}
                  >
                    Adicionar
                  </Button>
                </Box>
              </Grid>

              {/* Images */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Imagens (max {MAX_IMAGES})
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {images.map((url, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <img
                        src={url}
                        alt={`Imagem ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveImage(index)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'error.light', color: 'white' },
                        }}
                      >
                        <X size={14} />
                      </IconButton>
                    </Box>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <Box
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: 2,
                        border: '2px dashed',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      {uploading ? (
                        <CircularProgress size={24} />
                      ) : (
                        <>
                          <Upload size={24} color="#9CA3AF" />
                          <Typography variant="caption" color="text.secondary">
                            Upload
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  PNG, JPG ou WebP. Max 1MB por imagem.
                </Typography>
              </Grid>

              {/* Active Status */}
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        Produto ativo
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Produtos inativos nao aparecem para os alunos
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => router.back()}
              disabled={isUpdatingProduct}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={
                isUpdatingProduct ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Save size={18} />
                )
              }
              onClick={handleSubmit}
              disabled={isUpdatingProduct}
            >
              {isUpdatingProduct ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </Box>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
