'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Chip,
  Skeleton,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  DollarSign,
  Copy,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademySettings } from '@/hooks';
import { createAbacatePayService } from '@/services/abacatePayService';
import { WalletTransaction, AcademyWallet, TransactionStatus } from '@/types';

// ============================================
// Types
// ============================================
type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

// ============================================
// Balance Card Component
// ============================================
interface BalanceCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

function BalanceCard({ title, value, icon: Icon, color, subtitle }: BalanceCardProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}20`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          opacity: 0.1,
        }}
      >
        <Icon size={120} color={color} />
      </Box>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}20`,
            }}
          >
            <Icon size={20} color={color} />
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ color: theme.palette.text.primary }}
        >
          R$ {(value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ============================================
// Transaction Item Component
// ============================================
interface TransactionItemProps {
  transaction: WalletTransaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const theme = useTheme();
  const isCredit = transaction.type === 'payment';

  const statusConfig: Record<TransactionStatus, { color: string; label: string; icon: React.ElementType }> = {
    pending: { color: theme.palette.warning.main, label: 'Pendente', icon: Clock },
    completed: { color: theme.palette.success.main, label: 'Concluido', icon: CheckCircle },
    cancelled: { color: theme.palette.error.main, label: 'Cancelado', icon: XCircle },
    failed: { color: theme.palette.error.main, label: 'Falhou', icon: XCircle },
  };

  const status = statusConfig[transaction.status];
  const StatusIcon = status.icon;

  return (
    <ListItem
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        mb: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 48 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: isCredit ? `${theme.palette.success.main}15` : `${theme.palette.error.main}15`,
          }}
        >
          {isCredit ? (
            <ArrowDownRight size={20} color={theme.palette.success.main} />
          ) : (
            <ArrowUpRight size={20} color={theme.palette.error.main} />
          )}
        </Box>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {transaction.description || (isCredit ? 'Pagamento recebido' : 'Saque')}
            </Typography>
            <Chip
              label={status.label}
              size="small"
              icon={<StatusIcon size={12} />}
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: `${status.color}15`,
                color: status.color,
                '& .MuiChip-icon': {
                  color: status.color,
                },
              }}
            />
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {transaction.studentName && `${transaction.studentName} • `}
              {format(transaction.createdAt, "dd MMM yyyy 'as' HH:mm", { locale: ptBR })}
            </Typography>
          </Box>
        }
      />
      <Typography
        variant="body1"
        fontWeight={600}
        color={isCredit ? 'success.main' : 'error.main'}
      >
        {isCredit ? '+' : '-'} R$ {(transaction.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </Typography>
    </ListItem>
  );
}

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
      setError('Valor minimo para saque: R$ 1,00');
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
    } catch (e) {
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${theme.palette.primary.main}15`,
            }}
          >
            <Banknote size={24} color={theme.palette.primary.main} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Solicitar Saque
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Disponivel: R$ {(maxAmount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
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
            <MenuItem value="random">Chave aleatoria</MenuItem>
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
            'Chave aleatoria'
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
        >
          {loading ? 'Processando...' : 'Solicitar Saque'}
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
  const { user, academyId } = useAuth();
  const { success, error: showError } = useFeedback();
  const { settings, loading: settingsLoading } = useAcademySettings();

  const [wallet, setWallet] = useState<AcademyWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!academyId) return;

    try {
      const service = createAbacatePayService(academyId);
      const [walletData, transactionsData] = await Promise.all([
        service.getWallet(),
        service.getTransactions(50),
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (e) {
      console.error('Error fetching wallet data:', e);
      showError('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [academyId, showError]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleWithdraw = async (amount: number, pixKey: string, pixKeyType: PixKeyType) => {
    if (!academyId) return;

    const service = createAbacatePayService(academyId);
    const result = await service.requestWithdrawal(amount, pixKey, pixKeyType);

    if (result) {
      success('Saque solicitado com sucesso!');
      fetchWalletData();
    } else {
      throw new Error('Falha ao solicitar saque');
    }
  };

  // If AbacatePay is not enabled, show message
  if (!settingsLoading && !settings?.abacatePayEnabled) {
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
                bgcolor: `${theme.palette.warning.main}15`,
                mb: 3,
              }}
            >
              <AlertCircle size={48} color={theme.palette.warning.main} />
            </Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Carteira Desativada
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
              Ative os pagamentos pela plataforma nas configuracoes para acessar sua carteira e receber pagamentos via PIX.
            </Typography>
            <Button
              variant="contained"
              href="/configuracoes"
              endIcon={<ChevronRight size={18} />}
            >
              Ir para Configuracoes
            </Button>
          </Box>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout title="Carteira">
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                Carteira
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie seu saldo e transacoes
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw size={20} className={refreshing ? 'spin' : ''} />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<Banknote size={18} />}
                onClick={() => setWithdrawalOpen(true)}
                disabled={!wallet || wallet.availableBalance < 100}
              >
                Sacar
              </Button>
            </Box>
          </Box>

          {/* Balance Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              {loading ? (
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
              ) : (
                <BalanceCard
                  title="Saldo Disponivel"
                  value={wallet?.availableBalance || 0}
                  icon={Wallet}
                  color={theme.palette.success.main}
                  subtitle="Disponivel para saque"
                />
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              {loading ? (
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
              ) : (
                <BalanceCard
                  title="Saldo Pendente"
                  value={wallet?.pendingBalance || 0}
                  icon={Clock}
                  color={theme.palette.warning.main}
                  subtitle="Aguardando confirmacao"
                />
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              {loading ? (
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
              ) : (
                <BalanceCard
                  title="Total Recebido"
                  value={wallet?.totalReceived || 0}
                  icon={TrendingUp}
                  color={theme.palette.primary.main}
                  subtitle="Desde o inicio"
                />
              )}
            </Grid>
          </Grid>

          {/* Transactions */}
          <Paper sx={{ borderRadius: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Transacoes Recentes
              </Typography>
              <Chip
                label={`${transactions.length} transacoes`}
                size="small"
                sx={{ bgcolor: 'action.hover' }}
              />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            ) : transactions.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 6,
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    display: 'inline-flex',
                    mb: 2,
                  }}
                >
                  <DollarSign size={32} color={theme.palette.text.secondary} />
                </Box>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhuma transacao ainda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  As transacoes aparecerão aqui quando seus alunos fizerem pagamentos
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {transactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </List>
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
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </AppLayout>
    </ProtectedRoute>
  );
}
