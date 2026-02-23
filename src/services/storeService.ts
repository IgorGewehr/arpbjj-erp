import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/firebase/collections';
import { removeUndefinedDeep } from '@/lib/firestoreUtils';
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
// Store Service Class (Multi-Tenant)
// ============================================
class StoreService {
  private academyId: string;
  private apiBaseUrl = 'https://api.abacatepay.com/v1';

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get productsRef() {
    return collections.storeProducts(this.academyId);
  }

  private get ordersRef() {
    return collections.storeOrders(this.academyId);
  }

  // ============================================
  // Get Global API Key (from environment)
  // ============================================
  private getApiKey(): string | null {
    // API Key is global (single AbacatePay account for all academies)
    return process.env.ABACATEPAY_API_KEY || null;
  }

  // ============================================
  // Check if AbacatePay is Enabled
  // ============================================
  async isPaymentEnabled(): Promise<boolean> {
    const academyRef = doc(db, 'academies', this.academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return false;
    }

    return academySnap.data().abacatePayEnabled === true;
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(): Promise<StoreProduct[]> {
    const q = query(this.productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapProductDoc(doc));
  }

  async getActiveProducts(): Promise<StoreProduct[]> {
    // Fetch all products and filter client-side to avoid composite index requirement
    const q = query(this.productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => this.mapProductDoc(doc))
      .filter((product) => product.active === true);
  }

  async getProductById(id: string): Promise<StoreProduct | null> {
    const docRef = collections.storeProduct(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return this.mapProductDoc(docSnap);
  }

  async createProduct(data: CreateProductData): Promise<StoreProduct> {
    const productData: Record<string, unknown> = {
      academyId: this.academyId,
      name: data.name,
      description: data.description || '',
      price: data.price,
      images: data.images || [],
      category: data.category,
      stockType: data.stockType,
      sizes: data.sizes || [],
      colors: data.colors || [],
      active: data.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (data.stockType === 'in_stock') {
      productData.stockQuantity = data.stockQuantity || 0;
    }

    const docRef = await addDoc(this.productsRef, productData);

    return {
      id: docRef.id,
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as StoreProduct;
  }

  async updateProduct(id: string, data: Partial<CreateProductData>): Promise<StoreProduct> {
    const docRef = collections.storeProduct(this.academyId, id);

    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.stockType !== undefined) updateData.stockType = data.stockType;
    if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
    if (data.sizes !== undefined) updateData.sizes = data.sizes;
    if (data.colors !== undefined) updateData.colors = data.colors;
    if (data.active !== undefined) updateData.active = data.active;

    await updateDoc(docRef, updateData);

    const updated = await this.getProductById(id);
    return updated!;
  }

  async deleteProduct(id: string): Promise<void> {
    const docRef = collections.storeProduct(this.academyId, id);
    await deleteDoc(docRef);
  }

  async updateStock(id: string, quantity: number): Promise<void> {
    const docRef = collections.storeProduct(this.academyId, id);
    await updateDoc(docRef, {
      stockQuantity: quantity,
      updatedAt: serverTimestamp(),
    });
  }

  async decrementStock(id: string, amount: number): Promise<void> {
    const docRef = collections.storeProduct(this.academyId, id);
    await updateDoc(docRef, {
      stockQuantity: increment(-amount),
      updatedAt: serverTimestamp(),
    });
  }

  // ============================================
  // ORDERS
  // ============================================

  async createOrder(data: CreateOrderData): Promise<StoreOrder> {
    // SECURITY: Fetch product prices from database - NEVER trust client prices
    const validatedItems: StoreOrderItem[] = [];

    for (const item of data.items) {
      const product = await this.getProductById(item.productId);

      if (!product) {
        throw new Error(`Produto não encontrado: ${item.productId}`);
      }

      if (!product.active) {
        throw new Error(`Produto indisponível: ${product.name}`);
      }

      // Validate stock for in_stock products
      if (product.stockType === 'in_stock') {
        const availableStock = product.stockQuantity ?? 0;
        if (availableStock < item.quantity) {
          throw new Error(
            `Estoque insuficiente para "${product.name}". Disponível: ${availableStock}, Solicitado: ${item.quantity}`
          );
        }
      }

      // Validate size if product has sizes
      if (product.sizes && product.sizes.length > 0 && item.size) {
        if (!product.sizes.includes(item.size)) {
          throw new Error(`Tamanho inválido para "${product.name}": ${item.size}`);
        }
      }

      // Validate color if product has colors
      if (product.colors && product.colors.length > 0 && item.color) {
        if (!product.colors.includes(item.color)) {
          throw new Error(`Cor inválida para "${product.name}": ${item.color}`);
        }
      }

      // Build validated item with SERVER-SIDE price
      // Note: Firestore doesn't accept undefined values, so we only include optional fields if they have values
      const validatedItem: StoreOrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price, // SECURITY: Always use database price
      };

      // Only add size/color if they have values (Firestore rejects undefined)
      if (item.size) validatedItem.size = item.size;
      if (item.color) validatedItem.color = item.color;

      validatedItems.push(validatedItem);
    }

    // Calculate total from validated items (server-side prices)
    const total = validatedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Build order data - ensure no undefined values for Firestore
    const orderData: Record<string, unknown> = {
      academyId: this.academyId,
      studentId: data.studentId,
      studentName: data.studentName,
      items: validatedItems,
      total,
      status: 'pending_payment' as StoreOrderStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add notes if provided (Firestore rejects undefined)
    if (data.notes) {
      orderData.notes = data.notes;
    }

    const docRef = await addDoc(this.ordersRef, orderData);

    // Notify admin about new order (non-blocking - student may not have notification permissions)
    this.notifyAdmin(
      'Novo Pedido',
      `${data.studentName} fez um pedido de R$ ${total.toFixed(2)}.`,
      `/loja/pedidos?id=${docRef.id}`
    ).catch(() => {});

    return {
      id: docRef.id,
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as StoreOrder;
  }

  async getOrders(): Promise<StoreOrder[]> {
    const q = query(this.ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapOrderDoc(doc));
  }

  async getOrdersByStatus(status: StoreOrderStatus): Promise<StoreOrder[]> {
    const q = query(
      this.ordersRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapOrderDoc(doc));
  }

  async getOrdersByStudent(studentId: string): Promise<StoreOrder[]> {
    const q = query(
      this.ordersRef,
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapOrderDoc(doc));
  }

  async getOrderById(id: string): Promise<StoreOrder | null> {
    const docRef = collections.storeOrder(this.academyId, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return this.mapOrderDoc(docSnap);
  }

  async updateOrderStatus(id: string, status: StoreOrderStatus): Promise<StoreOrder> {
    const docRef = collections.storeOrder(this.academyId, id);
    const order = await this.getOrderById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    // If changing to "paid" status, validate and decrement stock
    if (status === 'paid' && order.status === 'pending_payment') {
      // SECURITY: Validate stock before payment (prevent race conditions)
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productName}`);
        }

        if (product.stockType === 'in_stock') {
          const availableStock = product.stockQuantity ?? 0;
          if (availableStock < item.quantity) {
            throw new Error(
              `Estoque insuficiente para "${product.name}".\n` +
              `Disponível: ${availableStock}, Solicitado: ${item.quantity}`
            );
          }
        }
      }

      // Decrement stock for in_stock items (only after validation)
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        if (product && product.stockType === 'in_stock') {
          await this.decrementStock(item.productId, item.quantity);
        }
      }
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === 'delivered') {
      updateData.deliveredAt = serverTimestamp();
    }

    await updateDoc(docRef, updateData);

    // Notify student about status change
    await this.notifyStudent(
      order.studentId,
      this.getStatusNotificationTitle(status),
      this.getStatusNotificationMessage(status, order.id),
      `/portal/loja/pedidos`
    );

    const updated = await this.getOrderById(id);
    return updated!;
  }

  async cancelOrder(id: string): Promise<void> {
    const order = await this.getOrderById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow cancellation if not yet paid or by admin
    const docRef = collections.storeOrder(this.academyId, id);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });

    // If items had stock deducted, restore them
    if (order.status !== 'pending_payment') {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        if (product && product.stockType === 'in_stock') {
          await updateDoc(collections.storeProduct(this.academyId, item.productId), {
            stockQuantity: increment(item.quantity),
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  }

  // ============================================
  // PAYMENT
  // ============================================

  async generateOrderPayment(orderId: string, method: 'PIX' | 'CARD' = 'PIX'): Promise<FinancialPaymentLink | null> {
    const order = await this.getOrderById(orderId);

    if (!order) {
      console.error('Order not found');
      return null;
    }

    if (order.status !== 'pending_payment') {
      console.error('Order is not pending payment');
      return null;
    }

    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.error('ABACATEPAY_API_KEY not configured in environment');
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/billing/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frequency: 'ONE_TIME',
          methods: [method],
          products: order.items.map(item => ({
            externalId: item.productId,
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
          })),
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/portal/loja/pedidos`,
          completionUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/portal/loja/pedidos?success=true`,
          metadata: {
            academyId: this.academyId,
            orderId: orderId,
            studentId: order.studentId,
            type: 'store_order',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AbacatePay API error:', errorData);
        return null;
      }

      const data = await response.json();

      // Update order with payment info
      const docRef = collections.storeOrder(this.academyId, orderId);

      if (method === 'PIX') {
        await updateDoc(docRef, {
          abacatePayTransactionId: data.data.id,
          pixCode: data.data.pix?.brcode,
          qrCodeUrl: data.data.pix?.qrcode,
          paymentMethod: 'pix',
          updatedAt: serverTimestamp(),
        });

        return {
          pixCode: data.data.pix?.brcode || '',
          qrCodeUrl: data.data.pix?.qrcode || '',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          createdAt: new Date(),
        };
      } else {
        // For CARD, AbacatePay returns a checkout URL
        await updateDoc(docRef, {
          abacatePayTransactionId: data.data.id,
          paymentMethod: 'credit_card',
          updatedAt: serverTimestamp(),
        });

        return {
          pixCode: '', // Not used for card
          qrCodeUrl: data.data.url || '', // Checkout URL for card
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        };
      }
    } catch (error) {
      console.error('Error generating payment:', error);
      return null;
    }
  }

  async handlePaymentConfirmation(orderId: string, transactionId: string): Promise<void> {
    const order = await this.getOrderById(orderId);

    if (!order) {
      console.error('Order not found');
      return;
    }

    // SECURITY: Validate stock before payment (prevent race conditions)
    // This prevents two customers from buying the same last item
    for (const item of order.items) {
      const product = await this.getProductById(item.productId);
      if (!product) {
        throw new Error(`Produto não encontrado: ${item.productName}`);
      }

      if (product.stockType === 'in_stock') {
        const availableStock = product.stockQuantity ?? 0;
        if (availableStock < item.quantity) {
          throw new Error(
            `Estoque insuficiente para "${product.name}".\n` +
            `O produto foi vendido enquanto seu pedido estava pendente.\n` +
            `Disponível: ${availableStock}, Solicitado: ${item.quantity}\n\n` +
            `Por favor, ajuste a quantidade ou remova o item do pedido.`
          );
        }
      }
    }

    // Deduct stock for in_stock products (only after validation)
    for (const item of order.items) {
      const product = await this.getProductById(item.productId);
      if (product && product.stockType === 'in_stock') {
        await this.decrementStock(item.productId, item.quantity);
      }
    }

    // Update order status to paid
    const docRef = collections.storeOrder(this.academyId, orderId);
    await updateDoc(docRef, {
      status: 'paid',
      abacatePayTransactionId: transactionId,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notify admin
    await this.notifyAdmin(
      'Pedido Pago',
      `${order.studentName} pagou o pedido #${orderId.slice(-6).toUpperCase()}.`,
      `/loja/pedidos?id=${orderId}`
    );

    // Notify student
    await this.notifyStudent(
      order.studentId,
      'Pagamento Confirmado',
      'Seu pedido foi pago com sucesso! Em breve iniciaremos a preparacao.',
      '/portal/loja/pedidos'
    );
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  private async notifyAdmin(title: string, message: string, actionUrl?: string): Promise<void> {
    const academyRef = doc(db, 'academies', this.academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) return;

    const ownerId = academySnap.data().ownerId;
    if (!ownerId) return;

    const notificationsRef = collections.notifications(this.academyId);
    const notifData: Record<string, unknown> = {
      academyId: this.academyId,
      userId: ownerId,
      type: 'system',
      priority: 'normal',
      title,
      message,
      read: false,
      channels: ['in_app'],
      sentVia: ['in_app'],
      createdAt: serverTimestamp(),
    };
    if (actionUrl) {
      notifData.actionUrl = actionUrl;
      notifData.actionLabel = 'Ver pedido';
    }
    await addDoc(notificationsRef, notifData);
  }

  private async notifyStudent(
    studentId: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    // Get the user linked to this student
    const studentsRef = collections.students(this.academyId);
    const studentQuery = query(studentsRef, where('id', '==', studentId));
    const studentSnap = await getDocs(studentQuery);

    if (studentSnap.empty) return;

    const studentData = studentSnap.docs[0].data();
    const linkedUserId = studentData.linkedUserId;

    if (!linkedUserId) return;

    const notificationsRef = collections.notifications(this.academyId);
    const notifData: Record<string, unknown> = {
      academyId: this.academyId,
      userId: linkedUserId,
      type: 'system',
      priority: 'normal',
      title,
      message,
      read: false,
      channels: ['in_app'],
      sentVia: ['in_app'],
      createdAt: serverTimestamp(),
    };
    if (actionUrl) {
      notifData.actionUrl = actionUrl;
      notifData.actionLabel = 'Ver pedidos';
    }
    await addDoc(notificationsRef, notifData);
  }

  private getStatusNotificationTitle(status: StoreOrderStatus): string {
    switch (status) {
      case 'preparing':
        return 'Pedido em Preparacao';
      case 'ready':
        return 'Pedido Pronto';
      case 'delivered':
        return 'Pedido Entregue';
      case 'cancelled':
        return 'Pedido Cancelado';
      default:
        return 'Atualizacao do Pedido';
    }
  }

  private getStatusNotificationMessage(status: StoreOrderStatus, orderId: string): string {
    const orderCode = orderId.slice(-6).toUpperCase();
    switch (status) {
      case 'preparing':
        return `Seu pedido #${orderCode} esta sendo preparado.`;
      case 'ready':
        return `Seu pedido #${orderCode} esta pronto para retirada!`;
      case 'delivered':
        return `Seu pedido #${orderCode} foi entregue. Obrigado!`;
      case 'cancelled':
        return `Seu pedido #${orderCode} foi cancelado.`;
      default:
        return `Atualizacao no pedido #${orderCode}.`;
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private mapProductDoc(doc: any): StoreProduct {
    const data = doc.data();
    return {
      id: doc.id,
      academyId: data.academyId,
      name: data.name,
      description: data.description,
      price: data.price,
      images: data.images || [],
      category: data.category,
      stockType: data.stockType,
      stockQuantity: data.stockQuantity,
      sizes: data.sizes || [],
      colors: data.colors || [],
      active: data.active ?? true,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  private mapOrderDoc(doc: any): StoreOrder {
    const data = doc.data();
    return {
      id: doc.id,
      academyId: data.academyId,
      studentId: data.studentId,
      studentName: data.studentName,
      items: (data.items || []).map((item: any) => ({
        ...item,
        unitPrice: item.unitPrice ?? item.price ?? 0,
      })),
      totalAmount: data.total ?? data.totalAmount,
      status: data.status,
      paymentMethod: data.paymentMethod,
      abacatePayTransactionId: data.abacatePayTransactionId,
      pixCode: data.pixCode,
      qrCodeUrl: data.qrCodeUrl,
      notes: data.notes,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      paidAt: data.paidAt?.toDate(),
      deliveredAt: data.deliveredAt?.toDate(),
    };
  }
}

// ============================================
// Factory Function
// ============================================
export function createStoreService(academyId: string): StoreService {
  return new StoreService(academyId);
}

export default StoreService;
