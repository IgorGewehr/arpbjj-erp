'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBillingReminderService } from '@/services/billingReminderService';
import { createBillingNotificationService } from '@/services/billingNotificationService';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import {
  ContactType,
  BillingStage,
  BillingReminderSettings,
  Financial,
  StudentContact,
  BulkNotificationResult,
  BulkSendPayload,
  BulkServerResult,
} from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  overdueStages: 'billing-overdue-stages',
  collectionStats: 'billing-collection-stats',
  contactLog: 'billing-contact-log',
  reminderSettings: 'billing-reminder-settings',
  studentContacts: 'billing-student-contacts',
};

// ============================================
// useBillingReminders Hook
// ============================================
export function useBillingReminders() {
  const { user } = useAuth();
  const { academyId, academy } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  const billingService = useMemo(
    () => createBillingReminderService(academyId || 'default'),
    [academyId]
  );

  const notificationService = useMemo(
    () => createBillingNotificationService(academyId || 'default', academy?.name || 'Academia'),
    [academyId, academy?.name]
  );

  // ============================================
  // Fetch Overdue Stages
  // ============================================
  const {
    data: overdueStages,
    isLoading: isLoadingOverdue,
    error: overdueError,
  } = useQuery({
    queryKey: [QUERY_KEYS.overdueStages, academyId],
    queryFn: () => billingService.getOverdueWithStages(),
    staleTime: 1000 * 60 * 2,
    enabled: !!academyId,
  });

  // ============================================
  // Fetch Collection Stats
  // ============================================
  const {
    data: collectionStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: [QUERY_KEYS.collectionStats, academyId],
    queryFn: () => billingService.getCollectionStats(),
    staleTime: 1000 * 60 * 2,
    enabled: !!academyId,
  });

  // ============================================
  // Fetch Student Contacts
  // ============================================
  const {
    data: studentContactsMap,
    isLoading: isLoadingContacts,
  } = useQuery({
    queryKey: [QUERY_KEYS.studentContacts, academyId],
    queryFn: () => billingService.getStudentContacts(),
    staleTime: 1000 * 60 * 5,
    enabled: !!academyId,
  });

  // ============================================
  // Fetch Contact Log for a specific Financial
  // ============================================
  const useContactLog = (financialId: string | null) => {
    return useQuery({
      queryKey: [QUERY_KEYS.contactLog, academyId, financialId],
      queryFn: () => billingService.getContactLog(financialId!),
      enabled: !!financialId,
      staleTime: 1000 * 60 * 2,
    });
  };

  // ============================================
  // Fetch Billing Reminder Settings
  // ============================================
  const {
    data: reminderSettings,
    isLoading: isLoadingSettings,
  } = useQuery({
    queryKey: [QUERY_KEYS.reminderSettings, academyId],
    queryFn: () => billingService.getBillingReminderSettings(),
    staleTime: 1000 * 60 * 5,
    enabled: !!academyId,
  });

  // Sync custom templates to notification service when settings load
  useMemo(() => {
    notificationService.setCustomTemplates(reminderSettings?.messageTemplates);
  }, [notificationService, reminderSettings?.messageTemplates]);

  // ============================================
  // Log Contact Attempt Mutation
  // ============================================
  const logContactMutation = useMutation({
    mutationFn: async (data: {
      financialId: string;
      studentId: string;
      studentName: string;
      type: ContactType;
      notes: string;
      stage: BillingStage;
      daysOverdue: number;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return billingService.logContactAttempt(
        data.financialId,
        data.studentId,
        data.studentName,
        data.type,
        data.notes,
        data.stage,
        data.daysOverdue,
        user.id,
        user.displayName || 'Admin'
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.overdueStages] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.collectionStats] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactLog] });
      success('Contato registrado com sucesso!');
    },
    onError: () => {
      showError('Erro ao registrar contato');
    },
  });

  // ============================================
  // Save Settings Mutation
  // ============================================
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: BillingReminderSettings) => {
      return billingService.saveBillingReminderSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.reminderSettings] });
      success('Configuracoes salvas com sucesso!');
    },
    onError: () => {
      showError('Erro ao salvar configuracoes');
    },
  });

  // ============================================
  // Send WhatsApp Mutation (individual)
  // ============================================
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: {
      financial: Financial;
      contact: StudentContact;
      stage: BillingStage;
      daysOverdue: number;
      customMessage?: string;
    }) => {
      if (!reminderSettings?.whatsappEnabled) throw new Error('Cobranca via WhatsApp esta desabilitada.');

      const payload = notificationService.buildWhatsAppPayload(
        data.financial,
        data.contact,
        data.stage,
        data.daysOverdue,
        data.customMessage
      );

      if (!payload) throw new Error('Aluno sem telefone cadastrado');

      const result = await notificationService.sendWhatsApp(payload);
      if (!result.success) throw new Error(result.error || 'Erro ao enviar WhatsApp');

      // Auto-log contact attempt
      if (user) {
        await billingService.logContactAttempt(
          data.financial.id,
          data.financial.studentId,
          data.financial.studentName || data.contact.studentName,
          'whatsapp',
          `Cobranca enviada via WhatsApp: ${payload.message.substring(0, 100)}...`,
          data.stage,
          data.daysOverdue,
          user.id,
          user.displayName || 'Admin'
        );
      }

      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactLog] });
      success(`WhatsApp enviado para ${vars.financial.studentName || 'aluno'}!`);
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Erro ao enviar WhatsApp');
    },
  });

  // ============================================
  // Send Email Mutation (individual)
  // ============================================
  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      financial: Financial;
      contact: StudentContact;
      stage: BillingStage;
      daysOverdue: number;
      customSubject?: string;
      customMessage?: string;
    }) => {
      if (!reminderSettings?.emailEnabled) throw new Error('Cobranca via Email esta desabilitada.');

      const payload = notificationService.buildEmailPayload(
        data.financial,
        data.contact,
        data.stage,
        data.daysOverdue,
        data.customSubject,
        data.customMessage
      );

      if (!payload) throw new Error('Aluno sem email cadastrado');

      const result = await notificationService.sendEmail(payload);
      if (!result.success) throw new Error(result.error || 'Erro ao enviar email');

      // Auto-log contact attempt
      if (user) {
        await billingService.logContactAttempt(
          data.financial.id,
          data.financial.studentId,
          data.financial.studentName || data.contact.studentName,
          'email',
          `Cobranca enviada via Email: ${payload.subject}`,
          data.stage,
          data.daysOverdue,
          user.id,
          user.displayName || 'Admin'
        );
      }

      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactLog] });
      success(`Email enviado para ${vars.financial.studentName || 'aluno'}!`);
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Erro ao enviar email');
    },
  });

  // ============================================
  // Send Bulk WhatsApp Mutation
  // ============================================
  const sendBulkWhatsAppMutation = useMutation({
    mutationFn: async (data: {
      financials: Financial[];
      stage: BillingStage;
      customMessage?: string;
    }): Promise<BulkNotificationResult> => {
      if (!reminderSettings?.whatsappEnabled) throw new Error('Cobranca via WhatsApp esta desabilitada.');
      if (!studentContactsMap) throw new Error('Contatos dos alunos nao carregados');

      const result = await notificationService.sendBulkWhatsAppForStage(
        data.financials,
        studentContactsMap,
        data.stage,
        data.customMessage
      );

      // Auto-log successful sends
      if (user) {
        for (const r of result.results) {
          if (r.success) {
            const financial = data.financials.find((f) => f.studentId === r.studentId);
            if (financial) {
              const daysOverdue = Math.floor(
                (Date.now() - financial.dueDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              await billingService.logContactAttempt(
                financial.id,
                financial.studentId,
                r.studentName,
                'whatsapp',
                'Cobranca em massa via WhatsApp',
                data.stage,
                daysOverdue,
                user.id,
                user.displayName || 'Admin'
              );
            }
          }
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.overdueStages] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactLog] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.collectionStats] });
      success(`WhatsApp: ${result.sent} enviados, ${result.failed} falharam, ${result.skipped} sem telefone`);
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Erro no envio em massa de WhatsApp');
    },
  });

  // ============================================
  // Send Bulk Email Mutation
  // ============================================
  const sendBulkEmailMutation = useMutation({
    mutationFn: async (data: {
      financials: Financial[];
      stage: BillingStage;
      customSubject?: string;
      customMessage?: string;
    }): Promise<BulkNotificationResult> => {
      if (!reminderSettings?.emailEnabled) throw new Error('Cobranca via Email esta desabilitada.');
      if (!studentContactsMap) throw new Error('Contatos dos alunos nao carregados');

      const result = await notificationService.sendBulkEmailForStage(
        data.financials,
        studentContactsMap,
        data.stage,
        data.customSubject,
        data.customMessage
      );

      // Auto-log successful sends
      if (user) {
        for (const r of result.results) {
          if (r.success) {
            const financial = data.financials.find((f) => f.studentId === r.studentId);
            if (financial) {
              const daysOverdue = Math.floor(
                (Date.now() - financial.dueDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              await billingService.logContactAttempt(
                financial.id,
                financial.studentId,
                r.studentName,
                'email',
                'Cobranca em massa via Email',
                data.stage,
                daysOverdue,
                user.id,
                user.displayName || 'Admin'
              );
            }
          }
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.overdueStages] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactLog] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.collectionStats] });
      success(`Email: ${result.sent} enviados, ${result.failed} falharam, ${result.skipped} sem email`);
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Erro no envio em massa de Email');
    },
  });

  // ============================================
  // Send Bulk (unified WhatsApp + Email) Mutation
  // ============================================
  const sendBulkMutation = useMutation({
    mutationFn: async (data: {
      financials: Financial[];
      stage: BillingStage;
      message: string;
      subject: string;
      scheduledTime?: string;
    }): Promise<BulkServerResult> => {
      if (!studentContactsMap) throw new Error('Contatos dos alunos nao carregados');
      if (!reminderSettings?.whatsappEnabled && !reminderSettings?.emailEnabled) {
        throw new Error('Nenhum canal de notificacao esta habilitado. Habilite WhatsApp ou Email nas configuracoes.');
      }

      const messageTemplate = data.message;
      const subjectTemplate = data.subject;
      let waSent = 0, waFailed = 0, waTotal = 0;
      let emSent = 0, emFailed = 0, emTotal = 0;
      const failures: Array<{ type: 'whatsapp' | 'email'; recipient: string; error: string }> = [];

      for (const financial of data.financials) {
        const contact = studentContactsMap.get(financial.studentId);
        if (!contact) continue;

        const studentName = financial.studentName || contact.studentName;
        const daysOverdue = notificationService.calculateDaysOverdue(financial.dueDate);
        const personalizedMessage = notificationService.applyMessageTemplate(
          messageTemplate, studentName, financial.amount, financial.dueDate, daysOverdue
        );
        const personalizedSubject = notificationService.applyMessageTemplate(
          subjectTemplate, studentName, financial.amount, financial.dueDate, daysOverdue
        );

        // Send WhatsApp (only if enabled in settings)
        if (reminderSettings?.whatsappEnabled) {
          const waPayload = notificationService.buildWhatsAppPayload(
            financial, contact, data.stage, daysOverdue, personalizedMessage
          );
          if (waPayload) {
            waTotal++;
            const result = await notificationService.sendWhatsApp(waPayload);
            if (result.success) waSent++;
            else {
              waFailed++;
              failures.push({ type: 'whatsapp', recipient: waPayload.phone, error: result.error || 'Erro desconhecido' });
            }
          }
        }

        // Send Email (only if enabled in settings)
        if (reminderSettings?.emailEnabled) {
          const emPayload = notificationService.buildEmailPayload(
            financial, contact, data.stage, daysOverdue, personalizedSubject, personalizedMessage
          );
          if (emPayload) {
            emTotal++;
            const result = await notificationService.sendEmail(emPayload);
            if (result.success) emSent++;
            else {
              emFailed++;
              failures.push({ type: 'email', recipient: emPayload.email, error: result.error || 'Erro desconhecido' });
            }
          }
        }

        // Auto-log contact
        if (user) {
          const phone = contact.category === 'kids' ? contact.guardianPhone : contact.phone;
          const email = contact.category === 'kids' ? contact.guardianEmail : contact.email;
          const sentWhatsApp = reminderSettings?.whatsappEnabled && phone;
          const sentEmail = reminderSettings?.emailEnabled && email;
          if (sentWhatsApp || sentEmail) {
            await billingService.logContactAttempt(
              financial.id,
              financial.studentId,
              studentName,
              sentWhatsApp ? 'whatsapp' : 'email',
              'Cobranca em massa (personalizada)',
              data.stage,
              daysOverdue,
              user.id,
              user.displayName || 'Admin'
            );
          }
        }
      }

      return {
        success: true,
        scheduled: false,
        summary: {
          whatsapp: { total: waTotal, sent: waSent, failed: waFailed },
          email: { total: emTotal, sent: emSent, failed: emFailed },
        },
        failures,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.overdueStages] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.contactLog] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.collectionStats] });
      if (result.scheduled) {
        success(`Envio agendado para ${result.scheduledTime}`);
      } else {
        const wa = result.summary.whatsapp;
        const em = result.summary.email;
        success(`WhatsApp: ${wa.sent ?? 0}/${wa.total} | Email: ${em.sent ?? 0}/${em.total}`);
      }
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Erro no envio em massa');
    },
  });

  // ============================================
  // Helper: Get contact for a student
  // ============================================
  const getStudentContact = (studentId: string): StudentContact | undefined => {
    return studentContactsMap?.get(studentId);
  };

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    overdueStages: overdueStages ?? {
      'D+0': [],
      'D+1': [],
      'D+3': [],
      'D+7': [],
      'D+15': [],
      'D+30': [],
    },
    collectionStats,
    reminderSettings,
    studentContactsMap,

    // Sub-hook
    useContactLog,

    // Helpers
    getStudentContact,
    notificationService,

    // Actions - Contact Log
    logContact: logContactMutation.mutateAsync,
    saveSettings: saveSettingsMutation.mutateAsync,

    // Actions - Notifications
    sendWhatsApp: sendWhatsAppMutation.mutateAsync,
    sendEmail: sendEmailMutation.mutateAsync,
    sendBulkWhatsApp: sendBulkWhatsAppMutation.mutateAsync,
    sendBulkEmail: sendBulkEmailMutation.mutateAsync,
    sendBulk: sendBulkMutation.mutateAsync,

    // Loading states
    isLoadingOverdue,
    isLoadingStats,
    isLoadingSettings,
    isLoadingContacts,
    isLoggingContact: logContactMutation.isPending,
    isSavingSettings: saveSettingsMutation.isPending,
    isSendingWhatsApp: sendWhatsAppMutation.isPending,
    isSendingEmail: sendEmailMutation.isPending,
    isSendingBulkWhatsApp: sendBulkWhatsAppMutation.isPending,
    isSendingBulkEmail: sendBulkEmailMutation.isPending,
    isSendingBulk: sendBulkMutation.isPending,

    // Errors
    overdueError,
    statsError,
  };
}

export default useBillingReminders;
