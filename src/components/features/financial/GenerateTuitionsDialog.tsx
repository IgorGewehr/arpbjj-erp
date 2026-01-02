'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Users, Calendar } from 'lucide-react';

// ============================================
// Props Interface
// ============================================
interface GenerateTuitionsDialogProps {
  open: boolean;
  month: string;
  studentsCount: number;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

// ============================================
// GenerateTuitionsDialog Component
// ============================================
export function GenerateTuitionsDialog({
  open,
  month,
  studentsCount,
  onClose,
  onConfirm,
  isLoading = false,
}: GenerateTuitionsDialogProps) {
  const monthLabel = format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gerar Mensalidades</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Esta acao ira criar registros de mensalidade apenas para alunos que possuem
              um plano de mensalidade vinculado e ainda nao possuem mensalidade gerada para o mes selecionado.
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Month Info */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Calendar size={24} style={{ color: '#6b7280' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Mes de referencia
                </Typography>
                <Typography variant="subtitle1" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                  {monthLabel}
                </Typography>
              </Box>
            </Box>

            {/* Students Count */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                bgcolor: 'action.hover',
                borderRadius: 2,
              }}
            >
              <Users size={24} style={{ color: '#6b7280' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Alunos com plano vinculado
                </Typography>
                <Typography variant="subtitle1" fontWeight={600}>
                  {studentsCount} aluno{studentsCount !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
          </Box>

          {studentsCount === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }} icon={<AlertCircle size={20} />}>
              <Typography variant="body2">
                Nao ha alunos com plano de mensalidade vinculado. Vincule alunos a um plano antes de gerar mensalidades.
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isLoading || studentsCount === 0}
        >
          {isLoading ? 'Gerando...' : 'Gerar Mensalidades'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GenerateTuitionsDialog;
