'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createStoreService, CreateProductData, CreateOrderData } from '@/services/storeService';
import { useFeedback, useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { StoreProduct, StoreOrder, StoreOrderStatus, StoreOrderItem, CartItemInput, FinancialPaymentLink } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  products: 'storeProducts',
  activeProducts: 'storeActiveProducts',
  product: 'storeProduct',
  orders: 'storeOrders',
  order: 'storeOrder',
  studentOrders: 'storeStudentOrders',
};

// ============================================
// useStore Hook
// ============================================
export function useStore() {
  const { success, error: showError } = useFeedback();
  const { user } = useAuth();
  const { academy } = useAcademy();
  const queryClient = useQueryClient();

  // Create service instance
  const storeService = useMemo(() => {
    if (!academy?.id) return null;
    return createStoreService(academy.id);
  }, [academy?.id]);

  // ============================================
  // Fetch All Products
  // ============================================
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: [QUERY_KEYS.products, academy?.id],
    queryFn: () => storeService?.getProducts() ?? Promise.resolve([]),
    enabled: !!storeService,
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Fetch Active Products
  // ============================================
  const { data: activeProducts = [] } = useQuery({
    queryKey: [QUERY_KEYS.activeProducts, academy?.id],
    queryFn: () => storeService?.getActiveProducts() ?? Promise.resolve([]),
    enabled: !!storeService,
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Create Product Mutation
  // ============================================
  const createProductMutation = useMutation({
    mutationFn: async (data: CreateProductData) => {
      if (!storeService) throw new Error('Store service not available');
      return storeService.createProduct(data);
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeProducts] });
      success(`Produto "${newProduct.name}" criado com sucesso!`);
    },
    onError: () => {
      showError('Erro ao criar produto');
    },
  });

  // ============================================
  // Update Product Mutation
  // ============================================
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductData> }) => {
      if (!storeService) throw new Error('Store service not available');
      return storeService.updateProduct(id, data);
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeProducts] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.product, updatedProduct.id] });
      success('Produto atualizado com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar produto');
    },
  });

  // ============================================
  // Delete Product Mutation
  // ============================================
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storeService) throw new Error('Store service not available');
      return storeService.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.products] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeProducts] });
      success('Produto removido com sucesso!');
    },
    onError: () => {
      showError('Erro ao remover produto');
    },
  });

  // ============================================
  // Get Product by ID
  // ============================================
  const getProduct = useCallback(async (id: string): Promise<StoreProduct | null> => {
    if (!storeService) return null;
    return storeService.getProductById(id);
  }, [storeService]);

  // ============================================
  // Fetch All Orders
  // ============================================
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [QUERY_KEYS.orders, academy?.id],
    queryFn: () => storeService?.getOrders() ?? Promise.resolve([]),
    enabled: !!storeService,
    staleTime: 1000 * 60 * 2,
  });

  // ============================================
  // Create Order Mutation
  // ============================================
  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderData) => {
      if (!storeService) throw new Error('Store service not available');
      return storeService.createOrder(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentOrders] });
      success('Pedido criado com sucesso!');
    },
    onError: () => {
      showError('Erro ao criar pedido');
    },
  });

  // ============================================
  // Update Order Status Mutation
  // ============================================
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StoreOrderStatus }) => {
      if (!storeService) throw new Error('Store service not available');
      return storeService.updateOrderStatus(id, status);
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.order, updatedOrder.id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentOrders] });
      success('Status do pedido atualizado!');
    },
    onError: () => {
      showError('Erro ao atualizar status do pedido');
    },
  });

  // ============================================
  // Cancel Order Mutation
  // ============================================
  const cancelOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storeService) throw new Error('Store service not available');
      return storeService.cancelOrder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.orders] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentOrders] });
      success('Pedido cancelado com sucesso!');
    },
    onError: () => {
      showError('Erro ao cancelar pedido');
    },
  });

  // ============================================
  // Generate Payment Mutation (calls API route)
  // ============================================
  const generatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, method = 'PIX' }: { orderId: string; method?: 'PIX' | 'CARD' }): Promise<FinancialPaymentLink | null> => {
      if (!academy?.id) throw new Error('Academy not available');

      const response = await fetch('/api/store/generate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academyId: academy.id,
          orderId,
          method,
          customerEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar pagamento');
      }

      return data.paymentLink;
    },
    onSuccess: (paymentLink, { orderId, method }) => {
      if (paymentLink) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.order, orderId] });
        success(method === 'CARD' ? 'Redirecionando para pagamento...' : 'QR Code PIX gerado com sucesso!');
      } else {
        showError('Erro ao gerar pagamento');
      }
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao gerar pagamento');
    },
  });

  // ============================================
  // Get Order by ID
  // ============================================
  const getOrder = useCallback(async (id: string): Promise<StoreOrder | null> => {
    if (!storeService) return null;
    return storeService.getOrderById(id);
  }, [storeService]);

  // ============================================
  // Get Orders by Student
  // ============================================
  const getOrdersByStudent = useCallback(async (studentId: string): Promise<StoreOrder[]> => {
    if (!storeService) return [];
    return storeService.getOrdersByStudent(studentId);
  }, [storeService]);

  // ============================================
  // Check if Payment is Enabled
  // ============================================
  const checkPaymentEnabled = useCallback(async (): Promise<boolean> => {
    if (!storeService) return false;
    return storeService.isPaymentEnabled();
  }, [storeService]);

  // ============================================
  // Return
  // ============================================
  return {
    // Product Data
    products,
    activeProducts,

    // Product Actions
    getProduct,
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,

    // Order Data
    orders,

    // Order Actions
    getOrder,
    getOrdersByStudent,
    createOrder: createOrderMutation.mutateAsync,
    updateOrderStatus: updateOrderStatusMutation.mutateAsync,
    cancelOrder: cancelOrderMutation.mutateAsync,
    generatePayment: (orderId: string, method?: 'PIX' | 'CARD') => generatePaymentMutation.mutateAsync({ orderId, method }),

    // Payment
    checkPaymentEnabled,

    // Loading states
    isLoadingProducts,
    isLoadingOrders,
    isCreatingProduct: createProductMutation.isPending,
    isUpdatingProduct: updateProductMutation.isPending,
    isDeletingProduct: deleteProductMutation.isPending,
    isCreatingOrder: createOrderMutation.isPending,
    isUpdatingOrderStatus: updateOrderStatusMutation.isPending,
    isCancellingOrder: cancelOrderMutation.isPending,
    isGeneratingPayment: generatePaymentMutation.isPending,

    // Errors
    productsError,
    ordersError,

    // Refresh
    refreshProducts: refetchProducts,
    refreshOrders: refetchOrders,
  };
}

// ============================================
// useStoreCart Hook (for portal/student)
// ============================================
export function useStoreCart() {
  const { success, error: showError } = useFeedback();
  const { user } = useAuth();
  const { academy, academyUser } = useAcademy();
  const queryClient = useQueryClient();

  // Get studentId from academyUser (loaded from academy context)
  const studentId = academyUser?.studentId;
  const studentName = academyUser?.displayName || user?.displayName;

  // Create service instance
  const storeService = useMemo(() => {
    if (!academy?.id) return null;
    return createStoreService(academy.id);
  }, [academy?.id]);

  // ============================================
  // Fetch Active Products
  // ============================================
  const {
    data: products = [],
    isLoading: isLoadingProducts,
  } = useQuery({
    queryKey: [QUERY_KEYS.activeProducts, academy?.id],
    queryFn: () => storeService?.getActiveProducts() ?? Promise.resolve([]),
    enabled: !!storeService && !!academy?.storePublished,
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Fetch Student Orders
  // ============================================
  const {
    data: studentOrders = [],
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [QUERY_KEYS.studentOrders, academy?.id, studentId],
    queryFn: () => {
      if (!storeService || !studentId) return Promise.resolve([]);
      return storeService.getOrdersByStudent(studentId);
    },
    enabled: !!storeService && !!studentId,
    staleTime: 1000 * 60 * 2,
  });

  // ============================================
  // Create Order Mutation
  // ============================================
  const createOrderMutation = useMutation({
    mutationFn: async (items: CartItemInput[]) => {
      if (!storeService) throw new Error('Store service not available');
      if (!studentId || !studentName) throw new Error('Usuario nao vinculado a um aluno. Verifique seu perfil.');

      // SECURITY: Only send productId, quantity, size, color to server
      // Price will be fetched from database on server-side
      return storeService.createOrder({
        studentId: studentId,
        studentName: studentName,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentOrders] });
      success('Pedido realizado com sucesso!');
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao criar pedido');
    },
  });

  // ============================================
  // Generate Payment Mutation (calls API route)
  // ============================================
  const generatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, method = 'PIX' }: { orderId: string; method?: 'PIX' | 'CARD' }): Promise<FinancialPaymentLink | null> => {
      if (!academy?.id) throw new Error('Academy not available');

      const response = await fetch('/api/store/generate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academyId: academy.id,
          orderId,
          method,
          customerEmail: user?.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar pagamento');
      }

      return data.paymentLink;
    },
    onSuccess: (paymentLink, { method }) => {
      if (paymentLink) {
        success(method === 'CARD' ? 'Redirecionando para pagamento...' : 'QR Code PIX gerado!');
      }
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao gerar pagamento');
    },
  });

  // ============================================
  // Get Order by ID
  // ============================================
  const getOrder = useCallback(async (id: string): Promise<StoreOrder | null> => {
    if (!storeService) return null;
    return storeService.getOrderById(id);
  }, [storeService]);

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    products,
    orders: studentOrders,

    // Actions
    createOrder: createOrderMutation.mutateAsync,
    generatePayment: (orderId: string, method?: 'PIX' | 'CARD') => generatePaymentMutation.mutateAsync({ orderId, method }),
    getOrder,

    // Store info
    isStoreEnabled: academy?.storeEnabled ?? false,
    isStorePublished: academy?.storePublished ?? false,
    isCreditCardEnabled: false, // Disabled - coming soon
    welcomeMessage: academy?.storeWelcomeMessage,
    minOrderAmount: academy?.storeMinOrderAmount,

    // Loading states
    isLoadingProducts,
    isLoadingOrders,
    isCreatingOrder: createOrderMutation.isPending,
    isGeneratingPayment: generatePaymentMutation.isPending,

    // Refresh
    refreshOrders: refetchOrders,
  };
}

export default useStore;
