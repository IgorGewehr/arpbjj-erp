'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Edit2, History } from 'lucide-react';
import { Student, Plan } from '@/types';
import { getBeltChipColor } from '@/lib/theme';
import { BeltDisplay } from '@/components/shared/BeltDisplay';
import { getStudentValue } from '@/services/planService';
import { usePlans } from '@/hooks';

// ============================================
// Interfaces
// ============================================
interface StudentPlansModalProps {
  open: boolean;
  student: Student | null;
  plans: Plan[];
  onClose: () => void;
}

// ============================================
// StudentPlansModal Component
// ============================================
export function StudentPlansModal({ open, student, plans, onClose }: StudentPlansModalProps) {
  const { setCustomValue, removeCustomValue, isSettingCustomValue } = usePlans();

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [customValueInput, setCustomValueInput] = useState('');

  // ============================================
  // Get Initials
  // ============================================
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // ============================================
  // Handle Edit Click
  // ============================================
  const handleEditClick = (plan: Plan) => {
    if (!student) return;
    setEditingPlan(plan);
    const currentValue = getStudentValue(plan, student.id);
    setCustomValueInput(currentValue.toString());
  };

  // ============================================
  // Handle Save Custom Value
  // ============================================
  const handleSaveCustomValue = async () => {
    if (!editingPlan || !student) return;

    const value = parseFloat(customValueInput);
    if (isNaN(value) || value <= 0) return;

    setEditingPlan(null);

    // If value equals plan default, remove custom value, otherwise set it
    if (value === editingPlan.monthlyValue) {
      await removeCustomValue({ planId: editingPlan.id, studentId: student.id });
    } else {
      await setCustomValue({ planId: editingPlan.id, studentId: student.id, value });
    }
  };

  // ============================================
  // Handle Restore Default Value
  // ============================================
  const handleRestoreValue = async () => {
    if (!editingPlan || !student) return;
    setEditingPlan(null);
    await removeCustomValue({ planId: editingPlan.id, studentId: student.id });
  };

  // ============================================
  // Close Edit Dialog on Parent Close
  // ============================================
  useEffect(() => {
    if (!open) {
      setEditingPlan(null);
    }
  }, [open]);

  if (!student) return null;

  const beltColor = getBeltChipColor(student.currentBelt);
  const totalMonthly = plans.reduce(
    (sum, plan) => sum + getStudentValue(plan, student.id),
    0
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={student.photoUrl}
              sx={{
                width: 56,
                height: 56,
                bgcolor: beltColor.bg,
                color: beltColor.text,
              }}
            >
              {getInitials(student.fullName)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {student.fullName}
              </Typography>
              <BeltDisplay
                belt={student.currentBelt}
                stripes={student.currentStripes}
                size="small"
              />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Total Monthly */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              p: 2,
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Total Mensal
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              R$ {totalMonthly.toLocaleString('pt-BR')}
            </Typography>
          </Box>

          {/* Plans List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {plans.map((plan, index) => {
              const studentValue = getStudentValue(plan, student.id);
              const hasCustomValue = plan.customValues?.[student.id] !== undefined;

              return (
                <Box key={plan.id}>
                  {index > 0 && <Divider sx={{ mb: 2 }} />}
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {plan.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Valor padrão: R$ {plan.monthlyValue.toLocaleString('pt-BR')}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(plan)}
                          sx={{ ml: 1 }}
                        >
                          <Edit2 size={16} />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight={700} color="primary.main">
                          R$ {studentValue.toLocaleString('pt-BR')}
                        </Typography>
                        {hasCustomValue && (
                          <Chip
                            label="Personalizado"
                            size="small"
                            color="success"
                            sx={{ height: 22, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>

          {plans.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhum plano encontrado para este aluno
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Custom Value Dialog */}
      <Dialog
        open={!!editingPlan}
        onClose={() => setEditingPlan(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Valor - {editingPlan?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Valor padrão do plano: R$ {editingPlan?.monthlyValue.toLocaleString('pt-BR')}
          </Typography>
          <TextField
            fullWidth
            label="Valor do aluno"
            type="number"
            value={customValueInput}
            onChange={(e) => setCustomValueInput(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography>R$</Typography>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 1 }}
          />
          {editingPlan?.customValues?.[student.id] !== undefined && (
            <Button
              size="small"
              startIcon={<History size={14} />}
              onClick={handleRestoreValue}
              disabled={isSettingCustomValue}
            >
              Restaurar valor do plano
            </Button>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditingPlan(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveCustomValue}
            disabled={
              isSettingCustomValue ||
              isNaN(parseFloat(customValueInput)) ||
              parseFloat(customValueInput) <= 0
            }
            startIcon={
              isSettingCustomValue ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
          >
            {isSettingCustomValue ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StudentPlansModal;
