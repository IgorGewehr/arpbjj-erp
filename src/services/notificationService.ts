import { api } from '@/lib/api/client';
import { Notification, NotificationType, NotificationPriority } from '@/types';

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
// Mapper
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapNotification = (raw: any): Notification => ({
  id: raw.id,
  academyId: raw.academy_id || '',
  userId: raw.recipient_uid ?? raw.user_id ?? '',
  type: (raw.type as NotificationType) || 'system',
  priority: (raw.priority as NotificationPriority) || 'normal',
  title: raw.title,
  message: raw.body ?? raw.message ?? '',
  imageUrl: raw.image_url,
  actionUrl: raw.action_url,
  actionLabel: raw.action_label,
  studentId: raw.student_id,
  financialId: raw.financial_id,
  competitionId: raw.competition_id,
  read: raw.read ?? false,
  readAt: raw.read_at ? new Date(raw.read_at) : undefined,
  channels: raw.channels || ['in_app'],
  sentVia: raw.sent_via,
  createdAt: new Date(raw.created_at),
  expiresAt: raw.expires_at ? new Date(raw.expires_at) : undefined,
});

// ============================================
// Notification Service
// Notifications are scoped to the current user (/v1/me/notifications).
// academyId is kept for class instantiation compatibility only.
// ============================================
class NotificationService {
  // academyId kept for backward compat — notifications are now user-scoped
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _academyId: string;

  constructor(academyId: string) {
    this._academyId = academyId;
  }

  // ============================================
  // Create Notification
  // Server-side event dispatch only; this is a no-op.
  // Use-case: callers that used to create notifications directly now
  // let the Go backend fire them from outbox events.
  // ============================================
  async create(_data: CreateNotificationData): Promise<Notification> {
    // No-op: backend fires notifications automatically via outbox.
    // Return a stub so callers that await the return value don't break.
    return {
      id: '',
      academyId: this._academyId,
      userId: _data.userId,
      type: _data.type,
      priority: _data.priority || 'normal',
      title: _data.title,
      message: _data.message,
      read: false,
      channels: _data.channels || ['in_app'],
      createdAt: new Date(),
    } as Notification;
  }

  // ============================================
  // Get User Notifications
  // ============================================
  async getByUser(_userId: string, _limitCount = 50): Promise<Notification[]> {
    const raw = await api.get<{ items: unknown[]; has_more: boolean }>(
      '/v1/me/notifications?unread_only=false'
    );
    const now = new Date();
    return (raw.items || [])
      .map(mapNotification)
      .filter((n) => !n.expiresAt || n.expiresAt >= now)
      .slice(0, _limitCount);
  }

  // ============================================
  // Get Unread Count
  // ============================================
  async getUnreadCount(_userId: string): Promise<number> {
    const raw = await api.get<{ count: number }>('/v1/me/notifications/unread-count');
    return raw.count ?? 0;
  }

  // ============================================
  // Mark as Read
  // ============================================
  async markAsRead(notificationId: string): Promise<void> {
    await api.patch(`/v1/me/notifications/${notificationId}`, { read: true });
  }

  // ============================================
  // Mark All as Read
  // ============================================
  async markAllAsRead(_userId: string): Promise<void> {
    await api.post('/v1/me/notifications/mark-all-read');
  }

  // ============================================
  // Delete Notification
  // ============================================
  async delete(notificationId: string): Promise<void> {
    await api.delete(`/v1/me/notifications/${notificationId}`);
  }

  // ============================================
  // Delete Expired — no-op (backend handles cleanup)
  // ============================================
  async deleteExpired(): Promise<number> {
    return 0;
  }

  // ============================================
  // Notification Templates — all no-ops.
  // These were Firebase write operations. In Go, the backend fires
  // notifications automatically from outbox domain events.
  // Signatures are preserved so callers don't need to change.
  // ============================================

  async notifyPaymentReceived(
    _adminUserId: string,
    _studentName: string,
    _amount: number,
    _studentId: string,
    _financialId: string
  ): Promise<Notification> {
    return this.create({
      userId: _adminUserId,
      type: 'payment_received',
      priority: 'high',
      title: 'Pagamento Recebido',
      message: `${_studentName} pagou R$ ${_amount.toFixed(2)} via plataforma.`,
    });
  }

  async notifyPaymentPending(
    _userId: string,
    _amount: number,
    _dueDate: Date,
    _financialId: string
  ): Promise<Notification> {
    return this.create({
      userId: _userId,
      type: 'payment_pending',
      priority: 'normal',
      title: 'Mensalidade Pendente',
      message: `Você tem uma mensalidade de R$ ${_amount.toFixed(2)} com vencimento em ${_dueDate.toLocaleDateString('pt-BR')}.`,
    });
  }

  async notifyPaymentOverdue(
    _userId: string,
    _amount: number,
    _daysOverdue: number,
    _financialId: string
  ): Promise<Notification> {
    return this.create({
      userId: _userId,
      type: 'payment_overdue',
      priority: 'urgent',
      title: 'Pagamento Atrasado',
      message: `Sua mensalidade de R$ ${_amount.toFixed(2)} está atrasada há ${_daysOverdue} dias.`,
    });
  }

  async notifyGraduationEligible(
    _adminUserId: string,
    _studentName: string,
    _attendanceCount: number,
    _studentId: string
  ): Promise<Notification> {
    return this.create({
      userId: _adminUserId,
      type: 'graduation_eligible',
      priority: 'high',
      title: 'Aluno Elegível para Graduação',
      message: `${_studentName} atingiu ${_attendanceCount} presenças e está elegível para graduação automática.`,
    });
  }

  async notifyGraduationNear(
    _userId: string,
    _studentName: string,
    _currentCount: number,
    _targetCount: number,
    _studentId: string
  ): Promise<Notification> {
    const remaining = _targetCount - _currentCount;
    return this.create({
      userId: _userId,
      type: 'graduation_near',
      priority: 'normal',
      title: 'Próximo da Graduação!',
      message: `${_studentName} está a ${remaining} presenças da próxima graduação.`,
    });
  }

  async notifyNewStudentLinked(
    _adminUserId: string,
    _studentName: string,
    _userEmail: string,
    _studentId: string
  ): Promise<Notification> {
    return this.create({
      userId: _adminUserId,
      type: 'new_student_linked',
      priority: 'normal',
      title: 'Nova Conta Vinculada',
      message: `${_userEmail} vinculou sua conta ao aluno ${_studentName}.`,
    });
  }

  async notifyStudentMilestone(
    _userId: string,
    _studentName: string,
    _milestone: string,
    _studentId: string
  ): Promise<Notification> {
    return this.create({
      userId: _userId,
      type: 'student_milestone',
      priority: 'normal',
      title: 'Conquista Desbloqueada!',
      message: `${_studentName} atingiu a marca de ${_milestone}!`,
    });
  }

  async notifyNewTuitionCreated(
    _userId: string,
    _studentName: string,
    _amount: number,
    _dueDate: Date,
    _financialId: string
  ): Promise<Notification> {
    return this.create({
      userId: _userId,
      type: 'payment_pending',
      priority: 'normal',
      title: 'Nova Mensalidade',
      message: `Sua mensalidade de R$ ${_amount.toFixed(2)} vence em ${_dueDate.toLocaleDateString('pt-BR')}.`,
    });
  }

  async notifyNewAchievement(
    _userId: string,
    _achievementTitle: string,
    _studentId: string
  ): Promise<Notification> {
    return this.create({
      userId: _userId,
      type: 'student_milestone',
      priority: 'normal',
      title: 'Conquista Desbloqueada!',
      message: `Parabéns! Você conquistou: ${_achievementTitle}`,
    });
  }

  async notifyStoreOrder(
    _adminUserId: string,
    _studentName: string,
    _total: number,
    _orderId: string
  ): Promise<Notification> {
    return this.create({
      userId: _adminUserId,
      type: 'payment_pending',
      priority: 'normal',
      title: 'Novo Pedido',
      message: `${_studentName} fez um pedido de R$ ${_total.toFixed(2)} na loja.`,
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
