'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentService } from '@/services';
import { useAuth, useFeedback } from '@/components/providers';
import { Assessment } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  assessments: 'assessments',
  studentAssessments: 'studentAssessments',
  recentAssessments: 'recentAssessments',
  evolution: 'assessmentEvolution',
};

// ============================================
// useAssessment Hook
// ============================================
export function useAssessment() {
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // ============================================
  // Fetch Recent Assessments
  // ============================================
  const {
    data: recentAssessments = [],
    isLoading: isLoadingRecent,
    refetch: refetchRecent,
  } = useQuery({
    queryKey: [QUERY_KEYS.recentAssessments],
    queryFn: () => assessmentService.getRecent(20),
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Create Assessment Mutation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Assessment, 'id' | 'createdAt'>) => {
      return assessmentService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recentAssessments] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentAssessments] });
      success('Avaliacao registrada com sucesso!');
    },
    onError: () => {
      showError('Erro ao registrar avaliacao');
    },
  });

  // ============================================
  // Update Assessment Mutation
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Assessment> }) => {
      return assessmentService.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recentAssessments] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentAssessments] });
      success('Avaliacao atualizada!');
    },
    onError: () => {
      showError('Erro ao atualizar avaliacao');
    },
  });

  // ============================================
  // Delete Assessment Mutation
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return assessmentService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recentAssessments] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentAssessments] });
      success('Avaliacao excluida');
    },
    onError: () => {
      showError('Erro ao excluir avaliacao');
    },
  });

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    recentAssessments,

    // Actions
    createAssessment: createMutation.mutateAsync,
    updateAssessment: updateMutation.mutateAsync,
    deleteAssessment: deleteMutation.mutateAsync,

    // Loading states
    isLoadingRecent,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Refresh
    refreshRecent: refetchRecent,

    // Helpers
    calculateOverallScore: assessmentService.calculateOverallScore,
    getPerformanceLevel: assessmentService.getPerformanceLevel,
  };
}

// ============================================
// useStudentAssessment Hook (for single student)
// ============================================
export function useStudentAssessment(studentId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: assessments = [],
    isLoading: isLoadingAssessments,
  } = useQuery({
    queryKey: [QUERY_KEYS.studentAssessments, studentId],
    queryFn: () => (studentId ? assessmentService.getByStudent(studentId, 10) : []),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: evolution,
    isLoading: isLoadingEvolution,
  } = useQuery({
    queryKey: [QUERY_KEYS.evolution, studentId],
    queryFn: () => (studentId ? assessmentService.getEvolution(studentId, 5) : null),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });

  const refresh = useCallback(() => {
    if (studentId) {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentAssessments, studentId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.evolution, studentId] });
    }
  }, [queryClient, studentId]);

  return {
    assessments,
    evolution,
    isLoading: isLoadingAssessments || isLoadingEvolution,
    refresh,
    calculateOverallScore: assessmentService.calculateOverallScore,
    getPerformanceLevel: assessmentService.getPerformanceLevel,
  };
}

export default useAssessment;
