'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlanService } from '@/services';
import { useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { Plan } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  plans: 'plans',
  plan: 'plan',
  activePlans: 'activePlans',
};

// ============================================
// usePlans Hook
// ============================================
export function usePlans() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  const planService = useMemo(() => createPlanService(academyId || 'default'), [academyId]);

  // ============================================
  // Fetch All Plans
  // ============================================
  const {
    data: plans = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.plans, academyId],
    queryFn: () => planService.list(),
    staleTime: 1000 * 60 * 5,
    enabled: !!academyId,
  });

  // ============================================
  // Fetch Active Plans
  // ============================================
  const { data: activePlans = [] } = useQuery({
    queryKey: [QUERY_KEYS.activePlans, academyId],
    queryFn: () => planService.getActive(),
    staleTime: 1000 * 60 * 5,
    enabled: !!academyId,
  });

  // ============================================
  // Create Plan Mutation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'studentIds'>) => {
      return planService.create(data);
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      success(`Plano "${newPlan.name}" criado com sucesso!`);
    },
    onError: () => {
      showError('Erro ao criar plano');
    },
  });

  // ============================================
  // Update Plan Mutation
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Plan> }) => {
      return planService.update(id, data);
    },
    onSuccess: (updatedPlan) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plan, updatedPlan.id] });
      // Also invalidate students since their tuitionValue/tuitionDay may have been updated
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      success('Plano atualizado com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar plano');
    },
  });

  // ============================================
  // Delete Plan Mutation
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return planService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      success('Plano removido com sucesso!');
    },
    onError: () => {
      showError('Erro ao remover plano');
    },
  });

  // ============================================
  // Toggle Student in Plan Mutation
  // ============================================
  const toggleStudentMutation = useMutation({
    mutationFn: async ({ planId, studentId }: { planId: string; studentId: string }) => {
      return planService.toggleStudent(planId, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      // Also invalidate students since tuitionValue/tuitionDay are synced
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
    },
    onError: () => {
      showError('Erro ao atualizar aluno no plano');
    },
  });

  // ============================================
  // Set Custom Value Mutation
  // ============================================
  const setCustomValueMutation = useMutation({
    mutationFn: async ({ planId, studentId, value }: { planId: string; studentId: string; value: number }) => {
      return planService.setCustomValue(planId, studentId, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      success('Valor personalizado definido com sucesso!');
    },
    onError: () => {
      showError('Erro ao definir valor personalizado');
    },
  });

  // ============================================
  // Remove Custom Value Mutation
  // ============================================
  const removeCustomValueMutation = useMutation({
    mutationFn: async ({ planId, studentId }: { planId: string; studentId: string }) => {
      return planService.removeCustomValue(planId, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      success('Valor restaurado ao padrão do plano!');
    },
    onError: () => {
      showError('Erro ao restaurar valor do plano');
    },
  });

  // ============================================
  // Set Custom Due Day Mutation
  // ============================================
  const setCustomDueDayMutation = useMutation({
    mutationFn: async ({ planId, studentId, day }: { planId: string; studentId: string; day: number }) => {
      return planService.setCustomDueDay(planId, studentId, day);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      success('Dia de vencimento personalizado definido!');
    },
    onError: () => {
      showError('Erro ao definir dia de vencimento');
    },
  });

  // ============================================
  // Remove Custom Due Day Mutation
  // ============================================
  const removeCustomDueDayMutation = useMutation({
    mutationFn: async ({ planId, studentId }: { planId: string; studentId: string }) => {
      return planService.removeCustomDueDay(planId, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      success('Vencimento restaurado ao padrão do plano!');
    },
    onError: () => {
      showError('Erro ao restaurar vencimento do plano');
    },
  });

  // ============================================
  // Add Students from Classes Mutation (Bulk Enrollment)
  // ============================================
  const addStudentsFromClassesMutation = useMutation({
    mutationFn: async ({ planId, classIds }: { planId: string; classIds: string[] }) => {
      return planService.addStudentsFromClasses(planId, classIds);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.plans] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activePlans] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      const skippedMsg = result.skipped.length > 0 ? ` (${result.skipped.length} já estavam no plano)` : '';
      success(`${result.added.length} aluno${result.added.length !== 1 ? 's' : ''} adicionado${result.added.length !== 1 ? 's' : ''} ao plano!${skippedMsg}`);
    },
    onError: () => {
      showError('Erro ao adicionar alunos da turma');
    },
  });

  // ============================================
  // Get Plan by ID
  // ============================================
  const getPlan = useCallback(async (id: string): Promise<Plan | null> => {
    return planService.getById(id);
  }, []);

  // ============================================
  // Get Plans for Student (multiple plans)
  // ============================================
  const getPlansForStudent = useCallback(async (studentId: string): Promise<Plan[]> => {
    return planService.getPlansForStudent(studentId);
  }, []);

  // ============================================
  // Get Plan for Student (legacy — first plan)
  // ============================================
  const getPlanForStudent = useCallback(async (studentId: string): Promise<Plan | null> => {
    return planService.getPlanForStudent(studentId);
  }, []);

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    plans,
    activePlans,

    // Actions
    getPlan,
    getPlansForStudent,
    getPlanForStudent,
    createPlan: createMutation.mutateAsync,
    updatePlan: updateMutation.mutateAsync,
    deletePlan: deleteMutation.mutateAsync,
    toggleStudent: toggleStudentMutation.mutateAsync,
    addStudentsFromClasses: addStudentsFromClassesMutation.mutateAsync,
    isAddingStudentsFromClasses: addStudentsFromClassesMutation.isPending,
    setCustomValue: setCustomValueMutation.mutateAsync,
    removeCustomValue: removeCustomValueMutation.mutateAsync,
    setCustomDueDay: setCustomDueDayMutation.mutateAsync,
    removeCustomDueDay: removeCustomDueDayMutation.mutateAsync,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTogglingStudent: toggleStudentMutation.isPending,
    isSettingCustomValue: setCustomValueMutation.isPending,
    isSettingCustomDueDay: setCustomDueDayMutation.isPending,
    error,

    // Refresh
    refresh: refetch,
  };
}

export default usePlans;
