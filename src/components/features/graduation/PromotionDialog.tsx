'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Avatar,
  Chip,
} from '@mui/material';
import { Award, ArrowRight } from 'lucide-react';
import { Student, BeltColor, Stripes } from '@/types';
import { getBeltChipColor } from '@/lib/theme';

// ============================================
// Props Interface
// ============================================
interface PromotionDialogProps {
  open: boolean;
  student: Student;
  nextPromotion: { belt: BeltColor; stripes: Stripes };
  onClose: () => void;
  onConfirm: (type: 'stripe' | 'belt', notes?: string) => void;
  isLoading?: boolean;
  getBeltLabel: (belt: BeltColor) => string;
}

// ============================================
// Stripes Display Component
// ============================================
function StripesDisplay({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 4,
            height: 14,
            bgcolor: 'common.white',
            borderRadius: 0.5,
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      ))}
    </Box>
  );
}

// ============================================
// PromotionDialog Component
// ============================================
export function PromotionDialog({
  open,
  student,
  nextPromotion,
  onClose,
  onConfirm,
  isLoading = false,
  getBeltLabel,
}: PromotionDialogProps) {
  const [notes, setNotes] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNotes('');
    }
  }, [open]);

  const currentBeltColor = getBeltChipColor(student.currentBelt);
  const nextBeltColor = getBeltChipColor(nextPromotion.belt);

  const isStripePromotion = student.currentBelt === nextPromotion.belt;

  const handleConfirm = useCallback(() => {
    onConfirm(isStripePromotion ? 'stripe' : 'belt', notes || undefined);
  }, [onConfirm, isStripePromotion, notes]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Award size={24} style={{ color: '#16a34a' }} />
          Confirmar Graduacao
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Student Info */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Avatar
              src={student.photoUrl}
              sx={{
                width: 64,
                height: 64,
                bgcolor: currentBeltColor.bg,
                color: currentBeltColor.text,
                fontWeight: 600,
                fontSize: '1.25rem',
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {student.nickname || student.fullName.split(' ')[0]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {student.fullName}
              </Typography>
            </Box>
          </Box>

          {/* Belt Transition */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              p: 3,
              bgcolor: 'success.light',
              borderRadius: 2,
              mb: 3,
            }}
          >
            {/* Current */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Atual
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Chip
                  label={getBeltLabel(student.currentBelt as BeltColor)}
                  sx={{
                    bgcolor: currentBeltColor.bg,
                    color: currentBeltColor.text,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                />
                <StripesDisplay count={student.currentStripes} />
              </Box>
            </Box>

            {/* Arrow */}
            <ArrowRight size={32} style={{ color: '#16a34a' }} />

            {/* Next */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Nova Graduacao
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Chip
                  label={getBeltLabel(nextPromotion.belt)}
                  sx={{
                    bgcolor: nextBeltColor.bg,
                    color: nextBeltColor.text,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                />
                <StripesDisplay count={nextPromotion.stripes} />
              </Box>
            </Box>
          </Box>

          {/* Promotion Type Info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {isStripePromotion
                ? `Adicionar ${nextPromotion.stripes}o Grau`
                : `Promover para Faixa ${getBeltLabel(nextPromotion.belt)}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isStripePromotion
                ? 'O aluno recebera um novo grau na faixa atual.'
                : 'O aluno sera promovido para a proxima faixa, iniciando com 0 graus.'}
            </Typography>
          </Box>

          {/* Notes */}
          <TextField
            label="Observacoes (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Motivo da promocao, desempenho, etc."
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<Award size={18} />}
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Registrando...' : 'Confirmar Graduacao'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PromotionDialog;
