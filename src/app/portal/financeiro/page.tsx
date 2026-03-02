'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  Button,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, AlertCircle, Clock, Copy, Calendar, QrCode, Receipt, History } from 'lucide-react';
import { usePermissions, useFeedback, useAuth } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { AcademyIndicator } from '@/components/portal/AcademyIndicator';
import { useQuery } from '@tanstack/react-query';
import { createFinancialService, createStudentService, createSettingsService, createPlanService } from '@/services';
import { createAbacatePayService } from '@/services/abacatePayService';
import { createAsaasService } from '@/services/asaasService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentStatus, FinancialPaymentLink, Financial } from '@/types';
import QRCode from 'qrcode';

// ============================================
// Status Config
// ============================================
const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  paid: { label: 'Pago', color: 'success' },
  pending: { label: 'Pendente', color: 'warning' },
  overdue: { label: 'Atrasado', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'default' },
};

// ============================================
// Payment Dialog Component
// ============================================
interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  payment: Financial | null;
  paymentLink: FinancialPaymentLink | null;
  isLoading: boolean;
}

function PaymentDialog({ open, onClose, payment, paymentLink, isLoading }: PaymentDialogProps) {
  const { success } = useFeedback();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (paymentLink?.pixCode) {
      QRCode.toDataURL(paymentLink.pixCode, { width: 256 })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [paymentLink?.pixCode]);

  const handleCopyCode = () => {
    if (paymentLink?.pixCode) {
      navigator.clipboard.writeText(paymentLink.pixCode);
      setCopied(true);
      success('Codigo PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Pagar com PIX
          </Typography>
          {payment && (
            <Typography variant="body2" color="text.secondary">
              {payment.description || 'Mensalidade'} - {formatCurrency(payment.amount)}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Gerando QR Code...
            </Typography>
          </Box>
        ) : paymentLink?.pixCode ? (
          <Box sx={{ textAlign: 'center' }}>
            {qrCodeUrl ? (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  display: 'inline-block',
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <img src={qrCodeUrl} alt="QR Code PIX" style={{ display: 'block' }} />
              </Box>
            ) : (
              <Skeleton variant="rectangular" width={256} height={256} sx={{ mx: 'auto', mb: 2 }} />
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escaneie o QR Code ou copie o codigo PIX
            </Typography>

            <Button
              variant="outlined"
              fullWidth
              startIcon={copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              onClick={handleCopyCode}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copiado!' : 'Copiar Codigo PIX'}
            </Button>

            <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
              Apos o pagamento, seu status sera atualizado automaticamente.
            </Alert>
          </Box>
        ) : (
          <Alert severity="error">
            Erro ao gerar pagamento. Tente novamente.
          </Alert>
        )}

        <Button
          variant="text"
          fullWidth
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================
export default function PortalFinanceiroPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { linkedStudentIds } = usePermissions();
  const { success, error: showError } = useFeedback();
  const { firebaseUser } = useAuth();
  const { academy } = useAcademy();
  const studentId = linkedStudentIds[0];

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Financial | null>(null);
  const [paymentLink, setPaymentLink] = useState<FinancialPaymentLink | null>(null);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

  // Check if AbacatePay is enabled
  const { data: abacatePayEnabled = false } = useQuery({
    queryKey: ['abacatePayEnabled', academy?.id],
    queryFn: async () => {
      if (!academy?.id) return false;
      const service = createAbacatePayService(academy.id);
      return service.isEnabled();
    },
    enabled: !!academy?.id,
  });

  // Check if Asaas is enabled
  const { data: asaasEnabled = false } = useQuery({
    queryKey: ['asaasEnabled', academy?.id],
    queryFn: async () => {
      if (!academy?.id) return false;
      const service = createAsaasService(academy.id);
      return service.isEnabled();
    },
    enabled: !!academy?.id,
  });

  const paymentEnabled = abacatePayEnabled || asaasEnabled;

  // Fetch student data
  const { data: student } = useQuery({
    queryKey: ['student', studentId, academy?.id],
    queryFn: () => {
      if (!academy?.id) return null;
      const studentService = createStudentService(academy.id);
      return studentService.getById(studentId);
    },
    enabled: !!studentId && !!academy?.id,
  });

  // Check if student is enrolled in any plan (via plan.studentIds)
  const { data: studentPlan } = useQuery({
    queryKey: ['studentPlan', studentId, academy?.id],
    queryFn: async () => {
      if (!academy?.id) return null;
      const planService = createPlanService(academy.id);
      return planService.getPlanForStudent(studentId);
    },
    enabled: !!studentId && !!academy?.id,
  });

  // Student has a valid plan if enrolled in any plan's studentIds
  const hasValidPlan = !!studentPlan;

  // Fetch academy settings (for PIX key)
  const { data: academySettings } = useQuery({
    queryKey: ['academySettings', academy?.id],
    queryFn: () => {
      if (!academy?.id) return null;
      const settingsService = createSettingsService(academy.id);
      return settingsService.getAcademySettings();
    },
    enabled: !!academy?.id,
  });

  // Fetch payments - always fetch regardless of plan status so history is visible
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['studentPayments', studentId, academy?.id],
    queryFn: () => {
      if (!academy?.id) return [];
      const financialService = createFinancialService(academy.id);
      return financialService.getByStudent(studentId);
    },
    enabled: !!studentId && !!academy?.id,
  });

  const pixKey = academySettings?.pixKey || '';

  // Separate payments by status
  const { openPayments, historyPayments, totalOpen, overdueCount } = useMemo(() => {
    const open = payments
      .filter((p) => p.status === 'pending' || p.status === 'overdue')
      .sort((a, b) => {
        // Overdue first, then by due date
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    const history = payments
      .filter((p) => p.status === 'paid' || p.status === 'cancelled')
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    return {
      openPayments: open,
      historyPayments: history,
      totalOpen: open.reduce((acc, p) => acc + p.amount, 0),
      overdueCount: open.filter((p) => p.status === 'overdue').length,
    };
  }, [payments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCopyPix = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      success('Chave PIX copiada!');
    }
  };

  const handlePayPix = async (payment: Financial) => {
    if (!academy?.id || !student || !firebaseUser) return;

    setSelectedPayment(payment);
    setPaymentLink(null);
    setPaymentDialogOpen(true);
    setIsGeneratingPayment(true);

    try {
      const token = await firebaseUser.getIdToken();
      const endpoint = asaasEnabled
        ? '/api/payments/asaas/create-pix'
        : '/api/payments/create-pix';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          academyId: academy.id,
          amount: payment.amount, // Send in reais — API routes handle centavo conversion internally
          description: payment.description || `Mensalidade - ${payment.referenceMonth || ''}`,
          financialId: payment.id,
          studentId,
          studentName: student.fullName || student.nickname || 'Aluno',
        }),
      });

      const data = await response.json();

      if (response.ok && data.data) {
        setPaymentLink({
          pixCode: data.data.pixCode,
          qrCodeUrl: data.data.qrCodeUrl,
          expiresAt: new Date(data.data.expiresAt),
          createdAt: new Date(),
        });
      } else {
        showError(data.error || 'Erro ao gerar pagamento PIX');
      }
    } catch (err) {
      console.error('Error generating PIX payment:', err);
      showError('Erro ao gerar pagamento PIX');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  // If no valid plan and no payment history, show a message
  if (!hasValidPlan && !isLoading && payments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Receipt size={48} color="#9CA3AF" />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
          Pagamentos
        </Typography>
        <Typography color="text.secondary">
          Voce nao possui um plano ativo no momento.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Academy indicator for multi-academy users */}
      <AcademyIndicator label="Pagamentos de" icon={<Receipt size={16} />} />

      {/* Header */}
      <Typography sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 700 }}>
        Pagamentos
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5, mb: 3 }}>
        Gerencie suas mensalidades e pagamentos
      </Typography>

      {/* No active plan alert */}
      {!hasValidPlan && !isLoading && payments.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Voce nao possui um plano ativo no momento.
        </Alert>
      )}

      {/* Debt Alert - when has open payments */}
      {openPayments.length > 0 && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: overdueCount > 0 ? '#FEE2E2' : '#FEF3C7',
            border: '1px solid',
            borderColor: overdueCount > 0 ? 'rgba(220, 38, 38, 0.3)' : 'rgba(217, 119, 6, 0.3)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: overdueCount > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {overdueCount > 0 ? (
                <AlertCircle size={20} color="#DC2626" />
              ) : (
                <Clock size={20} color="#D97706" />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: overdueCount > 0 ? '#DC2626' : 'text.primary',
                }}
              >
                {overdueCount > 0 ? 'Voce tem pagamentos atrasados' : 'Voce tem pagamentos pendentes'}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {openPayments.length} pagamento(s) - {formatCurrency(totalOpen)}
              </Typography>
            </Box>
          </Box>

          {/* PIX Info */}
          {pixKey && (
            <>
              <Box sx={{ my: 1.5, borderTop: '1px solid', borderColor: 'rgba(0,0,0,0.08)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCode size={16} color="#6B7280" />
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  PIX: {pixKey}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Copy size={14} />}
                  onClick={handleCopyPix}
                  sx={{
                    fontSize: '0.75rem',
                    py: 0.5,
                    px: 1.5,
                    bgcolor: '#fff',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                    boxShadow: 'none',
                  }}
                >
                  Copiar
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* All Paid Message */}
      {openPayments.length === 0 && !isLoading && (
        <Box
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            bgcolor: '#DCFCE7',
            border: '1px solid',
            borderColor: 'rgba(22, 163, 74, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              bgcolor: 'rgba(22, 163, 74, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={24} color="#16A34A" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, color: '#16A34A' }}>
              Tudo em dia!
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Voce nao possui pagamentos pendentes
            </Typography>
          </Box>
        </Box>
      )}

      {/* Open Payments Section */}
      {openPayments.length > 0 && (
        <>
          <SectionHeader title="Em Aberto" count={openPayments.length} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {openPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                formatCurrency={formatCurrency}
                showPayButton={paymentEnabled}
                onPayPix={() => handlePayPix(payment)}
              />
            ))}
          </Box>
        </>
      )}

      {/* History Section */}
      <SectionHeader title="Historico" count={historyPayments.length} />

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : historyPayments.length === 0 ? (
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <History size={32} color="#D1D5DB" />
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: '0.9rem' }}>
            Nenhum pagamento no historico
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {historyPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              formatCurrency={formatCurrency}
              showStatus
            />
          ))}
        </Box>
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        payment={selectedPayment}
        paymentLink={paymentLink}
        isLoading={isGeneratingPayment}
      />
    </Box>
  );
}

// ============================================
// Section Header
// ============================================
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>
        {title}
      </Typography>
      <Box
        sx={{
          px: 1,
          py: 0.25,
          bgcolor: 'grey.100',
          borderRadius: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}>
          {count}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================
// Payment Card
// ============================================
interface PaymentCardProps {
  payment: Financial;
  formatCurrency: (value: number) => string;
  showStatus?: boolean;
  showPayButton?: boolean;
  onPayPix?: () => void;
}

function PaymentCard({ payment, formatCurrency, showStatus, showPayButton, onPayPix }: PaymentCardProps) {
  const isOverdue = payment.status === 'overdue';
  const isPaid = payment.status === 'paid';
  const isCancelled = payment.status === 'cancelled';
  const config = STATUS_CONFIG[payment.status];

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: '#fff',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isOverdue ? 'rgba(220, 38, 38, 0.5)' : 'grey.200',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Icon */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: isOverdue
              ? '#FEE2E2'
              : isPaid
              ? '#DCFCE7'
              : isCancelled
              ? 'grey.100'
              : 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isOverdue ? (
            <AlertCircle size={18} color="#DC2626" />
          ) : isPaid ? (
            <CheckCircle size={18} color="#16A34A" />
          ) : isCancelled ? (
            <Receipt size={18} color="#9CA3AF" />
          ) : (
            <Receipt size={18} color="#6B7280" />
          )}
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: isCancelled ? 'text.disabled' : 'text.primary',
            }}
          >
            {payment.description || 'Mensalidade'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <Calendar size={12} color="#9CA3AF" />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {format(new Date(payment.dueDate), "dd/MM/yyyy", { locale: ptBR })}
            </Typography>
            {payment.referenceMonth && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
                {payment.referenceMonth}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Value & Status */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: isOverdue ? 'error.main' : isCancelled ? 'text.disabled' : 'text.primary',
              textDecoration: isCancelled ? 'line-through' : 'none',
            }}
          >
            {formatCurrency(payment.amount)}
          </Typography>
          {showStatus && (
            <Chip
              label={config.label}
              size="small"
              color={config.color}
              variant={isPaid ? 'filled' : 'outlined'}
              sx={{ fontSize: '0.65rem', height: 20, mt: 0.5 }}
            />
          )}
        </Box>
      </Box>

      {/* Pay Button */}
      {showPayButton && !isPaid && !isCancelled && onPayPix && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'grey.100' }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<QrCode size={16} />}
            onClick={onPayPix}
            fullWidth
            sx={{ fontSize: '0.8rem' }}
          >
            Pagar com PIX
          </Button>
        </Box>
      )}
    </Box>
  );
}
