'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planService } from '@/services/planService';
import { useFeedback } from '@/components/providers';
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
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // ============================================
  // Fetch All Plans
  // ============================================
  const {
    data: plans = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.plans],
    queryFn: () => planService.list(),
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Fetch Active Plans
  // ============================================
  const { data: activePlans = [] } = useQuery({
    queryKey: [QUERY_KEYS.activePlans],
    queryFn: () => planService.getActive(),
    staleTime: 1000 * 60 * 5,
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
  // Get Plan by ID
  // ============================================
  const getPlan = useCallback(async (id: string): Promise<Plan | null> => {
    return planService.getById(id);
  }, []);

  // ============================================
  // Get Plan for Student
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
    getPlanForStudent,
    createPlan: createMutation.mutateAsync,
    updatePlan: updateMutation.mutateAsync,
    deletePlan: deleteMutation.mutateAsync,
    toggleStudent: toggleStudentMutation.mutateAsync,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTogglingStudent: toggleStudentMutation.isPending,
    error,

    // Refresh
    refresh: refetch,
  };
}

export default usePlans;
