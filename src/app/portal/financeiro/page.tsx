'use client';

import { useMemo } from 'react';
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
} from '@mui/material';
import { DollarSign, CheckCircle, AlertCircle, Clock, CreditCard, Copy } from 'lucide-react';
import { usePermissions, useFeedback } from '@/components/providers';
import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/services';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PaymentStatus } from '@/types';

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
// Main Component
// ============================================
export default function PortalFinanceiroPage() {
  const { linkedStudentIds } = usePermissions();
  const { success } = useFeedback();
  const studentId = linkedStudentIds[0];

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['studentPayments', studentId],
    queryFn: () => financialService.getByStudent(studentId),
    enabled: !!studentId,
  });

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
    navigator.clipboard.writeText('contato@marcusjj.com.br');
    success('Chave PIX copiada!');
  };

  const hasDebts = stats.pendingCount > 0 || stats.overdueCount > 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Financeiro
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Acompanhe suas mensalidades e pagamentos
        </Typography>
      </Box>

      {/* Alert for overdue */}
      {stats.overdueCount > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          icon={<AlertCircle size={20} />}
          action={
            <Button color="inherit" size="small" onClick={handleCopyPix}>
              Copiar PIX
            </Button>
          }
        >
          Voce tem {stats.overdueCount} pagamento{stats.overdueCount > 1 ? 's' : ''} em atraso
          totalizando {formatCurrency(stats.overdueAmount)}. Regularize sua situacao.
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.50' }}>
                  <Clock size={24} color="#D97706" />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <Typography variant="h5" fontWeight={700}>
                      {formatCurrency(stats.pendingAmount)}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Pendente ({stats.pendingCount})
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'error.50' }}>
                  <AlertCircle size={24} color="#DC2626" />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <Typography variant="h5" fontWeight={700} color="error.main">
                      {formatCurrency(stats.overdueAmount)}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Em Atraso ({stats.overdueCount})
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.50' }}>
                  <CheckCircle size={24} color="#16A34A" />
                </Box>
                <Box>
                  {isLoading ? (
                    <Skeleton variant="text" width={100} height={32} />
                  ) : (
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      {formatCurrency(stats.totalPaid)}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Total Pago ({stats.paidCount})
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Info */}
      {hasDebts && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'primary.50' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Dados para Pagamento
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CreditCard size={20} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Chave PIX (Email)
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    contato@marcusjj.com.br
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<Copy size={14} />}
                  onClick={handleCopyPix}
                >
                  Copiar
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Apos o pagamento, envie o comprovante via WhatsApp para confirmar.
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Payments Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600}>
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
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell><Skeleton variant="text" /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width={80} /></TableCell>
                  </TableRow>
                ))
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
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
                      <TableCell align="right">
                        <Chip
                          label={config.label}
                          size="small"
                          color={config.color}
                          variant={payment.status === 'paid' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
