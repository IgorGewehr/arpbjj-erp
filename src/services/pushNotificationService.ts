import { adminMessaging, adminDb } from '@/lib/firebase/admin';

// ============================================
// Types
// ============================================
interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface SendToUserOptions extends PushNotificationData {
  userId: string;
}

interface SendToTopicOptions extends PushNotificationData {
  topic: string;
}

interface FCMToken {
  token: string;
  platform: 'ios' | 'android';
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ============================================
// Push Notification Service
// ============================================
class PushNotificationService {
  // Get all FCM tokens for a user
  async getUserTokens(userId: string): Promise<string[]> {
    const tokensSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('fcmTokens')
      .get();

    return tokensSnapshot.docs.map((doc) => doc.data().token as string);
  }

  // Send notification to a specific user
  async sendToUser(options: SendToUserOptions): Promise<boolean> {
    const { userId, title, body, data, imageUrl } = options;

    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) {
      console.log(`No FCM tokens found for user: ${userId}`);
      return false;
    }

    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: data || {},
      tokens,
    };

    try {
      const response = await adminMessaging.sendEachForMulticast(message);
      console.log(
        `Push notification sent to ${response.successCount}/${tokens.length} devices for user ${userId}`
      );

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        // Remove invalid tokens
        for (const token of invalidTokens) {
          await this.removeToken(userId, token);
        }
      }

      return response.successCount > 0;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send notification to a topic (e.g., all users in an academy)
  async sendToTopic(options: SendToTopicOptions): Promise<boolean> {
    const { topic, title, body, data, imageUrl } = options;

    const message = {
      notification: {
        title,
        body,
        ...(imageUrl && { imageUrl }),
      },
      data: data || {},
      topic,
    };

    try {
      const response = await adminMessaging.send(message);
      console.log(`Push notification sent to topic ${topic}: ${response}`);
      return true;
    } catch (error) {
      console.error('Error sending push notification to topic:', error);
      return false;
    }
  }

  // Remove invalid token
  async removeToken(userId: string, token: string): Promise<void> {
    try {
      await adminDb
        .collection('users')
        .doc(userId)
        .collection('fcmTokens')
        .doc(token)
        .delete();
      console.log(`Removed invalid FCM token for user ${userId}`);
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // ============================================
  // Pre-built Notification Templates
  // ============================================

  // Notify student about pending payment
  async notifyPaymentPending(
    userId: string,
    amount: number,
    dueDate: Date,
    financialId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId,
      title: 'Mensalidade Pendente',
      body: `Você tem uma mensalidade de R$ ${amount.toFixed(2)} com vencimento em ${dueDate.toLocaleDateString('pt-BR')}.`,
      data: {
        type: 'financial',
        id: financialId,
      },
    });
  }

  // Notify student about new payment generated
  async notifyNewPaymentAvailable(
    userId: string,
    amount: number,
    dueDate: Date,
    financialId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId,
      title: 'Nova Mensalidade Disponível',
      body: `Uma nova mensalidade de R$ ${amount.toFixed(2)} foi gerada. Vencimento: ${dueDate.toLocaleDateString('pt-BR')}.`,
      data: {
        type: 'financial',
        id: financialId,
      },
    });
  }

  // Notify student about new competition
  async notifyNewCompetition(
    userId: string,
    competitionName: string,
    competitionDate: Date,
    competitionId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId,
      title: 'Novo Campeonato Criado',
      body: `${competitionName} foi adicionado! Data: ${competitionDate.toLocaleDateString('pt-BR')}.`,
      data: {
        type: 'competition',
        id: competitionId,
      },
    });
  }

  // Notify student about new achievement
  async notifyNewAchievement(
    userId: string,
    achievementTitle: string,
    achievementId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId,
      title: 'Nova Conquista Desbloqueada!',
      body: `Parabéns! Você conquistou: ${achievementTitle}`,
      data: {
        type: 'achievement',
        id: achievementId,
      },
    });
  }

  // Notify admin about new store order
  async notifyNewStoreOrder(
    adminUserId: string,
    studentName: string,
    totalAmount: number,
    orderId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId: adminUserId,
      title: 'Novo Pedido na Loja',
      body: `${studentName} fez um pedido de R$ ${totalAmount.toFixed(2)}.`,
      data: {
        type: 'store_order',
        id: orderId,
      },
    });
  }

  // Notify admin about payment received
  async notifyPaymentReceived(
    adminUserId: string,
    studentName: string,
    amount: number,
    financialId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId: adminUserId,
      title: 'Pagamento Recebido',
      body: `${studentName} pagou R$ ${amount.toFixed(2)} via plataforma.`,
      data: {
        type: 'financial',
        id: financialId,
      },
    });
  }

  // Notify admin about overdue payment
  async notifyPaymentOverdue(
    adminUserId: string,
    studentName: string,
    amount: number,
    daysOverdue: number,
    financialId: string
  ): Promise<boolean> {
    return this.sendToUser({
      userId: adminUserId,
      title: 'Pagamento Atrasado',
      body: `${studentName} tem um pagamento de R$ ${amount.toFixed(2)} atrasado há ${daysOverdue} dias.`,
      data: {
        type: 'financial',
        id: financialId,
      },
    });
  }

  // Send notification to all students in an academy (via topic)
  async notifyAcademyStudents(
    academyId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    return this.sendToTopic({
      topic: `academy_${academyId}`,
      title,
      body,
      data,
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default PushNotificationService;
