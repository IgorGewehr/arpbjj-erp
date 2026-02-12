'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Tab,
  Tabs,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Alert,
  Badge,
  Switch,
  FormControlLabel,
  Tooltip,
  Collapse,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  Mail,
  User,
  Clock,
  DollarSign,
  TrendingDown,
  Settings,
  ChevronRight,
  Search,
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBillingReminders } from '@/hooks/useBillingReminders';
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  DEFAULT_EMAIL_SUBJECT_TEMPLATES,
  DEFAULT_EMAIL_BODY_TEMPLATES,
} from '@/services/billingNotificationService';
import { useQuery } from '@tanstack/react-query';
import { createBillingReminderService } from '@/services/billingReminderService';
import { useAcademy } from '@/contexts/AcademyContext';
import {
  Financial,
  BillingStage,
  BillingMessageTemplates,
  ContactType,
  BillingContactLog,
  BillingReminderSettings,
  StudentContact,
  BulkNotificationResult,
  BulkServerResult,
} from '@/types';

// ============================================
// Stage Config
// ============================================
const STAGE_LABELS: Record<BillingStage, string> = {
  'D+1': 'D+1',
  'D+3': 'D+3',
  'D+7': 'D+7',
  'D+15': 'D+15',
  'D+30': 'D+30+',
};

const STAGE_COLORS: Record<BillingStage, 'warning' | 'warning' | 'error' | 'error' | 'error'> = {
  'D+1': 'warning',
  'D+3': 'warning',
  'D+7': 'error',
  'D+15': 'error',
  'D+30': 'error',
};

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Telefone',
  email: 'E-mail',
  in_person: 'Presencial',
  system: 'Sistema',
};

const STAGES_ORDER: BillingStage[] = ['D+1', 'D+3', 'D+7', 'D+15', 'D+30'];

// ============================================
// Helper: Format currency
// ============================================
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ============================================
// Helper: Calculate days overdue
// ============================================
const getDaysOverdue = (dueDate: Date): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================
// Helper: Classify stage from days overdue
// ============================================
const getStageFromDays = (daysOverdue: number): BillingStage => {
  if (daysOverdue >= 30) return 'D+30';
  if (daysOverdue >= 15) return 'D+15';
  if (daysOverdue >= 7) return 'D+7';
  if (daysOverdue >= 3) return 'D+3';
  return 'D+1';
};

// ============================================
// Contact Log Panel Component
// ============================================
function ContactLogPanel({ financialId }: { financialId: string }) {
  const { academyId } = useAcademy();

  const { data: contactLogs = [], isLoading } = useQuery({
    queryKey: ['billing-contact-log', academyId, financialId],
    queryFn: () => createBillingReminderService(academyId || 'default').getContactLog(financialId),
    enabled: !!financialId,
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </Box>
    );
  }

  if (contactLogs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
        Nenhum contato registrado.
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 1, maxHeight: 200, overflowY: 'auto' }}>
      {contactLogs.map((log: BillingContactLog) => (
        <Box key={log.id} sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Chip
              label={CONTACT_TYPE_LABELS[log.type]}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Typography variant="caption" color="text.secondary">
              {format(new Date(log.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </Typography>
          </Box>
          {log.notes && (
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {log.notes}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Por: {log.contactedByName}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ============================================
// Main Dashboard Component
// ============================================
export function BillingRemindersDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { academyId } = useAcademy();

  const {
    overdueStages,
    collectionStats,
    reminderSettings,
    getStudentContact,
    notificationService,
    logContact,
    saveSettings,
    sendWhatsApp,
    sendEmail,
    sendBulkWhatsApp,
    sendBulkEmail,
    sendBulk,
    isLoadingOverdue,
    isLoadingStats,
    isLoadingSettings,
    isLoggingContact,
    isSavingSettings,
    isSendingWhatsApp,
    isSendingEmail,
    isSendingBulkWhatsApp,
    isSendingBulkEmail,
    isSendingBulk,
  } = useBillingReminders();

  // ============================================
  // State
  // ============================================
  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedFinancial, setSelectedFinancial] = useState<Financial | null>(null);
  const [contactType, setContactType] = useState<ContactType>('whatsapp');
  const [contactNotes, setContactNotes] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Message preview dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageDialogMode, setMessageDialogMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [messageDialogBulk, setMessageDialogBulk] = useState(false);
  const [messageDialogFinancial, setMessageDialogFinancial] = useState<Financial | null>(null);
  const [messageText, setMessageText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  // Bulk send result dialog state (legacy individual channel)
  const [bulkSendResult, setBulkSendResult] = useState<BulkNotificationResult | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogMode, setResultDialogMode] = useState<'whatsapp' | 'email'>('whatsapp');

  // Unified bulk dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkScheduleEnabled, setBulkScheduleEnabled] = useState(false);
  const [bulkScheduledTime, setBulkScheduledTime] = useState('');
  const [bulkServerResult, setBulkServerResult] = useState<BulkServerResult | null>(null);
  const [bulkServerResultDialogOpen, setBulkServerResultDialogOpen] = useState(false);

  // Local settings state for editing
  const [localSettings, setLocalSettings] = useState<BillingReminderSettings | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplateStage, setEditingTemplateStage] = useState<BillingStage>('D+1');

  // Initialize local settings when loaded
  const editableSettings = localSettings ?? reminderSettings ?? null;

  // ============================================
  // Derived Data
  // ============================================
  const currentStage = STAGES_ORDER[activeTab];
  const currentStageFinancials = overdueStages[currentStage] || [];

  const filteredFinancials = useMemo(() => {
    if (!searchQuery.trim()) return currentStageFinancials;
    const query = searchQuery.toLowerCase();
    return currentStageFinancials.filter(
      (f) =>
        f.studentName?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query)
    );
  }, [currentStageFinancials, searchQuery]);

  const totalByStage = useMemo(() => {
    return STAGES_ORDER.map((stage) => overdueStages[stage]?.length || 0);
  }, [overdueStages]);

  // Check if channels are enabled
  const whatsappEnabled = !!reminderSettings?.whatsappEnabled;
  const emailEnabled = !!reminderSettings?.emailEnabled;

  // ============================================
  // Handlers
  // ============================================
  const handleOpenContactDialog = (financial: Financial) => {
    setSelectedFinancial(financial);
    setContactType('whatsapp');
    setContactNotes('');
    setContactDialogOpen(true);
  };

  const handleCloseContactDialog = () => {
    setContactDialogOpen(false);
    setSelectedFinancial(null);
    setContactType('whatsapp');
    setContactNotes('');
  };

  const handleLogContact = async () => {
    if (!selectedFinancial) return;

    const daysOverdue = getDaysOverdue(selectedFinancial.dueDate);
    const stage = getStageFromDays(daysOverdue);

    try {
      await logContact({
        financialId: selectedFinancial.id,
        studentId: selectedFinancial.studentId,
        studentName: selectedFinancial.studentName || 'Aluno',
        type: contactType,
        notes: contactNotes,
        stage,
        daysOverdue,
      });
      handleCloseContactDialog();
    } catch {
      // Error is handled by mutation
    }
  };

  const handleSaveSettings = async () => {
    if (!editableSettings) return;
    try {
      await saveSettings(editableSettings);
      setLocalSettings(null);
    } catch {
      // Error is handled by mutation
    }
  };

  const handleToggleStageEnabled = (stageIndex: number) => {
    if (!editableSettings) return;
    const updated = { ...editableSettings };
    updated.stages = [...updated.stages];
    updated.stages[stageIndex] = {
      ...updated.stages[stageIndex],
      enabled: !updated.stages[stageIndex].enabled,
    };
    setLocalSettings(updated);
  };

  const handleToggleNotifyAdmin = (stageIndex: number) => {
    if (!editableSettings) return;
    const updated = { ...editableSettings };
    updated.stages = [...updated.stages];
    updated.stages[stageIndex] = {
      ...updated.stages[stageIndex],
      notifyAdmin: !updated.stages[stageIndex].notifyAdmin,
    };
    setLocalSettings(updated);
  };

  const handleToggleNotifyStudent = (stageIndex: number) => {
    if (!editableSettings) return;
    const updated = { ...editableSettings };
    updated.stages = [...updated.stages];
    updated.stages[stageIndex] = {
      ...updated.stages[stageIndex],
      notifyStudent: !updated.stages[stageIndex].notifyStudent,
    };
    setLocalSettings(updated);
  };

  const handleToggleLogExpand = (financialId: string) => {
    setExpandedLog((prev) => (prev === financialId ? null : financialId));
  };

  // ============================================
  // Message Dialog Handlers
  // ============================================
  const openSendWhatsApp = (financial: Financial) => {
    const daysOverdue = getDaysOverdue(financial.dueDate);
    const stage = getStageFromDays(daysOverdue);
    const contact = getStudentContact(financial.studentId);
    const phone = contact?.category === 'kids'
      ? contact?.guardianPhone
      : contact?.phone;

    if (!phone) {
      return; // No phone - button should be disabled
    }

    const msg = notificationService.generateWhatsAppMessage(
      stage,
      financial.studentName || 'Aluno',
      financial.amount,
      financial.dueDate,
      daysOverdue
    );

    setMessageDialogFinancial(financial);
    setMessageDialogMode('whatsapp');
    setMessageDialogBulk(false);
    setMessageText(msg);
    setMessageDialogOpen(true);
  };

  const openSendEmail = (financial: Financial) => {
    const daysOverdue = getDaysOverdue(financial.dueDate);
    const stage = getStageFromDays(daysOverdue);
    const contact = getStudentContact(financial.studentId);
    const email = contact?.category === 'kids'
      ? contact?.guardianEmail
      : contact?.email;

    if (!email) {
      return; // No email - button should be disabled
    }

    const { subject, message } = notificationService.generateEmailContent(
      stage,
      financial.studentName || 'Aluno',
      financial.amount,
      financial.dueDate,
      daysOverdue
    );

    setMessageDialogFinancial(financial);
    setMessageDialogMode('email');
    setMessageDialogBulk(false);
    setMessageText(message);
    setEmailSubject(subject);
    setMessageDialogOpen(true);
  };

  const openBulkSend = (mode: 'whatsapp' | 'email') => {
    // Generate a sample message for the first student in the stage
    const sample = currentStageFinancials[0];
    if (!sample) return;

    const daysOverdue = getDaysOverdue(sample.dueDate);

    if (mode === 'whatsapp') {
      const msg = notificationService.generateWhatsAppMessage(
        currentStage,
        '{NOME_ALUNO}',
        0,
        sample.dueDate,
        daysOverdue
      );
      setMessageText(msg);
    } else {
      const { subject, message } = notificationService.generateEmailContent(
        currentStage,
        '{NOME_ALUNO}',
        0,
        sample.dueDate,
        daysOverdue
      );
      setMessageText(message);
      setEmailSubject(subject);
    }

    setMessageDialogFinancial(null);
    setMessageDialogMode(mode);
    setMessageDialogBulk(true);
    setMessageDialogOpen(true);
  };

  const handleCloseMessageDialog = () => {
    setMessageDialogOpen(false);
    setMessageDialogFinancial(null);
    setMessageText('');
    setEmailSubject('');
  };

  const handleConfirmSend = async () => {
    try {
      if (messageDialogBulk) {
        // Bulk send
        let result: BulkNotificationResult;
        if (messageDialogMode === 'whatsapp') {
          result = await sendBulkWhatsApp({
            financials: currentStageFinancials,
            stage: currentStage,
            customMessage: messageText || undefined,
          });
        } else {
          result = await sendBulkEmail({
            financials: currentStageFinancials,
            stage: currentStage,
            customSubject: emailSubject || undefined,
            customMessage: messageText || undefined,
          });
        }
        // Show result dialog instead of just closing
        handleCloseMessageDialog();
        setBulkSendResult(result);
        setResultDialogMode(messageDialogMode);
        setResultDialogOpen(true);
      } else if (messageDialogFinancial) {
        // Individual send
        const contact = getStudentContact(messageDialogFinancial.studentId);
        if (!contact) return;

        const daysOverdue = getDaysOverdue(messageDialogFinancial.dueDate);
        const stage = getStageFromDays(daysOverdue);

        if (messageDialogMode === 'whatsapp') {
          await sendWhatsApp({
            financial: messageDialogFinancial,
            contact,
            stage,
            daysOverdue,
            customMessage: messageText || undefined,
          });
        } else {
          await sendEmail({
            financial: messageDialogFinancial,
            contact,
            stage,
            daysOverdue,
            customSubject: emailSubject || undefined,
            customMessage: messageText || undefined,
          });
        }
        handleCloseMessageDialog();
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleRetryFailed = async () => {
    if (!bulkSendResult) return;
    const failedStudentIds = new Set(
      bulkSendResult.results
        .filter((r) => !r.success)
        .map((r) => r.studentId)
    );
    const failedFinancials = currentStageFinancials.filter(
      (f) => failedStudentIds.has(f.studentId)
    );
    if (failedFinancials.length === 0) return;

    setResultDialogOpen(false);

    try {
      let result: BulkNotificationResult;
      if (resultDialogMode === 'whatsapp') {
        result = await sendBulkWhatsApp({
          financials: failedFinancials,
          stage: currentStage,
        });
      } else {
        result = await sendBulkEmail({
          financials: failedFinancials,
          stage: currentStage,
        });
      }
      setBulkSendResult(result);
      setResultDialogOpen(true);
    } catch {
      // Error handled by mutation
    }
  };

  // ============================================
  // Helpers for contact info
  // ============================================
  const getStudentPhone = (studentId: string): string | undefined => {
    const contact = getStudentContact(studentId);
    if (!contact) return undefined;
    return contact.category === 'kids'
      ? contact.guardianPhone
      : contact.phone;
  };

  const getStudentEmail = (studentId: string): string | undefined => {
    const contact = getStudentContact(studentId);
    if (!contact) return undefined;
    return contact.category === 'kids'
      ? contact.guardianEmail
      : contact.email;
  };

  // ============================================
  // Render: KPI Cards
  // ============================================
  const renderKPICards = () => {
    if (isLoadingStats) {
      return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Paper sx={{ p: 2 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="80%" height={40} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      );
    }

    const kpis = [
      {
        label: 'Total Vencido',
        value: formatCurrency(collectionStats?.totalOverdueAmount || 0),
        icon: <DollarSign size={20} />,
        color: theme.palette.error.main,
        bgColor: theme.palette.error.light + '20',
      },
      {
        label: 'Inadimplentes',
        value: collectionStats?.totalStudentsOverdue || 0,
        icon: <User size={20} />,
        color: theme.palette.warning.main,
        bgColor: theme.palette.warning.light + '20',
      },
      {
        label: 'Taxa Recuperacao',
        value: `${collectionStats?.recoveryRate?.toFixed(1) || '0.0'}%`,
        icon: <TrendingDown size={20} />,
        color: theme.palette.success.main,
        bgColor: theme.palette.success.light + '20',
      },
      {
        label: 'Media Dias Atraso',
        value: `${collectionStats?.averageDaysOverdue || 0} dias`,
        icon: <Clock size={20} />,
        color: theme.palette.info.main,
        bgColor: theme.palette.info.light + '20',
      },
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, index) => (
          <Grid size={{ xs: 6, md: 3 }} key={index}>
            <Paper
              sx={{
                p: 2,
                borderLeft: `4px solid ${kpi.color}`,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    backgroundColor: kpi.bgColor,
                    color: kpi.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {kpi.icon}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {kpi.label}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: kpi.color }}>
                {kpi.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  // ============================================
  // Render: Stage Tabs
  // ============================================
  const renderStageTabs = () => {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          {STAGES_ORDER.map((stage, index) => (
            <Tab
              key={stage}
              label={
                <Badge
                  badgeContent={totalByStage[index]}
                  color={totalByStage[index] > 0 ? 'error' : 'default'}
                  max={99}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, px: 1 }}>
                    {STAGE_LABELS[stage]}
                  </Typography>
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>
    );
  };

  // ============================================
  // Render: Search Bar + Bulk Actions
  // ============================================
  const renderSearchBar = () => {
    const stageCount = currentStageFinancials.length;

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <TextField
            size="small"
            placeholder="Buscar aluno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} />,
              },
            }}
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <Tooltip title="Configuracoes da regua de cobranca">
            <IconButton onClick={() => setShowSettings(!showSettings)}>
              <Settings size={20} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Bulk Action Button - Unified */}
        {stageCount > 0 && (whatsappEnabled || emailEnabled) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={isSendingBulk ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
              onClick={() => {
                const msg = notificationService.generateGenericStageMessage(currentStage);
                const subj = notificationService.generateGenericEmailSubject(currentStage);
                setBulkMessage(msg);
                setBulkSubject(subj);
                setBulkScheduleEnabled(false);
                setBulkScheduledTime('');
                setBulkDialogOpen(true);
              }}
              disabled={isSendingBulk}
            >
              {isSendingBulk ? 'Enviando...' : `Cobrar todos (${stageCount})`}
            </Button>
          </Box>
        )}

        {/* Channel Warning */}
        {!whatsappEnabled && !emailEnabled && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Habilite os canais de cobranca (WhatsApp e/ou Email) nas configuracoes para enviar cobrancas automaticas.
          </Alert>
        )}
      </Box>
    );
  };

  // ============================================
  // Render: Student List
  // ============================================
  const renderStudentList = () => {
    if (isLoadingOverdue) {
      return (
        <Box>
          {[1, 2, 3].map((i) => (
            <Paper key={i} sx={{ p: 2, mb: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="rectangular" height={30} sx={{ mt: 1 }} />
            </Paper>
          ))}
        </Box>
      );
    }

    if (filteredFinancials.length === 0) {
      return (
        <Alert severity="success" sx={{ mt: 2 }}>
          Nenhum pagamento vencido nesta faixa. Otimo trabalho!
        </Alert>
      );
    }

    return (
      <Box>
        {filteredFinancials.map((financial) => {
          const daysOverdue = getDaysOverdue(financial.dueDate);
          const isExpanded = expandedLog === financial.id;
          const studentPhone = getStudentPhone(financial.studentId);
          const studentEmail = getStudentEmail(financial.studentId);

          return (
            <Paper key={financial.id} sx={{ p: 2, mb: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 1,
                }}
              >
                {/* Student Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                      {financial.studentName || 'Aluno'}
                    </Typography>
                    <Chip
                      label={`${daysOverdue} dias`}
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      Valor: <strong>{formatCurrency(financial.amount)}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vencimento:{' '}
                      <strong>{format(new Date(financial.dueDate), 'dd/MM/yyyy')}</strong>
                    </Typography>
                    {financial.description && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {financial.description}
                      </Typography>
                    )}
                  </Box>
                  {/* Contact info chips */}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {studentPhone && (
                      <Chip
                        icon={<Phone size={12} />}
                        label={studentPhone}
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    )}
                    {studentEmail && (
                      <Chip
                        icon={<Mail size={12} />}
                        label={studentEmail}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    )}
                    {!studentPhone && !studentEmail && (
                      <Chip
                        icon={<AlertTriangle size={12} />}
                        label={
                          getStudentContact(financial.studentId)?.category === 'kids'
                            ? 'Sem contato do responsavel'
                            : 'Sem contato'
                        }
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                  <Tooltip title={studentPhone ? (whatsappEnabled ? `Enviar WhatsApp para ${studentPhone}` : 'Habilite WhatsApp nas configuracoes') : 'Sem telefone cadastrado'}>
                    <span>
                      <IconButton
                        size="small"
                        color="success"
                        disabled={!studentPhone || !whatsappEnabled || isSendingWhatsApp}
                        onClick={() => openSendWhatsApp(financial)}
                      >
                        {isSendingWhatsApp && messageDialogFinancial?.id === financial.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <MessageSquare size={18} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={studentEmail ? (emailEnabled ? `Enviar Email para ${studentEmail}` : 'Habilite Email nas configuracoes') : 'Sem email cadastrado'}>
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={!studentEmail || !emailEnabled || isSendingEmail}
                        onClick={() => openSendEmail(financial)}
                      >
                        {isSendingEmail && messageDialogFinancial?.id === financial.id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Mail size={18} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Ligar">
                    <span>
                      <IconButton
                        size="small"
                        color="default"
                        disabled={!studentPhone}
                        onClick={() => {
                          if (studentPhone) {
                            window.open(`tel:${studentPhone}`, '_self');
                          }
                        }}
                      >
                        <Phone size={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Registrar contato manual">
                    <IconButton
                      size="small"
                      color="default"
                      onClick={() => handleOpenContactDialog(financial)}
                    >
                      <Send size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ver historico de contatos">
                    <IconButton
                      size="small"
                      onClick={() => handleToggleLogExpand(financial.id)}
                    >
                      <ChevronRight
                        size={18}
                        style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Expandable Contact Log */}
              <Collapse in={isExpanded}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                  Historico de Contatos
                </Typography>
                <ContactLogPanel financialId={financial.id} />
              </Collapse>
            </Paper>
          );
        })}
      </Box>
    );
  };

  // ============================================
  // Render: Settings Panel
  // ============================================
  const renderSettingsPanel = () => {
    if (!editableSettings) {
      if (isLoadingSettings) {
        return (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={100} sx={{ mt: 1 }} />
          </Paper>
        );
      }
      return null;
    }

    return (
      <Collapse in={showSettings}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Configuracoes da Regua de Cobranca
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={editableSettings.enabled}
                  onChange={() => {
                    setLocalSettings({
                      ...editableSettings,
                      enabled: !editableSettings.enabled,
                    });
                  }}
                />
              }
              label="Ativo"
            />
          </Box>

          {/* Channel Toggles */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Canais de Cobranca
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editableSettings.whatsappEnabled ?? false}
                    onChange={() => {
                      setLocalSettings({
                        ...editableSettings,
                        whatsappEnabled: !editableSettings.whatsappEnabled,
                      });
                    }}
                    color="success"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MessageSquare size={16} />
                    <Typography variant="body2">Cobranca via WhatsApp</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editableSettings.emailEnabled ?? false}
                    onChange={() => {
                      setLocalSettings({
                        ...editableSettings,
                        emailEnabled: !editableSettings.emailEnabled,
                      });
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Mail size={16} />
                    <Typography variant="body2">Cobranca via Email</Typography>
                  </Box>
                }
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Stage configs */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Estagios da Regua
          </Typography>

          {editableSettings.stages.map((stageConfig, index) => (
            <Box
              key={stageConfig.stage}
              sx={{
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 2,
                py: 1.5,
                borderBottom: index < editableSettings.stages.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ minWidth: 60 }}>
                <Chip
                  label={STAGE_LABELS[stageConfig.stage]}
                  size="small"
                  color={stageConfig.enabled ? 'primary' : 'default'}
                  variant={stageConfig.enabled ? 'filled' : 'outlined'}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={stageConfig.enabled}
                    onChange={() => handleToggleStageEnabled(index)}
                  />
                }
                label={<Typography variant="body2">Ativo</Typography>}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={stageConfig.notifyAdmin}
                    onChange={() => handleToggleNotifyAdmin(index)}
                    disabled={!stageConfig.enabled}
                  />
                }
                label={<Typography variant="body2">Notificar Admin</Typography>}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={stageConfig.notifyStudent}
                    onChange={() => handleToggleNotifyStudent(index)}
                    disabled={!stageConfig.enabled}
                  />
                }
                label={<Typography variant="body2">Notificar Aluno</Typography>}
              />

              <Typography variant="body2" color="text.secondary">
                {stageConfig.days} dias apos vencimento
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          {/* Template Editor */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Templates de Mensagem
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
            >
              {showTemplateEditor ? 'Ocultar' : 'Editar Templates'}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Variaveis disponiveis: {'{nome}'}, {'{valor}'}, {'{vencimento}'}, {'{dias}'}, {'{academia}'}
          </Typography>

          <Collapse in={showTemplateEditor}>
            <Box sx={{ mb: 2 }}>
              <Tabs
                value={STAGES_ORDER.indexOf(editingTemplateStage)}
                onChange={(_, v) => setEditingTemplateStage(STAGES_ORDER[v])}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2 }}
              >
                {STAGES_ORDER.map((s) => (
                  <Tab key={s} label={s} sx={{ minWidth: 60, fontSize: '0.75rem' }} />
                ))}
              </Tabs>

              {/* WhatsApp Template */}
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label={`WhatsApp - ${editingTemplateStage}`}
                value={
                  editableSettings?.messageTemplates?.whatsapp?.[editingTemplateStage]
                  ?? DEFAULT_WHATSAPP_TEMPLATES[editingTemplateStage]
                }
                onChange={(e) => {
                  const updated = { ...editableSettings! };
                  if (!updated.messageTemplates) updated.messageTemplates = {};
                  if (!updated.messageTemplates.whatsapp) updated.messageTemplates.whatsapp = {};
                  updated.messageTemplates.whatsapp[editingTemplateStage] = e.target.value;
                  setLocalSettings(updated);
                }}
                sx={{ mb: 2 }}
              />

              {/* Email Subject Template */}
              <TextField
                fullWidth
                size="small"
                label={`Assunto Email - ${editingTemplateStage}`}
                value={
                  editableSettings?.messageTemplates?.emailSubject?.[editingTemplateStage]
                  ?? DEFAULT_EMAIL_SUBJECT_TEMPLATES[editingTemplateStage]
                }
                onChange={(e) => {
                  const updated = { ...editableSettings! };
                  if (!updated.messageTemplates) updated.messageTemplates = {};
                  if (!updated.messageTemplates.emailSubject) updated.messageTemplates.emailSubject = {};
                  updated.messageTemplates.emailSubject[editingTemplateStage] = e.target.value;
                  setLocalSettings(updated);
                }}
                sx={{ mb: 2 }}
              />

              {/* Email Body Template */}
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                label={`Corpo Email - ${editingTemplateStage}`}
                value={
                  editableSettings?.messageTemplates?.emailBody?.[editingTemplateStage]
                  ?? DEFAULT_EMAIL_BODY_TEMPLATES[editingTemplateStage]
                }
                onChange={(e) => {
                  const updated = { ...editableSettings! };
                  if (!updated.messageTemplates) updated.messageTemplates = {};
                  if (!updated.messageTemplates.emailBody) updated.messageTemplates.emailBody = {};
                  updated.messageTemplates.emailBody[editingTemplateStage] = e.target.value;
                  setLocalSettings(updated);
                }}
              />

              <Button
                size="small"
                variant="text"
                color="warning"
                sx={{ mt: 1 }}
                onClick={() => {
                  const updated = { ...editableSettings! };
                  if (!updated.messageTemplates) return;
                  if (updated.messageTemplates.whatsapp) delete updated.messageTemplates.whatsapp[editingTemplateStage];
                  if (updated.messageTemplates.emailSubject) delete updated.messageTemplates.emailSubject[editingTemplateStage];
                  if (updated.messageTemplates.emailBody) delete updated.messageTemplates.emailBody[editingTemplateStage];
                  setLocalSettings(updated);
                }}
              >
                Restaurar padrao para {editingTemplateStage}
              </Button>
            </Box>
          </Collapse>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setLocalSettings(null);
                setShowSettings(false);
                setShowTemplateEditor(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSaveSettings}
              disabled={isSavingSettings || !localSettings}
            >
              {isSavingSettings ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>
        </Paper>
      </Collapse>
    );
  };

  // ============================================
  // Render: Contact Dialog (Manual Log)
  // ============================================
  const renderContactDialog = () => {
    if (!selectedFinancial) return null;

    const daysOverdue = getDaysOverdue(selectedFinancial.dueDate);

    return (
      <Dialog
        open={contactDialogOpen}
        onClose={handleCloseContactDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Registrar Contato</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{selectedFinancial.studentName || 'Aluno'}</strong> -{' '}
                {formatCurrency(selectedFinancial.amount)} - {daysOverdue} dias em atraso
              </Typography>
            </Alert>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tipo de Contato</InputLabel>
              <Select
                value={contactType}
                label="Tipo de Contato"
                onChange={(e) => setContactType(e.target.value as ContactType)}
              >
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="phone">Telefone</MenuItem>
                <MenuItem value="email">E-mail</MenuItem>
                <MenuItem value="in_person">Presencial</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Observacoes"
              placeholder="Descreva o resultado do contato..."
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContactDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleLogContact}
            disabled={isLoggingContact}
          >
            {isLoggingContact ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ============================================
  // Render: Message Preview / Send Dialog
  // ============================================
  const renderMessageDialog = () => {
    const isSending = messageDialogMode === 'whatsapp'
      ? (messageDialogBulk ? isSendingBulkWhatsApp : isSendingWhatsApp)
      : (messageDialogBulk ? isSendingBulkEmail : isSendingEmail);

    const channelLabel = messageDialogMode === 'whatsapp' ? 'WhatsApp' : 'Email';
    const targetLabel = messageDialogBulk
      ? `${currentStageFinancials.length} aluno(s) em ${STAGE_LABELS[currentStage]}`
      : messageDialogFinancial?.studentName || 'Aluno';

    return (
      <Dialog
        open={messageDialogOpen}
        onClose={handleCloseMessageDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          {messageDialogBulk ? `Cobranca em Massa via ${channelLabel}` : `Enviar ${channelLabel}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Destino:</strong> {targetLabel}
              </Typography>
              {messageDialogBulk && (
                <Typography variant="caption" color="text.secondary">
                  A mensagem sera personalizada com o nome, valor e data de vencimento de cada aluno.
                  {messageDialogMode === 'whatsapp'
                    ? ' Alunos sem telefone serao ignorados.'
                    : ' Alunos sem email serao ignorados.'}
                </Typography>
              )}
            </Alert>

            {messageDialogMode === 'email' && (
              <TextField
                fullWidth
                size="small"
                label="Assunto do Email"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              multiline
              rows={8}
              label={`Mensagem de ${channelLabel}`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              helperText={messageDialogBulk
                ? 'Edite a mensagem padrao. {NOME_ALUNO} sera substituido pelo nome de cada aluno.'
                : 'Edite a mensagem antes de enviar, se desejar.'
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMessageDialog} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={messageDialogMode === 'whatsapp' ? 'success' : 'primary'}
            onClick={handleConfirmSend}
            disabled={isSending || !messageText.trim()}
            startIcon={isSending ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
          >
            {isSending ? 'Enviando...' : `Enviar ${channelLabel}`}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ============================================
  // Render: Bulk Send Result Dialog
  // ============================================
  const renderResultDialog = () => {
    if (!bulkSendResult) return null;

    const { sent, failed, skipped, total, results } = bulkSendResult;
    const failedResults = results.filter((r) => !r.success);
    const allSuccess = failed === 0;
    const allFailed = sent === 0 && failed > 0;
    const channelLabel = resultDialogMode === 'whatsapp' ? 'WhatsApp' : 'Email';

    const severityColor = allSuccess
      ? theme.palette.success.main
      : allFailed
        ? theme.palette.error.main
        : theme.palette.warning.main;

    return (
      <Dialog
        open={resultDialogOpen}
        onClose={() => { setResultDialogOpen(false); setBulkSendResult(null); }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {allSuccess ? (
            <CheckCircle size={22} color={theme.palette.success.main} />
          ) : (
            <AlertTriangle size={22} color={severityColor} />
          )}
          Resultado do Envio via {channelLabel}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Summary */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: severityColor + '10',
                border: `1px solid ${severityColor}30`,
              }}
            >
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  {sent}
                </Typography>
                <Typography variant="caption" color="text.secondary">Enviados</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                  {failed}
                </Typography>
                <Typography variant="caption" color="text.secondary">Falharam</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.disabled }}>
                  {skipped}
                </Typography>
                <Typography variant="caption" color="text.secondary">Sem contato</Typography>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Total processado: {total} aluno(s)
            </Typography>

            {/* Failed list */}
            {failedResults.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.error.main }}>
                  Falhas no envio:
                </Typography>
                {failedResults.map((r, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.5,
                      borderBottom: i < failedResults.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <XCircle size={14} color={theme.palette.error.main} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {r.studentName}
                    </Typography>
                    <Typography variant="caption" color="error">
                      {r.error || 'Erro desconhecido'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {failedResults.length > 0 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RefreshCw size={16} />}
              onClick={handleRetryFailed}
              disabled={isSendingBulkWhatsApp || isSendingBulkEmail}
            >
              Reenviar Falhos ({failedResults.length})
            </Button>
          )}
          <Button
            onClick={() => { setResultDialogOpen(false); setBulkSendResult(null); }}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ============================================
  // Main Render
  // ============================================
  return (
    <Box sx={{ p: isMobile ? 2 : 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AlertTriangle size={24} color={theme.palette.warning.main} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Regua de Cobranca
        </Typography>
      </Box>

      {/* KPI Cards */}
      {renderKPICards()}

      {/* Settings Panel */}
      {renderSettingsPanel()}

      {/* Stage Tabs + List */}
      <Paper sx={{ p: isMobile ? 1 : 2 }}>
        {renderStageTabs()}
        {renderSearchBar()}
        {renderStudentList()}
      </Paper>

      {/* Contact Dialog (Manual) */}
      {renderContactDialog()}

      {/* Message Send Dialog */}
      {renderMessageDialog()}

      {/* Bulk Send Result Dialog (legacy) */}
      {renderResultDialog()}

      {/* Unified Bulk Send Dialog */}
      <Dialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Cobranca em Massa</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{currentStageFinancials.length}</strong> aluno(s) em {STAGE_LABELS[currentStage]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mesma mensagem sera enviada via WhatsApp e Email
              </Typography>
            </Alert>

            {emailEnabled && (
              <TextField
                fullWidth
                size="small"
                label="Assunto do Email"
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              fullWidth
              multiline
              rows={8}
              label="Mensagem"
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              helperText="Mesma mensagem sera enviada via WhatsApp e Email"
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={bulkScheduleEnabled}
                  onChange={(e) => setBulkScheduleEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock size={16} />
                  <Typography variant="body2">Agendar envio</Typography>
                </Box>
              }
            />

            {bulkScheduleEnabled && (
              <TextField
                fullWidth
                type="datetime-local"
                label="Data e Hora (Horario de Brasilia)"
                value={bulkScheduledTime}
                onChange={(e) => setBulkScheduledTime(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: new Date().toISOString().slice(0, 16) },
                }}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)} disabled={isSendingBulk}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={bulkScheduleEnabled ? 'primary' : 'success'}
            onClick={async () => {
              try {
                const result = await sendBulk({
                  financials: currentStageFinancials,
                  stage: currentStage,
                  message: bulkMessage,
                  subject: bulkSubject,
                  scheduledTime: bulkScheduleEnabled && bulkScheduledTime
                    ? bulkScheduledTime.replace('T', ' ')
                    : undefined,
                });
                setBulkDialogOpen(false);
                setBulkServerResult(result);
                setBulkServerResultDialogOpen(true);
              } catch {
                // Error handled by mutation
              }
            }}
            disabled={isSendingBulk || !bulkMessage.trim() || (bulkScheduleEnabled && !bulkScheduledTime)}
            startIcon={isSendingBulk
              ? <CircularProgress size={16} color="inherit" />
              : bulkScheduleEnabled ? <Clock size={16} /> : <Send size={16} />
            }
          >
            {isSendingBulk
              ? 'Enviando...'
              : bulkScheduleEnabled ? 'Agendar Envio' : 'Enviar Agora'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Server Result Dialog */}
      {bulkServerResult && (
        <Dialog
          open={bulkServerResultDialogOpen}
          onClose={() => { setBulkServerResultDialogOpen(false); setBulkServerResult(null); }}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {bulkServerResult.scheduled ? (
              <Clock size={22} color={theme.palette.info.main} />
            ) : (
              <CheckCircle size={22} color={theme.palette.success.main} />
            )}
            {bulkServerResult.scheduled ? 'Envio Agendado' : 'Resultado do Envio'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              {bulkServerResult.scheduled ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Envio agendado para <strong>{bulkServerResult.scheduledTime}</strong>
                  </Typography>
                </Alert>
              ) : null}

              {/* Summary */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: theme.palette.grey[50],
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                {/* WhatsApp summary */}
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <MessageSquare size={18} style={{ marginBottom: 4 }} />
                  <Typography variant="caption" display="block" color="text.secondary">WhatsApp</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {bulkServerResult.summary.whatsapp.sent ?? bulkServerResult.summary.whatsapp.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / {bulkServerResult.summary.whatsapp.total}
                  </Typography>
                </Box>

                {/* Email summary */}
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Mail size={18} style={{ marginBottom: 4 }} />
                  <Typography variant="caption" display="block" color="text.secondary">Email</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {bulkServerResult.summary.email.sent ?? bulkServerResult.summary.email.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / {bulkServerResult.summary.email.total}
                  </Typography>
                </Box>
              </Box>

              {/* Failures */}
              {bulkServerResult.failures && bulkServerResult.failures.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.error.main }}>
                    Falhas no envio:
                  </Typography>
                  {bulkServerResult.failures.map((f, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                        borderBottom: i < (bulkServerResult.failures?.length ?? 0) - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <XCircle size={14} color={theme.palette.error.main} />
                      <Chip
                        label={f.type === 'whatsapp' ? 'WA' : 'Email'}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                      <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                        {f.recipient}
                      </Typography>
                      <Typography variant="caption" color="error">
                        {f.error}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setBulkServerResultDialogOpen(false); setBulkServerResult(null); }}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default BillingRemindersDashboard;
