import { api } from '@/lib/api/client';
import {
  StoreProduct,
  StoreOrder,
  StoreOrderItem,
  StoreOrderStatus,
  StoreProductCategory,
  StoreStockType,
  FinancialPaymentLink,
} from '@/types';

// ============================================
// Types for creating/updating
// ============================================
export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  images: string[];
  category: StoreProductCategory;
  stockType: StoreStockType;
  stockQuantity?: number;
  sizes?: string[];
  colors?: string[];
  active?: boolean;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CreateOrderData {
  studentId: string;
  studentName: string;
  items: CreateOrderItemInput[];
  notes?: string;
}

// ============================================
// Mappers
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapProduct = (raw: any): StoreProduct => ({
  id: raw.id,
  academyId: raw.academy_id,
  name: raw.name,
  description: raw.description,
  price: typeof raw.price === 'string' ? parseFloat(raw.price) : raw.price,
  images: raw.images || [],
  category: raw.category,
  stockType: raw.stock_type,
  stockQuantity: raw.stock_quantity,
  sizes: raw.sizes || [],
  colors: raw.colors || [],
  active: raw.active ?? true,
  createdAt: new Date(raw.created_at),
  updatedAt: new Date(raw.updated_at),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapOrderItem = (item: any): StoreOrderItem => ({
  productId: item.product_id ?? item.productId,
  productName: item.product_name ?? item.productName,
  quantity: item.quantity,
  unitPrice: typeof (item.unit_price ?? item.unitPrice) === 'string'
    ? parseFloat(item.unit_price ?? item.unitPrice)
    : (item.unit_price ?? item.unitPrice ?? 0),
  size: item.size,
  color: item.color,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapOrder = (raw: any): StoreOrder => ({
  id: raw.id,
  academyId: raw.academy_id,
  studentId: raw.student_id,
  studentName: raw.student_name,
  items: (raw.items || []).map(mapOrderItem),
  totalAmount: typeof (raw.total_amount ?? raw.total) === 'string'
    ? parseFloat(raw.total_amount ?? raw.total)
    : (raw.total_amount ?? raw.total ?? 0),
  status: raw.status,
  paymentMethod: raw.payment_method,
  abacatePayTransactionId: raw.abacate_pay_transaction_id,
  pixCode: raw.pix_code,
  qrCodeUrl: raw.qr_code_url,
  notes: raw.notes,
  createdAt: new Date(raw.created_at),
  updatedAt: new Date(raw.updated_at),
  paidAt: raw.paid_at ? new Date(raw.paid_at) : undefined,
  deliveredAt: raw.delivered_at ? new Date(raw.delivered_at) : undefined,
});

// ============================================
// Store Service Class (Multi-Tenant)
// ============================================
class StoreService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get productsBase() {
    return `/v1/academies/${this.academyId}/store/products`;
  }

  private get ordersBase() {
    return `/v1/academies/${this.academyId}/store/orders`;
  }

  // ============================================
  // Payment enabled — no longer stored per-academy in Firestore,
  // now driven by Go backend settings. Always return true.
  // ============================================
  async isPaymentEnabled(): Promise<boolean> {
    return true;
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(): Promise<StoreProduct[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(this.productsBase);
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    return raw.map(mapProduct);
  }

  async getActiveProducts(): Promise<StoreProduct[]> {
    const products = await this.getProducts();
    return products.filter((p) => p.active === true);
  }

  async getProductById(id: string): Promise<StoreProduct | null> {
    try {
      const raw = await api.get<unknown>(`${this.productsBase}/${id}`);
      return mapProduct(raw);
    } catch {
      return null;
    }
  }

  async createProduct(data: CreateProductData): Promise<StoreProduct> {
    const raw = await api.post<unknown>(this.productsBase, {
      name: data.name,
      description: data.description || '',
      price: data.price,
      images: data.images || [],
      category: data.category,
      stock_type: data.stockType,
      stock_quantity: data.stockQuantity ?? null,
      sizes: data.sizes || [],
      colors: data.colors || [],
      active: data.active ?? true,
    });
    return mapProduct(raw);
  }

  async updateProduct(id: string, data: Partial<CreateProductData>): Promise<StoreProduct> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.price !== undefined) body.price = data.price;
    if (data.images !== undefined) body.images = data.images;
    if (data.category !== undefined) body.category = data.category;
    if (data.stockType !== undefined) body.stock_type = data.stockType;
    if (data.stockQuantity !== undefined) body.stock_quantity = data.stockQuantity;
    if (data.sizes !== undefined) body.sizes = data.sizes;
    if (data.colors !== undefined) body.colors = data.colors;
    if (data.active !== undefined) body.active = data.active;

    const raw = await api.patch<unknown>(`${this.productsBase}/${id}`, body);
    return mapProduct(raw);
  }

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`${this.productsBase}/${id}`);
  }

  async updateStock(id: string, quantity: number): Promise<void> {
    await api.patch(`${this.productsBase}/${id}`, { stock_quantity: quantity });
  }

  async decrementStock(id: string, amount: number): Promise<void> {
    const product = await this.getProductById(id);
    if (!product) return;
    const newQuantity = (product.stockQuantity ?? 0) - amount;
    await this.updateStock(id, newQuantity);
  }

  // ============================================
  // ORDERS
  // ============================================

  async createOrder(data: CreateOrderData): Promise<StoreOrder> {
    const raw = await api.post<unknown>(this.ordersBase, {
      student_id: data.studentId,
      student_name: data.studentName,
      items: data.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        size: item.size ?? null,
        color: item.color ?? null,
      })),
      notes: data.notes ?? null,
    });
    return mapOrder(raw);
  }

  async getOrders(): Promise<StoreOrder[]> {
    const res = await api.get<{ items: unknown[] } | unknown[]>(this.ordersBase);
    const raw = Array.isArray(res) ? res : (res as { items: unknown[] }).items ?? [];
    return raw.map(mapOrder);
  }

  async getOrdersByStatus(status: StoreOrderStatus): Promise<StoreOrder[]> {
    const orders = await this.getOrders();
    return orders.filter((o) => o.status === status);
  }

  async getOrdersByStudent(studentId: string): Promise<StoreOrder[]> {
    const orders = await this.getOrders();
    return orders.filter((o) => o.studentId === studentId);
  }

  async getOrderById(id: string): Promise<StoreOrder | null> {
    try {
      const raw = await api.get<unknown>(`${this.ordersBase}/${id}`);
      return mapOrder(raw);
    } catch {
      return null;
    }
  }

  async updateOrderStatus(id: string, status: StoreOrderStatus): Promise<StoreOrder> {
    const raw = await api.patch<unknown>(`${this.ordersBase}/${id}`, { status });
    return mapOrder(raw);
  }

  async cancelOrder(id: string): Promise<void> {
    await api.patch(`${this.ordersBase}/${id}`, { status: 'cancelled' });
  }

  // ============================================
  // PAYMENT
  // Payment generation is now handled by the Go backend via Asaas/AbacatePay.
  // These methods are kept for signature compatibility but delegate to backend.
  // ============================================

  async generateOrderPayment(
    orderId: string,
    _method: 'PIX' | 'CARD' = 'PIX'
  ): Promise<FinancialPaymentLink | null> {
    try {
      const raw = await api.post<{
        pix_code?: string;
        qr_code_url?: string;
        expires_at?: string;
      }>(`${this.ordersBase}/${orderId}/payment`, { method: _method });

      return {
        pixCode: raw.pix_code || '',
        qrCodeUrl: raw.qr_code_url || '',
        expiresAt: raw.expires_at ? new Date(raw.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating payment:', error);
      return null;
    }
  }

  async handlePaymentConfirmation(_orderId: string, _transactionId: string): Promise<void> {
    // Payment confirmation is handled server-side via webhook; no-op on client.
  }
}

// ============================================
// Factory Function
// ============================================
export function createStoreService(academyId: string): StoreService {
  return new StoreService(academyId);
}

export default StoreService;
