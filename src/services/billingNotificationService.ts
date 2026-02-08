import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Financial,
  BillingStage,
  BillingMessageTemplates,
  StudentContact,
  WhatsAppBillingPayload,
  EmailBillingPayload,
  BillingNotificationResult,
  BulkNotificationResult,
} from '@/types';

// ============================================
// Default Message Templates (with placeholders)
// Placeholders: {nome}, {valor}, {vencimento}, {dias}, {academia}
// ============================================
export const DEFAULT_WHATSAPP_TEMPLATES: Record<BillingStage, string> = {
  'D+1': 'Ola {nome}! Aqui e a {academia}. Identificamos que sua mensalidade de {valor} venceu em {vencimento}. Caso ja tenha efetuado o pagamento, por favor desconsidere esta mensagem. Caso contrario, solicitamos a regularizacao. Obrigado!',
  'D+3': 'Ola {nome}! Sua mensalidade de {valor} da {academia} esta com 3 dias de atraso (vencimento: {vencimento}). Por favor, regularize sua situacao o mais breve possivel. Em caso de duvidas, estamos a disposicao!',
  'D+7': 'Ola {nome}, sua mensalidade de {valor} da {academia} esta com {dias} dias de atraso. Precisamos que regularize sua situacao para manter seus treinos em dia. Entre em contato conosco para combinar o pagamento.',
  'D+15': 'Ola {nome}, sua mensalidade de {valor} da {academia} esta com {dias} dias de atraso. Sua situacao precisa ser regularizada com urgencia para evitar a suspensao do acesso aos treinos. Por favor, entre em contato.',
  'D+30': 'Ola {nome}, sua mensalidade de {valor} da {academia} esta com mais de 30 dias de atraso. Caso a situacao nao seja regularizada, infelizmente precisaremos suspender seu acesso. Entre em contato urgente para negociarmos.',
};

export const DEFAULT_EMAIL_SUBJECT_TEMPLATES: Record<BillingStage, string> = {
  'D+1': 'Lembrete de Pagamento - {academia}',
  'D+3': 'Pagamento Atrasado - {academia}',
  'D+7': 'Pagamento Urgente - {academia}',
  'D+15': 'Aviso de Bloqueio - {academia}',
  'D+30': 'Situacao Critica de Pagamento - {academia}',
};

export const DEFAULT_EMAIL_BODY_TEMPLATES: Record<BillingStage, string> = {
  'D+1': 'Prezado(a) {nome},\n\nIdentificamos que sua mensalidade no valor de {valor} com vencimento em {vencimento} ainda nao foi quitada.\n\nCaso ja tenha efetuado o pagamento, por favor desconsidere esta mensagem.\n\nCaso contrario, solicitamos que regularize sua situacao o mais breve possivel.\n\nAtenciosamente,\n{academia}',
  'D+3': 'Prezado(a) {nome},\n\nSua mensalidade no valor de {valor} da {academia} esta com 3 dias de atraso (vencimento: {vencimento}).\n\nPor favor, regularize sua situacao o mais breve possivel.\n\nEm caso de duvidas ou dificuldades, estamos a disposicao para ajudar.\n\nAtenciosamente,\n{academia}',
  'D+7': 'Prezado(a) {nome},\n\nGostaramos de informar que sua mensalidade no valor de {valor} esta com {dias} dias de atraso.\n\nPrecisamos que regularize sua situacao para manter seus treinos em dia. Entre em contato conosco para combinar a melhor forma de pagamento.\n\nAtenciosamente,\n{academia}',
  'D+15': 'Prezado(a) {nome},\n\nSua mensalidade no valor de {valor} esta com {dias} dias de atraso.\n\nInformamos que sua situacao precisa ser regularizada com URGENCIA para evitar a suspensao do acesso aos treinos.\n\nPor favor, entre em contato imediatamente para negociarmos o pagamento.\n\nAtenciosamente,\n{academia}',
  'D+30': 'Prezado(a) {nome},\n\nSua mensalidade no valor de {valor} esta com mais de 30 dias de atraso.\n\nCaso a situacao nao seja regularizada nos proximos dias, infelizmente precisaremos suspender seu acesso a academia.\n\nEntre em contato urgente para que possamos encontrar uma solucao.\n\nAtenciosamente,\n{academia}',
};

// ============================================
// Helper: Apply placeholders to a template
// ============================================
function applyTemplate(template: string, vars: MessageVars): string {
  return template
    .replace(/\{nome\}/g, vars.studentName)
    .replace(/\{valor\}/g, vars.amountFormatted)
    .replace(/\{vencimento\}/g, vars.dueDateFormatted)
    .replace(/\{dias\}/g, String(vars.daysOverdue))
    .replace(/\{academia\}/g, vars.academyName);
}

// ============================================
// Types
// ============================================
interface MessageVars {
  studentName: string;
  academyName: string;
  amountFormatted: string;
  dueDateFormatted: string;
  daysOverdue: number;
}

// ============================================
// Helper: Format currency
// ============================================
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ============================================
// Helper: Format phone for WhatsApp (ensure 55 prefix)
// ============================================
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
};

// ============================================
// Billing Notification Service
// ============================================
export class BillingNotificationService {
  private academyId: string;
  private academyName: string;
  private customTemplates: BillingMessageTemplates | undefined;

  constructor(academyId: string, academyName: string, customTemplates?: BillingMessageTemplates) {
    this.academyId = academyId;
    this.academyName = academyName;
    this.customTemplates = customTemplates;
  }

  setCustomTemplates(templates: BillingMessageTemplates | undefined) {
    this.customTemplates = templates;
  }

  // ============================================
  // Generate WhatsApp message for a billing stage
  // ============================================
  generateWhatsAppMessage(
    stage: BillingStage,
    studentName: string,
    amount: number,
    dueDate: Date,
    daysOverdue: number,
    customMessage?: string
  ): string {
    if (customMessage) return customMessage;

    const vars: MessageVars = {
      studentName,
      academyName: this.academyName,
      amountFormatted: formatCurrency(amount),
      dueDateFormatted: format(dueDate, 'dd/MM/yyyy', { locale: ptBR }),
      daysOverdue,
    };

    const template = this.customTemplates?.whatsapp?.[stage] || DEFAULT_WHATSAPP_TEMPLATES[stage];
    return applyTemplate(template, vars);
  }

  // ============================================
  // Generate Email subject and message
  // ============================================
  generateEmailContent(
    stage: BillingStage,
    studentName: string,
    amount: number,
    dueDate: Date,
    daysOverdue: number,
    customSubject?: string,
    customMessage?: string
  ): { subject: string; message: string } {
    const vars: MessageVars = {
      studentName,
      academyName: this.academyName,
      amountFormatted: formatCurrency(amount),
      dueDateFormatted: format(dueDate, 'dd/MM/yyyy', { locale: ptBR }),
      daysOverdue,
    };

    const subjectTemplate = this.customTemplates?.emailSubject?.[stage] || DEFAULT_EMAIL_SUBJECT_TEMPLATES[stage];
    const bodyTemplate = this.customTemplates?.emailBody?.[stage] || DEFAULT_EMAIL_BODY_TEMPLATES[stage];

    return {
      subject: customSubject || applyTemplate(subjectTemplate, vars),
      message: customMessage || applyTemplate(bodyTemplate, vars),
    };
  }

  // ============================================
  // Build WhatsApp Payload
  // ============================================
  buildWhatsAppPayload(
    financial: Financial,
    contact: StudentContact,
    stage: BillingStage,
    daysOverdue: number,
    customMessage?: string
  ): WhatsAppBillingPayload | null {
    const phone = contact.category === 'kids' && contact.guardianPhone
      ? contact.guardianPhone
      : contact.phone;

    if (!phone) return null;

    const message = this.generateWhatsAppMessage(
      stage,
      financial.studentName || contact.studentName,
      financial.amount,
      financial.dueDate,
      daysOverdue,
      customMessage
    );

    return {
      phone: normalizePhone(phone),
      studentName: financial.studentName || contact.studentName,
      studentId: financial.studentId,
      financialId: financial.id,
      academyId: this.academyId,
      academyName: this.academyName,
      amount: financial.amount,
      amountFormatted: formatCurrency(financial.amount),
      dueDate: format(financial.dueDate, 'yyyy-MM-dd'),
      dueDateFormatted: format(financial.dueDate, 'dd/MM/yyyy', { locale: ptBR }),
      daysOverdue,
      stage,
      message,
      type: 'billing_reminder',
    };
  }

  // ============================================
  // Build Email Payload
  // ============================================
  buildEmailPayload(
    financial: Financial,
    contact: StudentContact,
    stage: BillingStage,
    daysOverdue: number,
    customSubject?: string,
    customMessage?: string
  ): EmailBillingPayload | null {
    const email = contact.category === 'kids' && contact.guardianEmail
      ? contact.guardianEmail
      : contact.email;

    if (!email) return null;

    const { subject, message } = this.generateEmailContent(
      stage,
      financial.studentName || contact.studentName,
      financial.amount,
      financial.dueDate,
      daysOverdue,
      customSubject,
      customMessage
    );

    return {
      email,
      studentName: financial.studentName || contact.studentName,
      studentId: financial.studentId,
      financialId: financial.id,
      academyId: this.academyId,
      academyName: this.academyName,
      amount: financial.amount,
      amountFormatted: formatCurrency(financial.amount),
      dueDate: format(financial.dueDate, 'yyyy-MM-dd'),
      dueDateFormatted: format(financial.dueDate, 'dd/MM/yyyy', { locale: ptBR }),
      daysOverdue,
      stage,
      subject,
      message,
      type: 'billing_reminder',
    };
  }

  // ============================================
  // Send Single WhatsApp (via server proxy)
  // ============================================
  async sendWhatsApp(
    payload: WhatsAppBillingPayload
  ): Promise<BillingNotificationResult> {
    try {
      const response = await fetch('/api/billing/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return {
        success: true,
        studentName: payload.studentName,
        studentId: payload.studentId,
        channel: 'whatsapp',
      };
    } catch (err) {
      return {
        success: false,
        studentName: payload.studentName,
        studentId: payload.studentId,
        channel: 'whatsapp',
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      };
    }
  }

  // ============================================
  // Send Single Email (via server proxy)
  // ============================================
  async sendEmail(
    payload: EmailBillingPayload
  ): Promise<BillingNotificationResult> {
    try {
      const response = await fetch('/api/billing/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return {
        success: true,
        studentName: payload.studentName,
        studentId: payload.studentId,
        channel: 'email',
      };
    } catch (err) {
      return {
        success: false,
        studentName: payload.studentName,
        studentId: payload.studentId,
        channel: 'email',
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      };
    }
  }

  // ============================================
  // Send Bulk WhatsApp
  // ============================================
  async sendBulkWhatsApp(
    payloads: WhatsAppBillingPayload[]
  ): Promise<BulkNotificationResult> {
    const results: BillingNotificationResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const result = await this.sendWhatsApp(payload);
      results.push(result);
      if (result.success) sent++;
      else failed++;
    }

    return {
      total: payloads.length,
      sent,
      failed,
      skipped: 0,
      results,
    };
  }

  // ============================================
  // Send Bulk Email
  // ============================================
  async sendBulkEmail(
    payloads: EmailBillingPayload[]
  ): Promise<BulkNotificationResult> {
    const results: BillingNotificationResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const payload of payloads) {
      const result = await this.sendEmail(payload);
      results.push(result);
      if (result.success) sent++;
      else failed++;
    }

    return {
      total: payloads.length,
      sent,
      failed,
      skipped: 0,
      results,
    };
  }

  // ============================================
  // Send Bulk WhatsApp for a Stage (convenience)
  // ============================================
  async sendBulkWhatsAppForStage(
    financials: Financial[],
    contacts: Map<string, StudentContact>,
    stage: BillingStage,
    customMessage?: string
  ): Promise<BulkNotificationResult> {
    const payloads: WhatsAppBillingPayload[] = [];
    let skipped = 0;

    for (const financial of financials) {
      const contact = contacts.get(financial.studentId);
      if (!contact) {
        skipped++;
        continue;
      }

      const daysOverdue = this.calculateDaysOverdue(financial.dueDate);
      const payload = this.buildWhatsAppPayload(financial, contact, stage, daysOverdue, customMessage);

      if (payload) {
        payloads.push(payload);
      } else {
        skipped++;
      }
    }

    const result = await this.sendBulkWhatsApp(payloads);
    result.skipped = skipped;
    result.total = financials.length;
    return result;
  }

  // ============================================
  // Send Bulk Email for a Stage (convenience)
  // ============================================
  async sendBulkEmailForStage(
    financials: Financial[],
    contacts: Map<string, StudentContact>,
    stage: BillingStage,
    customSubject?: string,
    customMessage?: string
  ): Promise<BulkNotificationResult> {
    const payloads: EmailBillingPayload[] = [];
    let skipped = 0;

    for (const financial of financials) {
      const contact = contacts.get(financial.studentId);
      if (!contact) {
        skipped++;
        continue;
      }

      const daysOverdue = this.calculateDaysOverdue(financial.dueDate);
      const payload = this.buildEmailPayload(financial, contact, stage, daysOverdue, customSubject, customMessage);

      if (payload) {
        payloads.push(payload);
      } else {
        skipped++;
      }
    }

    const result = await this.sendBulkEmail(payloads);
    result.skipped = skipped;
    result.total = financials.length;
    return result;
  }

  // ============================================
  // Helper: Calculate days overdue
  // ============================================
  private calculateDaysOverdue(dueDate: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// ============================================
// Factory Function
// ============================================
export function createBillingNotificationService(
  academyId: string,
  academyName: string
): BillingNotificationService {
  return new BillingNotificationService(academyId, academyName);
}
