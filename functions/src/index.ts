import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ============================================
// Types
// ============================================
interface FCMToken {
  token: string;
  platform: 'ios' | 'android';
}

interface Financial {
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: admin.firestore.Timestamp;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  academyId: string;
}

interface Competition {
  name: string;
  date: admin.firestore.Timestamp;
  academyId: string;
}

interface TimelineEvent {
  studentId: string;
  type: string;
  title: string;
  academyId: string;
}

interface Student {
  name: string;
  academyId: string;
  userId?: string;
}

interface Academy {
  adminUserId: string;
  abacatePayEnabled?: boolean;
}

// ============================================
// Helper Functions
// ============================================

async function getUserTokens(userId: string): Promise<string[]> {
  const tokensSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('fcmTokens')
    .get();

  return tokensSnapshot.docs.map((doc) => doc.data().token as string);
}

async function sendToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const tokens = await getUserTokens(userId);
  if (tokens.length === 0) {
    console.log(`No FCM tokens found for user: ${userId}`);
    return false;
  }

  const message = {
    notification: { title, body },
    data: data || {},
    tokens,
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `Push notification sent to ${response.successCount}/${tokens.length} devices for user ${userId}`
    );

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      response.responses.forEach(async (resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            await db
              .collection('users')
              .doc(userId)
              .collection('fcmTokens')
              .doc(tokens[idx])
              .delete();
          }
        }
      });
    }

    return response.successCount > 0;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const message = {
    notification: { title, body },
    data: data || {},
    topic,
  };

  try {
    const response = await messaging.send(message);
    console.log(`Push notification sent to topic ${topic}: ${response}`);
    return true;
  } catch (error) {
    console.error('Error sending push notification to topic:', error);
    return false;
  }
}

async function getAcademyAdmin(academyId: string): Promise<string | null> {
  const academyDoc = await db.collection('academies').doc(academyId).get();
  if (!academyDoc.exists) {
    return null;
  }
  const academy = academyDoc.data() as Academy;
  return academy.adminUserId || null;
}

async function getStudentUserId(studentId: string, academyId: string): Promise<string | null> {
  const studentDoc = await db
    .collection('academies')
    .doc(academyId)
    .collection('students')
    .doc(studentId)
    .get();

  if (!studentDoc.exists) {
    return null;
  }
  const student = studentDoc.data() as Student;
  return student.userId || null;
}

// ============================================
// Cloud Functions - Firestore Triggers
// ============================================

/**
 * Trigger: New financial record created
 * Action: Notify student about new payment due
 */
export const onFinancialCreated = functions.firestore
  .document('academies/{academyId}/financials/{financialId}')
  .onCreate(async (snapshot, context) => {
    const { academyId, financialId } = context.params;
    const financial = snapshot.data() as Financial;

    console.log(`New financial created: ${financialId} in academy ${academyId}`);

    // Get student's userId
    const userId = await getStudentUserId(financial.studentId, academyId);
    if (!userId) {
      console.log(`No userId found for student: ${financial.studentId}`);
      return;
    }

    // Send notification to student
    const dueDate = financial.dueDate.toDate();
    const formattedDate = dueDate.toLocaleDateString('pt-BR');
    const formattedAmount = (financial.amount / 100).toFixed(2);

    await sendToUser(
      userId,
      'Nova Mensalidade Disponivel',
      `Uma nova mensalidade de R$ ${formattedAmount} foi gerada. Vencimento: ${formattedDate}.`,
      {
        type: 'financial',
        id: financialId,
        academyId,
      }
    );

    console.log(`Notification sent to user ${userId} for financial ${financialId}`);
  });

/**
 * Trigger: New competition created
 * Action: Notify all students in the academy
 */
export const onCompetitionCreated = functions.firestore
  .document('academies/{academyId}/competitions/{competitionId}')
  .onCreate(async (snapshot, context) => {
    const { academyId, competitionId } = context.params;
    const competition = snapshot.data() as Competition;

    console.log(`New competition created: ${competitionId} in academy ${academyId}`);

    // Send notification to all students via topic
    const competitionDate = competition.date.toDate();
    const formattedDate = competitionDate.toLocaleDateString('pt-BR');

    await sendToTopic(
      `academy_${academyId}`,
      'Novo Campeonato Criado',
      `${competition.name} foi adicionado! Data: ${formattedDate}. Faca sua inscricao.`,
      {
        type: 'competition',
        id: competitionId,
        academyId,
      }
    );

    console.log(`Notification sent to topic academy_${academyId} for competition ${competitionId}`);
  });

/**
 * Trigger: New timeline event (achievement) created
 * Action: Notify student about achievement
 */
export const onTimelineEventCreated = functions.firestore
  .document('academies/{academyId}/students/{studentId}/timeline/{eventId}')
  .onCreate(async (snapshot, context) => {
    const { academyId, studentId, eventId } = context.params;
    const event = snapshot.data() as TimelineEvent;

    // Only notify for achievements and graduations
    if (!['achievement', 'graduation', 'belt_promotion'].includes(event.type)) {
      console.log(`Timeline event ${eventId} is not a notifiable type: ${event.type}`);
      return;
    }

    console.log(`New timeline event created: ${eventId} for student ${studentId}`);

    // Get student's userId
    const userId = await getStudentUserId(studentId, academyId);
    if (!userId) {
      console.log(`No userId found for student: ${studentId}`);
      return;
    }

    // Determine notification content based on type
    let title = 'Nova Conquista!';
    let body = event.title;

    if (event.type === 'graduation' || event.type === 'belt_promotion') {
      title = 'Graduacao!';
      body = `Parabens! ${event.title}`;
    } else if (event.type === 'achievement') {
      title = 'Nova Conquista Desbloqueada!';
      body = `Parabens! Voce conquistou: ${event.title}`;
    }

    await sendToUser(userId, title, body, {
      type: event.type,
      id: eventId,
      academyId,
      studentId,
    });

    console.log(`Notification sent to user ${userId} for timeline event ${eventId}`);
  });

// ============================================
// Cloud Functions - Scheduled (Cron Jobs)
// ============================================

/**
 * Scheduled: Daily at 9:00 AM (Brasilia Time)
 * Action: Check for overdue payments and notify admins
 */
export const scheduledOverdueCheck = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    console.log('Running scheduled overdue payment check');

    const now = new Date();
    const academiesSnapshot = await db.collection('academies').get();

    for (const academyDoc of academiesSnapshot.docs) {
      const academyId = academyDoc.id;
      const academy = academyDoc.data() as Academy;

      // Skip if no admin user
      if (!academy.adminUserId) {
        console.log(`Academy ${academyId} has no admin user`);
        continue;
      }

      // Find overdue financials
      const financialsSnapshot = await db
        .collection('academies')
        .doc(academyId)
        .collection('financials')
        .where('status', '==', 'pending')
        .get();

      let overdueCount = 0;
      let totalOverdueAmount = 0;

      for (const financialDoc of financialsSnapshot.docs) {
        const financial = financialDoc.data() as Financial;
        const dueDate = financial.dueDate.toDate();

        // Check if overdue
        if (dueDate < now) {
          overdueCount++;
          totalOverdueAmount += financial.amount;

          // Update status to overdue if not already
          if (financial.status !== 'overdue') {
            await financialDoc.ref.update({ status: 'overdue' });
          }

          // Calculate days overdue
          const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Notify student about overdue payment
          const userId = await getStudentUserId(financial.studentId, academyId);
          if (userId) {
            await sendToUser(
              userId,
              'Pagamento Atrasado',
              `Sua mensalidade de R$ ${(financial.amount / 100).toFixed(2)} esta atrasada ha ${daysOverdue} dias.`,
              {
                type: 'financial',
                id: financialDoc.id,
                academyId,
              }
            );
          }
        }
      }

      // Notify admin about overdue summary
      if (overdueCount > 0) {
        await sendToUser(
          academy.adminUserId,
          'Resumo de Pagamentos Atrasados',
          `Voce tem ${overdueCount} pagamento(s) atrasado(s) totalizando R$ ${(totalOverdueAmount / 100).toFixed(2)}.`,
          {
            type: 'overdue_summary',
            academyId,
          }
        );
        console.log(`Notified admin of academy ${academyId} about ${overdueCount} overdue payments`);
      }
    }

    console.log('Overdue payment check completed');
    return null;
  });

/**
 * Scheduled: Daily at 8:00 AM (Brasilia Time)
 * Action: Check for payments due soon (3 days before) and notify students
 */
export const scheduledDueSoonReminder = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    console.log('Running scheduled due soon reminder');

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const academiesSnapshot = await db.collection('academies').get();

    for (const academyDoc of academiesSnapshot.docs) {
      const academyId = academyDoc.id;

      // Find pending financials due within 3 days
      const financialsSnapshot = await db
        .collection('academies')
        .doc(academyId)
        .collection('financials')
        .where('status', '==', 'pending')
        .get();

      for (const financialDoc of financialsSnapshot.docs) {
        const financial = financialDoc.data() as Financial;
        const dueDate = financial.dueDate.toDate();

        // Check if due within 3 days (but not overdue)
        if (dueDate > now && dueDate <= threeDaysFromNow) {
          const userId = await getStudentUserId(financial.studentId, academyId);
          if (userId) {
            const daysUntilDue = Math.ceil(
              (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            await sendToUser(
              userId,
              'Lembrete de Pagamento',
              `Sua mensalidade de R$ ${(financial.amount / 100).toFixed(2)} vence em ${daysUntilDue} dia(s).`,
              {
                type: 'financial',
                id: financialDoc.id,
                academyId,
              }
            );
            console.log(`Sent due soon reminder to user ${userId} for financial ${financialDoc.id}`);
          }
        }
      }
    }

    console.log('Due soon reminder completed');
    return null;
  });

// ============================================
// Cloud Functions - HTTP Callable
// ============================================

/**
 * HTTP Callable: Send custom notification to academy students
 * Used by admin to send broadcast messages
 */
export const sendAcademyNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { academyId, title, body, notificationData } = data;

  if (!academyId || !title || !body) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'academyId, title, and body are required'
    );
  }

  // Verify user is admin of the academy
  const academyDoc = await db.collection('academies').doc(academyId).get();
  if (!academyDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Academy not found');
  }

  const academy = academyDoc.data() as Academy;
  if (academy.adminUserId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User is not admin of this academy'
    );
  }

  // Send notification to all academy students
  const success = await sendToTopic(
    `academy_${academyId}`,
    title,
    body,
    notificationData || {}
  );

  return { success };
});

/**
 * HTTP Callable: Send notification to specific user
 * Used for testing or targeted notifications
 */
export const sendUserNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { targetUserId, title, body, notificationData, academyId } = data;

  if (!targetUserId || !title || !body || !academyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'targetUserId, title, body, and academyId are required'
    );
  }

  // Verify user is admin of the academy
  const academyDoc = await db.collection('academies').doc(academyId).get();
  if (!academyDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Academy not found');
  }

  const academy = academyDoc.data() as Academy;
  if (academy.adminUserId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User is not admin of this academy'
    );
  }

  // Send notification to specific user
  const success = await sendToUser(
    targetUserId,
    title,
    body,
    notificationData || {}
  );

  return { success };
});
