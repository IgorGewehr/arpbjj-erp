import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collections } from '@/lib/firebase/collections';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '@/types';

// ============================================
// Types
// ============================================
interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  studentId?: string;
  financialId?: string;
  competitionId?: string;
  channels?: ('in_app' | 'push' | 'email')[];
  expiresInDays?: number;
}

// ============================================
// Notification Service Factory
// ============================================
class NotificationService {
  private academyId: string;

  constructor(academyId: string) {
    this.academyId = academyId;
  }

  private get notificationsRef() {
    return collections.notifications(this.academyId);
  }

  // ============================================
  // Create Notification
  // ============================================
  async create(data: CreateNotificationData): Promise<Notification> {
    const expiresAt = data.expiresInDays
      ? Timestamp.fromDate(
          new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
        )
      : null;

    const notificationData = {
      academyId: this.academyId,
      userId: data.userId,
      type: data.type,
      priority: data.priority || 'normal',
      title: data.title,
      message: data.message,
      imageUrl: data.imageUrl,
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
      studentId: data.studentId,
      financialId: data.financialId,
      competitionId: data.competitionId,
      read: false,
      readAt: undefined,
      channels: data.channels || ['in_app'],
      sentVia: ['in_app'],
      createdAt: serverTimestamp(),
      expiresAt,
    };

    const docRef = await addDoc(this.notificationsRef, notificationData);

    return {
      id: docRef.id,
      ...notificationData,
      createdAt: new Date(),
      expiresAt: expiresAt ? expiresAt.toDate() : undefined,
    } as Notification;
  }

  // ============================================
  // Get User Notifications
  // ============================================
  async getByUser(userId: string, limitCount = 50): Promise<Notification[]> {
    const q = query(
      this.notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const now = new Date();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate();

        // Skip expired
        if (expiresAt && expiresAt < now) {
          return null;
        }

        return {
          id: doc.id,
          academyId: data.academyId,
          userId: data.userId,
          type: data.type as NotificationType,
          priority: data.priority as NotificationPriority,
          title: data.title,
          message: data.message,
          imageUrl: data.imageUrl,
          actionUrl: data.actionUrl,
          actionLabel: data.actionLabel,
          studentId: data.studentId,
          financialId: data.financialId,
          competitionId: data.competitionId,
          read: data.read || false,
          readAt: data.readAt?.toDate(),
          channels: data.channels || ['in_app'],
          sentVia: data.sentVia,
          createdAt: data.createdAt?.toDate() || new Date(),
          expiresAt,
        } as Notification;
      })
      .filter(Boolean) as Notification[];
  }

  // ============================================
  // Get Unread Count
  // ============================================
  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      this.notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const now = new Date();

    // Filter out expired
    return snapshot.docs.filter((doc) => {
      const expiresAt = doc.data().expiresAt?.toDate();
      return !expiresAt || expiresAt >= now;
    }).length;
  }

  // ============================================
  // Mark as Read
  // ============================================
  async markAsRead(notificationId: string): Promise<void> {
    const docRef = collections.notification(this.academyId, notificationId);
    await updateDoc(docRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  }

  // ============================================
  // Mark All as Read for User
  // ============================================
  async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      this.notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    await Promise.all(
      snapshot.docs.map((doc) =>
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        })
      )
    );
  }

  // ============================================
  // Delete Notification
  // ============================================
  async delete(notificationId: string): Promise<void> {
    const docRef = collections.notification(this.academyId, notificationId);
    await deleteDoc(docRef);
  }

  // ============================================
  // Delete Expired Notifications
  // ============================================
  async deleteExpired(): Promise<number> {
    const now = Timestamp.now();
    const q = query(
      this.notificationsRef,
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(q);

    await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));

    return snapshot.docs.length;
  }

  // ============================================
  // Notification Templates
  // ============================================

  async notifyPaymentReceived(
    adminUserId: string,
    studentName: string,
    amount: number,
    studentId: string,
    financialId: string
  ): Promise<Notification> {
    return this.create({
      userId: adminUserId,
      type: 'payment_received',
      priority: 'high',
      title: 'Pagamento Recebido',
      message: `${studentName} pagou R$ ${(amount / 100).toFixed(2)} via plataforma.`,
      studentId,
      financialId,
      actionUrl: `/financeiro?studentId=${studentId}`,
      actionLabel: 'Ver detalhes',
      expiresInDays: 30,
    });
  }

  async notifyPaymentPending(
    userId: string,
    amount: number,
    dueDate: Date,
    financialId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'payment_pending',
      priority: 'normal',
      title: 'Mensalidade Pendente',
      message: `Você tem uma mensalidade de R$ ${(amount / 100).toFixed(2)} com vencimento em ${dueDate.toLocaleDateString('pt-BR')}.`,
      financialId,
      actionUrl: `/portal/financeiro`,
      actionLabel: 'Pagar agora',
      expiresInDays: 7,
    });
  }

  async notifyPaymentOverdue(
    userId: string,
    amount: number,
    daysOverdue: number,
    financialId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'payment_overdue',
      priority: 'urgent',
      title: 'Pagamento Atrasado',
      message: `Sua mensalidade de R$ ${(amount / 100).toFixed(2)} está atrasada há ${daysOverdue} dias.`,
      financialId,
      actionUrl: `/portal/financeiro`,
      actionLabel: 'Regularizar',
      expiresInDays: 30,
    });
  }

  async notifyGraduationEligible(
    adminUserId: string,
    studentName: string,
    attendanceCount: number,
    studentId: string
  ): Promise<Notification> {
    return this.create({
      userId: adminUserId,
      type: 'graduation_eligible',
      priority: 'high',
      title: 'Aluno Elegível para Graduação',
      message: `${studentName} atingiu ${attendanceCount} presenças e está elegível para graduação automática.`,
      studentId,
      actionUrl: `/graduacao?studentId=${studentId}`,
      actionLabel: 'Ver aluno',
      expiresInDays: 30,
    });
  }

  async notifyGraduationNear(
    userId: string,
    studentName: string,
    currentCount: number,
    targetCount: number,
    studentId: string
  ): Promise<Notification> {
    const remaining = targetCount - currentCount;
    return this.create({
      userId,
      type: 'graduation_near',
      priority: 'normal',
      title: 'Próximo da Graduação!',
      message: `${studentName} está a ${remaining} presenças da próxima graduação.`,
      studentId,
      actionUrl: `/portal/presenca`,
      actionLabel: 'Ver presenças',
      expiresInDays: 14,
    });
  }

  async notifyNewStudentLinked(
    adminUserId: string,
    studentName: string,
    userEmail: string,
    studentId: string
  ): Promise<Notification> {
    return this.create({
      userId: adminUserId,
      type: 'new_student_linked',
      priority: 'normal',
      title: 'Nova Conta Vinculada',
      message: `${userEmail} vinculou sua conta ao aluno ${studentName}.`,
      studentId,
      actionUrl: `/alunos/${studentId}`,
      actionLabel: 'Ver aluno',
      expiresInDays: 7,
    });
  }

  async notifyStudentMilestone(
    userId: string,
    studentName: string,
    milestone: string,
    studentId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'student_milestone',
      priority: 'normal',
      title: 'Conquista Desbloqueada!',
      message: `${studentName} atingiu a marca de ${milestone}!`,
      studentId,
      actionUrl: `/portal/linha-do-tempo`,
      actionLabel: 'Ver conquistas',
      expiresInDays: 30,
    });
  }

  async notifyCompetitionReminder(
    userId: string,
    competitionName: string,
    daysUntil: number,
    competitionId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'competition_reminder',
      priority: daysUntil <= 3 ? 'high' : 'normal',
      title: 'Competição se Aproximando',
      message: `${competitionName} acontecerá em ${daysUntil} dias.`,
      competitionId,
      actionUrl: `/portal/competicoes`,
      actionLabel: 'Ver detalhes',
      expiresInDays: daysUntil,
    });
  }
}

// ============================================
// Factory Function
// ============================================
export function createNotificationService(academyId: string): NotificationService {
  return new NotificationService(academyId);
}

export default NotificationService;
