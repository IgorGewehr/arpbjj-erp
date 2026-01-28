'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Chip,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Users, Calendar, Filter, CheckCircle, Info } from 'lucide-react';
import { Plan, Student, Financial } from '@/types';

// ============================================
// Props Interface
// ============================================
interface GenerateTuitionsDialogProps {
  open: boolean;
  month: string;
  plans: Plan[];
  students: Student[];
  financials: Financial[];
  onClose: () => void;
  onConfirm: (planId: string | null) => void;
  isLoading?: boolean;
}

// ============================================
// GenerateTuitionsDialog Component
// ============================================
export function GenerateTuitionsDialog({
  open,
  month,
  plans,
  students,
  financials,
  onClose,
  onConfirm,
  isLoading = false,
}: GenerateTuitionsDialogProps) {
  const [filterType, setFilterType] = useState<'all' | 'specific'>('all');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFilterType('all');
      setSelectedPlanId('');
    }
  }, [open]);

  const monthLabel = format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR });

  // Get active plans only
  const activePlans = useMemo(() => {
    return plans.filter(p => p.isActive);
  }, [plans]);

  // Calculate students who will receive tuition based on filter
  const tuitionStats = useMemo(() => {
    // Get students who already have tuition for this month
    const studentsWithTuition = new Set(
      financials
        .filter(f => f.referenceMonth === month && f.type === 'monthly_tuition')
        .map(f => f.studentId)
    );

    // Get students in plans based on filter
    const plansToProcess = filterType === 'specific' && selectedPlanId
      ? activePlans.filter(p => p.id === selectedPlanId)
      : activePlans;

    const studentsInPlans = new Set<string>();
    const studentsToGenerate = new Set<string>();

    for (const plan of plansToProcess) {
      for (const studentId of plan.studentIds) {
        const student = students.find(s => s.id === studentId && s.status === 'active');
        if (student) {
          studentsInPlans.add(studentId);
          if (!studentsWithTuition.has(studentId)) {
            studentsToGenerate.add(studentId);
          }
        }
      }
    }

    return {
      totalInPlans: studentsInPlans.size,
      alreadyHaveTuition: studentsInPlans.size - studentsToGenerate.size,
      willReceiveTuition: studentsToGenerate.size,
    };
  }, [filterType, selectedPlanId, activePlans, students, financials, month]);

  const handleConfirm = () => {
    const planId = filterType === 'specific' ? selectedPlanId : null;
    onConfirm(planId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Gerar Mensalidades
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Info Alert */}
          <Alert severity="info" sx={{ mb: 3 }} icon={<Info size={20} />}>
            <Typography variant="body2">
              Mensalidades sao geradas apenas para alunos que ainda nao possuem
              registro para o mes selecionado.
            </Typography>
          </Alert>

          {/* Month Info */}
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

          {/* Filter Options */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Filter size={18} style={{ color: '#6b7280' }} />
              <Typography variant="subtitle2" color="text.secondary">
                Filtrar por plano
              </Typography>
            </Box>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'specific')}
              >
                <FormControlLabel
                  value="all"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        Todos os planos ativos
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gera para todos os alunos em qualquer plano ativo
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: 'flex-start', '& .MuiRadio-root': { mt: 0.5 } }}
                />
                <FormControlLabel
                  value="specific"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" fontWeight={500}>
                        Plano especifico
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gera apenas para alunos de um plano selecionado
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', '& .MuiRadio-root': { mt: 0.5 } }}
                />
              </RadioGroup>
            </FormControl>

            {/* Plan Selector */}
            {filterType === 'specific' && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel size="small">Selecione o plano</InputLabel>
                <Select
                  size="small"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  label="Selecione o plano"
                >
                  {activePlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>{plan.name}</span>
                        <Chip
                          label={`${plan.studentIds.length} aluno${plan.studentIds.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* Stats Summary */}
          <Box
            sx={{
              p: 2,
              bgcolor: tuitionStats.willReceiveTuition > 0 ? 'success.50' : 'warning.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: tuitionStats.willReceiveTuition > 0 ? 'success.200' : 'warning.200',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {tuitionStats.willReceiveTuition > 0 ? (
                <CheckCircle size={20} style={{ color: '#16a34a' }} />
              ) : (
                <AlertCircle size={20} style={{ color: '#d97706' }} />
              )}
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color={tuitionStats.willReceiveTuition > 0 ? 'success.main' : 'warning.main'}
              >
                {tuitionStats.willReceiveTuition > 0
                  ? `${tuitionStats.willReceiveTuition} aluno${tuitionStats.willReceiveTuition !== 1 ? 's' : ''} receberao mensalidade`
                  : 'Nenhuma mensalidade sera gerada'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total no{filterType === 'specific' ? ' plano' : 's planos'}
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {tuitionStats.totalInPlans}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ja possuem mensalidade
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {tuitionStats.alreadyHaveTuition}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Novos
                </Typography>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {tuitionStats.willReceiveTuition}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* No active plans warning */}
          {activePlans.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }} icon={<AlertCircle size={20} />}>
              <Typography variant="body2">
                Nao ha planos ativos. Crie um plano e vincule alunos antes de gerar mensalidades.
              </Typography>
            </Alert>
          )}

          {/* Specific plan not selected warning */}
          {filterType === 'specific' && !selectedPlanId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Selecione um plano para visualizar quantos alunos receberao mensalidade.
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
          onClick={handleConfirm}
          disabled={
            isLoading ||
            tuitionStats.willReceiveTuition === 0 ||
            (filterType === 'specific' && !selectedPlanId)
          }
        >
          {isLoading ? 'Gerando...' : `Gerar ${tuitionStats.willReceiveTuition} Mensalidade${tuitionStats.willReceiveTuition !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GenerateTuitionsDialog;
