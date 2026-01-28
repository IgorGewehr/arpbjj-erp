'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';
import { DollarSign, CheckCircle, AlertCircle, Clock, CreditCard, Copy, Calendar, QrCode } from 'lucide-react';
import { usePermissions, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialService, studentService, settingsService, planService } from '@/services';
import { createAbacatePayService } from '@/services/abacatePayService';
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
  const { academy } = useAcademy();
  const queryClient = useQueryClient();
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

  // Fetch student data
  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: !!studentId,
  });

  // Validate if the plan actually exists
  const { data: plan } = useQuery({
    queryKey: ['plan', student?.planId],
    queryFn: () => planService.getById(student!.planId!),
    enabled: !!student?.planId,
  });

  // Only consider having a valid plan if the plan exists
  const hasValidPlan = !!student?.planId && !!plan;

  // Fetch academy settings (for PIX key)
  const { data: academySettings } = useQuery({
    queryKey: ['academySettings'],
    queryFn: () => settingsService.getAcademySettings(),
  });

  // Fetch payments - only if student has a valid plan
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['studentPayments', studentId],
    queryFn: () => financialService.getByStudent(studentId),
    enabled: !!studentId && hasValidPlan,
  });

  const pixKey = academySettings?.pixKey || '';

  // Calculate stats
  const stats = useMemo(() => {
    const pending = payments.filter((p) => p.status === 'pending');
    const overdue = payments.filter((p) => p.status === 'overdue');
    const paid = payments.filter((p) => p.status === 'paid');

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((acc, p) => acc + p.amount, 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((acc, p) => acc + p.amount, 0),
      paidCount: paid.length,
      totalPaid: paid.reduce((acc, p) => acc + p.amount, 0),
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
    if (!academy?.id || !student) return;

    setSelectedPayment(payment);
    setPaymentLink(null);
    setPaymentDialogOpen(true);
    setIsGeneratingPayment(true);

    try {
      const service = createAbacatePayService(academy.id);
      const link = await service.createPixPayment(
        payment.amount,
        payment.description || `Mensalidade - ${payment.referenceMonth || ''}`,
        payment.id,
        studentId,
        student.fullName || student.nickname || 'Aluno'
      );
      setPaymentLink(link);
    } catch (err) {
      console.error('Error generating PIX payment:', err);
      showError('Erro ao gerar pagamento PIX');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  const hasDebts = stats.pendingCount > 0 || stats.overdueCount > 0;

  // Get due day from plan (fallback to student's tuitionDay for backwards compatibility)
  const dueDay = plan?.defaultDueDay || student?.tuitionDay;

  // If no valid plan, show a message
  if (!hasValidPlan && !isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Financeiro
        </Typography>
        <Typography color="text.secondary">
          Voce nao possui um plano ativo no momento.
        </Typography>
      </Box>
    );
  }

  // Mobile payment list view
  const renderMobilePaymentList = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
        ))
      ) : payments.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            Nenhum pagamento registrado
          </Typography>
        </Box>
      ) : (
        payments.map((payment) => {
          const config = STATUS_CONFIG[payment.status];
          return (
            <Box
              key={payment.id}
              sx={{
                p: 2,
                bgcolor: '#fff',
                borderRadius: 2,
                border: '1px solid',
                borderColor: payment.status === 'overdue' ? 'error.main' : 'grey.200',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                    {payment.description || 'Mensalidade'}
                  </Typography>
                  {payment.referenceMonth && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Ref: {payment.referenceMonth}
                    </Typography>
                  )}
                </Box>
                <Chip
                  label={config.label}
                  size="small"
                  color={config.color}
                  variant={payment.status === 'paid' ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.65rem', height: 22 }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {format(new Date(payment.dueDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{
                    fontSize: '0.9rem',
                    color: payment.status === 'overdue' ? 'error.main' : 'text.primary',
                  }}
                >
                  {formatCurrency(payment.amount)}
                </Typography>
              </Box>
              {/* PIX Payment Button */}
              {abacatePayEnabled && (payment.status === 'pending' || payment.status === 'overdue') && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'grey.100' }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<QrCode size={16} />}
                    onClick={() => handlePayPix(payment)}
                    fullWidth
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Pagar com PIX
                  </Button>
                </Box>
              )}
            </Box>
          );
        })
      )}
    </Box>
  );

  // Desktop table view
  const renderDesktopTable = () => (
    <Paper sx={{ borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.200' }}>
        <Typography variant="body1" fontWeight={600}>
          Historico de Pagamentos
        </Typography>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descricao</TableCell>
              <TableCell>Vencimento</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Status</TableCell>
              {abacatePayEnabled && <TableCell align="right">Ação</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  {abacatePayEnabled && <TableCell align="right"><Skeleton variant="text" width={60} /></TableCell>}
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={abacatePayEnabled ? 5 : 4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Nenhum pagamento registrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => {
                const config = STATUS_CONFIG[payment.status];
                return (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {payment.description || 'Mensalidade'}
                      </Typography>
                      {payment.referenceMonth && (
                        <Typography variant="caption" color="text.secondary">
                          Ref: {payment.referenceMonth}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.dueDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {formatCurrency(payment.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={config.label}
                        size="small"
                        color={config.color}
                        variant={payment.status === 'paid' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    {abacatePayEnabled && (
                      <TableCell align="right">
                        {(payment.status === 'pending' || payment.status === 'overdue') && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<QrCode size={14} />}
                            onClick={() => handlePayPix(payment)}
                          >
                            Pagar PIX
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const totalDebt = stats.pendingAmount + stats.overdueAmount;

  return (
    <Box>
      {/* Main Balance Card with Gradient */}
      <Box
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: 3,
          borderRadius: 3,
          background: hasDebts
            ? 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)'
            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          boxShadow: hasDebts
            ? '0 10px 40px rgba(124, 58, 237, 0.3)'
            : '0 10px 40px rgba(5, 150, 105, 0.3)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasDebts ? <DollarSign size={20} /> : <CheckCircle size={20} />}
          </Box>
          <Typography sx={{ fontSize: '0.9rem', opacity: 0.9 }}>
            {hasDebts ? 'Total em Aberto' : 'Tudo em Dia'}
          </Typography>
        </Box>

        {isLoading ? (
          <Skeleton variant="text" width={180} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              fontWeight: 700,
              letterSpacing: -1,
              lineHeight: 1,
            }}
          >
            {formatCurrency(totalDebt)}
          </Typography>
        )}

        {hasDebts && !isLoading && (
          <Typography sx={{ mt: 1, fontSize: '0.85rem', opacity: 0.85 }}>
            {stats.pendingCount + stats.overdueCount} pagamento(s) pendente(s)
          </Typography>
        )}
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: { xs: 1, sm: 2 },
          mb: 3,
        }}
      >
        {/* Pending */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box
              sx={{
                width: { xs: 28, sm: 32 },
                height: { xs: 28, sm: 32 },
                borderRadius: 1.5,
                bgcolor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={isMobile ? 14 : 16} color="#D97706" />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
              }}
            >
              {stats.pendingCount}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
          >
            Pendentes
          </Typography>
          {!isLoading && stats.pendingAmount > 0 && (
            <Typography
              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' }, fontWeight: 600, mt: 0.5 }}
            >
              {formatCurrency(stats.pendingAmount)}
            </Typography>
          )}
        </Box>

        {/* Overdue */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: stats.overdueCount > 0 ? 'rgba(220, 38, 38, 0.3)' : 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box
              sx={{
                width: { xs: 28, sm: 32 },
                height: { xs: 28, sm: 32 },
                borderRadius: 1.5,
                bgcolor: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={isMobile ? 14 : 16} color="#DC2626" />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: stats.overdueCount > 0 ? 'error.main' : 'text.primary',
              }}
            >
              {stats.overdueCount}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
          >
            Atrasados
          </Typography>
          {!isLoading && stats.overdueAmount > 0 && (
            <Typography
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                fontWeight: 600,
                mt: 0.5,
                color: 'error.main',
              }}
            >
              {formatCurrency(stats.overdueAmount)}
            </Typography>
          )}
        </Box>

        {/* Paid */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box
              sx={{
                width: { xs: 28, sm: 32 },
                height: { xs: 28, sm: 32 },
                borderRadius: 1.5,
                bgcolor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={isMobile ? 14 : 16} color="#16A34A" />
            </Box>
            <Typography
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 700,
                color: 'success.main',
              }}
            >
              {stats.paidCount}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}
          >
            Pagos
          </Typography>
        </Box>
      </Box>

      {/* PIX Info Card */}
      {hasDebts && pixKey && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            color: '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <QrCode size={22} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.85 }}>Chave PIX</Typography>
              <Typography
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {pixKey}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              startIcon={<Copy size={14} />}
              onClick={handleCopyPix}
              sx={{
                bgcolor: '#fff',
                color: '#1D4ED8',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            >
              Copiar
            </Button>
          </Box>
        </Box>
      )}

      {/* Payments List/Table */}
      <Box>
        <Typography
          sx={{
            mb: 2,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            fontWeight: 600,
          }}
        >
          Historico de Pagamentos
        </Typography>
        {isMobile ? renderMobilePaymentList() : renderDesktopTable()}
      </Box>

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
