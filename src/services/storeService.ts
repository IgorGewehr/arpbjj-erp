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

export interface CreateOrderData {
  studentId: string;
  studentName: string;
  items: StoreOrderItem[];
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
  // Get Academy API Key
  // ============================================
  private async getApiKey(): Promise<string | null> {
    const academyRef = doc(db, 'academies', this.academyId);
    const academySnap = await getDoc(academyRef);

    if (!academySnap.exists()) {
      return null;
    }

    return academySnap.data().abacatePayApiKey || null;
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
    const q = query(
      this.productsRef,
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => this.mapProductDoc(doc));
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
    const productData = {
      academyId: this.academyId,
      name: data.name,
      description: data.description || '',
      price: data.price,
      images: data.images || [],
      category: data.category,
      stockType: data.stockType,
      stockQuantity: data.stockType === 'in_stock' ? (data.stockQuantity || 0) : undefined,
      sizes: data.sizes || [],
      colors: data.colors || [],
      active: data.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

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
    // Calculate total
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const orderData = {
      academyId: this.academyId,
      studentId: data.studentId,
      studentName: data.studentName,
      items: data.items,
      totalAmount,
      status: 'pending_payment' as StoreOrderStatus,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(this.ordersRef, orderData);

    // Notify admin about new order
    await this.notifyAdmin(
      'Novo Pedido',
      `${data.studentName} fez um pedido de R$ ${(totalAmount / 100).toFixed(2)}.`,
      `/loja/pedidos?id=${docRef.id}`
    );

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

  async generateOrderPayment(orderId: string): Promise<FinancialPaymentLink | null> {
    const order = await this.getOrderById(orderId);

    if (!order) {
      console.error('Order not found');
      return null;
    }

    if (order.status !== 'pending_payment') {
      console.error('Order is not pending payment');
      return null;
    }

    const apiKey = await this.getApiKey();

    if (!apiKey) {
      console.error('AbacatePay API key not configured');
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
          methods: ['PIX'],
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

    // Update order status to paid
    const docRef = collections.storeOrder(this.academyId, orderId);
    await updateDoc(docRef, {
      status: 'paid',
      abacatePayTransactionId: transactionId,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Deduct stock for in_stock products
    for (const item of order.items) {
      const product = await this.getProductById(item.productId);
      if (product && product.stockType === 'in_stock') {
        await this.decrementStock(item.productId, item.quantity);
      }
    }

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
    await addDoc(notificationsRef, {
      academyId: this.academyId,
      userId: ownerId,
      type: 'system',
      priority: 'normal',
      title,
      message,
      actionUrl,
      actionLabel: actionUrl ? 'Ver pedido' : undefined,
      read: false,
      channels: ['in_app'],
      sentVia: ['in_app'],
      createdAt: serverTimestamp(),
    });
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
    await addDoc(notificationsRef, {
      academyId: this.academyId,
      userId: linkedUserId,
      type: 'system',
      priority: 'normal',
      title,
      message,
      actionUrl,
      actionLabel: actionUrl ? 'Ver pedidos' : undefined,
      read: false,
      channels: ['in_app'],
      sentVia: ['in_app'],
      createdAt: serverTimestamp(),
    });
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
      items: data.items || [],
      totalAmount: data.totalAmount,
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
