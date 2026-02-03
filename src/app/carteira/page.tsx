'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Alert,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  ChevronRight,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { useAcademySettings, useFinancial } from '@/hooks';
import { createAbacatePayService } from '@/services/abacatePayService';
import { createAsaasService } from '@/services/asaasService';
import { WalletTransaction, AcademyWallet, TransactionStatus } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ============================================
// Types
// ============================================
type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

// ============================================
// Format Currency Helper
// ============================================
const formatCurrency = (valueInCents: number) => {
  return (valueInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// ============================================
// Withdrawal Dialog Component
// ============================================
interface WithdrawalDialogProps {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  onWithdraw: (amount: number, pixKey: string, pixKeyType: PixKeyType) => Promise<void>;
}

function WithdrawalDialog({ open, onClose, maxAmount, onWithdraw }: WithdrawalDialogProps) {
  const theme = useTheme();
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numValue = parseInt(value) / 100;
    if (numValue <= maxAmount / 100) {
      setAmount(numValue.toFixed(2));
    }
  };

  const handleWithdraw = async () => {
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents < 100) {
      setError('Valor mínimo para saque: R$ 1,00');
      return;
    }
    if (amountInCents > maxAmount) {
      setError('Saldo insuficiente');
      return;
    }
    if (!pixKey.trim()) {
      setError('Informe a chave PIX');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onWithdraw(amountInCents, pixKey, pixKeyType);
      onClose();
      setAmount('');
      setPixKey('');
    } catch {
      setError('Erro ao solicitar saque. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setAmount('');
      setPixKey('');
      setError(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Banknote size={24} color={theme.palette.primary.main} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Solicitar Saque
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Disponível: {formatCurrency(maxAmount)}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Valor do saque"
          value={amount}
          onChange={handleAmountChange}
          InputProps={{
            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
          }}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Tipo de chave PIX</InputLabel>
          <Select
            value={pixKeyType}
            label="Tipo de chave PIX"
            onChange={(e: SelectChangeEvent) => setPixKeyType(e.target.value as PixKeyType)}
          >
            <MenuItem value="cpf">CPF</MenuItem>
            <MenuItem value="cnpj">CNPJ</MenuItem>
            <MenuItem value="email">E-mail</MenuItem>
            <MenuItem value="phone">Telefone</MenuItem>
            <MenuItem value="random">Chave aleatória</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Chave PIX"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder={
            pixKeyType === 'cpf' ? '000.000.000-00' :
            pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
            pixKeyType === 'email' ? 'email@exemplo.com' :
            pixKeyType === 'phone' ? '+55 (00) 00000-0000' :
            'Chave aleatória'
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleWithdraw}
          disabled={loading || !amount || !pixKey}
          startIcon={loading ? <CircularProgress size={16} /> : <Banknote size={18} />}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {loading ? 'Processando...' : 'Confirmar Saque'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================
// Main Wallet Page
// ============================================
export default function CarteiraPage() {
  const theme = useTheme();
  const { academyId } = useAcademy();
  const { firebaseUser } = useAuth();
  const { success, error: showError } = useFeedback();
  const { settings, isLoading: settingsLoading } = useAcademySettings();
  const { revenueStats, isRevenueLoading } = useFinancial({ autoLoad: true });

  const [wallet, setWallet] = useState<AcademyWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const paymentEnabled = settings?.asaasEnabled || settings?.abacatePayEnabled;

  const fetchWalletData = useCallback(async () => {
    if (!academyId) return;

    try {
      const service = settings?.asaasEnabled
        ? createAsaasService(academyId)
        : createAbacatePayService(academyId);
      const [walletData, transactionsData] = await Promise.all([
        service.getWallet(),
        service.getTransactions(50),
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
    } catch {
      console.error('Error fetching wallet data');
      showError('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [academyId, showError]);

  useEffect(() => {
    // Only fetch wallet data if payments are enabled
    if (!settingsLoading && paymentEnabled) {
      fetchWalletData();
    } else if (!settingsLoading && !paymentEnabled) {
      setLoading(false);
    }
  }, [fetchWalletData, settingsLoading, paymentEnabled]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleWithdraw = async (amount: number, pixKey: string, pixKeyType: PixKeyType) => {
    if (!academyId || !firebaseUser) return;

    const token = await firebaseUser.getIdToken();
    const endpoint = settings?.asaasEnabled
      ? '/api/payments/asaas/withdraw'
      : '/api/payments/withdraw';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ academyId, amount, pixKey, pixKeyType }),
    });

    const data = await response.json();

    if (response.ok && !data.error) {
      success('Saque solicitado com sucesso!');
      fetchWalletData();
    } else {
      throw new Error(data.error || 'Falha ao solicitar saque');
    }
  };

  // Chart data formatting
  const chartData = Array.isArray(revenueStats?.byMonth)
    ? revenueStats.byMonth.map(item => {
        const [year, month] = item.month.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        return {
          name: format(date, 'MMM', { locale: ptBR }),
          fullDate: format(date, 'MMMM yyyy', { locale: ptBR }),
          value: item.paid / 100,
        };
      })
    : [];

  // Status config for transactions
  const statusConfig: Record<TransactionStatus, { color: string; label: string; icon: React.ElementType }> = {
    pending: { color: theme.palette.warning.main, label: 'Pendente', icon: Clock },
    completed: { color: theme.palette.success.main, label: 'Concluído', icon: CheckCircle },
    cancelled: { color: theme.palette.error.main, label: 'Cancelado', icon: XCircle },
    failed: { color: theme.palette.error.main, label: 'Falhou', icon: XCircle },
  };

  // If no payment provider is enabled
  if (!settingsLoading && !paymentEnabled) {
    return (
      <ProtectedRoute>
        <AppLayout title="Carteira">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              p: 4,
            }}
          >
            <Box
              sx={{
                p: 3,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                mb: 3,
              }}
            >
              <AlertCircle size={48} color={theme.palette.warning.main} />
            </Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Carteira Desativada
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
              Ative os pagamentos pela plataforma nas configurações para acessar sua carteira.
            </Typography>
            <Button
              variant="contained"
              href="/configuracoes"
              endIcon={<ChevronRight size={18} />}
              sx={{ borderRadius: 2 }}
            >
              Ir para Configurações
            </Button>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout title="Carteira">
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {/* Main Balance Card */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background decoration */}
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.1)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -30,
                right: 100,
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.05)',
              }}
            />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
                    Saldo Disponível
                  </Typography>
                  {loading ? (
                    <Skeleton variant="text" width={200} height={60} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                      {formatCurrency(wallet?.availableBalance || 0)}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <RefreshCw size={20} className={refreshing ? 'spin' : ''} />
                  </IconButton>
                  <Button
                    variant="contained"
                    startIcon={<Banknote size={18} />}
                    onClick={() => setWithdrawalOpen(true)}
                    disabled={!wallet || wallet.availableBalance < 100}
                    sx={{
                      bgcolor: 'white',
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                      '&:disabled': { bgcolor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)' },
                    }}
                  >
                    Sacar
                  </Button>
                </Box>
              </Box>

              {/* Secondary balances */}
              <Box sx={{ display: 'flex', gap: { xs: 3, md: 6 } }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Clock size={14} style={{ opacity: 0.7 }} />
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      A Receber
                    </Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="text" width={100} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Typography variant="h6" fontWeight={600}>
                      {formatCurrency(wallet?.pendingBalance || 0)}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <TrendingUp size={14} style={{ opacity: 0.7 }} />
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Total Recebido
                    </Typography>
                  </Box>
                  {loading ? (
                    <Skeleton variant="text" width={100} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <Typography variant="h6" fontWeight={600}>
                      {formatCurrency(wallet?.totalReceived || 0)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Content Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' }, gap: 3 }}>
            {/* Revenue Chart */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                minHeight: 350,
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Receita Mensal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Últimos 6 meses
                </Typography>
              </Box>

              {isRevenueLoading ? (
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
              ) : chartData.length === 0 ? (
                <Box
                  sx={{
                    height: 250,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                    borderRadius: 2,
                  }}
                >
                  <Typography color="text.secondary">Sem dados de receita</Typography>
                </Box>
              ) : (
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        tickFormatter={(value) => `R$${value}`}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          borderRadius: 8,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: theme.shadows[3],
                          padding: '8px 12px',
                        }}
                        formatter={(value) => [formatCurrency((value as number) * 100), 'Receita']}
                        labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={theme.palette.primary.main}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Paper>

            {/* Transactions */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: showAllTransactions ? 'none' : { lg: 350 },
              }}
            >
              <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Últimas Transações
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {loading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2, 3].map((i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="60%" />
                          <Skeleton variant="text" width="40%" />
                        </Box>
                        <Skeleton variant="text" width={80} />
                      </Box>
                    ))}
                  </Box>
                ) : transactions.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Wallet size={32} color={theme.palette.text.disabled} style={{ marginBottom: 8 }} />
                    <Typography color="text.secondary" variant="body2">
                      Nenhuma transação ainda
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 1 }}>
                    {(showAllTransactions ? transactions : transactions.slice(0, 6)).map((t) => {
                      const isCredit = t.type === 'payment';
                      const status = statusConfig[t.status];

                      return (
                        <Box
                          key={t.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            p: 1.5,
                            borderRadius: 2,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 2,
                              bgcolor: alpha(isCredit ? theme.palette.success.main : theme.palette.error.main, 0.1),
                            }}
                          >
                            {isCredit ? (
                              <ArrowDownRight size={18} color={theme.palette.success.main} />
                            ) : (
                              <ArrowUpRight size={18} color={theme.palette.error.main} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={500} noWrap>
                                {t.description || (isCredit ? 'Pagamento' : 'Saque')}
                              </Typography>
                              <Chip
                                label={status.label}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  bgcolor: alpha(status.color, 0.1),
                                  color: status.color,
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {format(t.createdAt, "dd MMM 'às' HH:mm", { locale: ptBR })}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={isCredit ? 'success.main' : 'error.main'}
                          >
                            {isCredit ? '+' : '-'}{formatCurrency(t.amount)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              {transactions.length > 6 && (
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button
                    fullWidth
                    endIcon={<ArrowRight size={16} style={{ transform: showAllTransactions ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />}
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                    sx={{
                      borderRadius: 2,
                      color: 'text.secondary',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    {showAllTransactions ? 'Mostrar menos' : 'Ver extrato completo'}
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>

          {/* Withdrawal Dialog */}
          <WithdrawalDialog
            open={withdrawalOpen}
            onClose={() => setWithdrawalOpen(false)}
            maxAmount={wallet?.availableBalance || 0}
            onWithdraw={handleWithdraw}
          />

          <style jsx global>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .spin {
              animation: spin 1s linear infinite;
            }
          `}</style>
        </Box>
      </AppLayout>
    </ProtectedRoute>
  );
}
