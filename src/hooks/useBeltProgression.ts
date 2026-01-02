'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { beltProgressionService } from '@/services';
import { useAuth, useFeedback } from '@/components/providers';
import { BeltColor, Stripes } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  progressions: 'beltProgressions',
  studentProgression: 'studentBeltProgression',
  eligibleStudents: 'eligibleStudents',
  beltDistribution: 'beltDistribution',
  recentPromotions: 'recentPromotions',
  studentJourney: 'studentJourney',
  eligibility: 'studentEligibility',
};

// ============================================
// useBeltProgression Hook
// ============================================
export function useBeltProgression() {
  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // ============================================
  // Fetch Eligible Students
  // ============================================
  const {
    data: eligibleStudents = [],
    isLoading: isLoadingEligible,
    refetch: refetchEligible,
  } = useQuery({
    queryKey: [QUERY_KEYS.eligibleStudents],
    queryFn: () => beltProgressionService.getEligibleStudents(),
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Fetch Belt Distribution
  // ============================================
  const { data: beltDistribution } = useQuery({
    queryKey: [QUERY_KEYS.beltDistribution],
    queryFn: () => beltProgressionService.getBeltDistribution(),
    staleTime: 1000 * 60 * 10,
  });

  // ============================================
  // Fetch Recent Promotions
  // ============================================
  const { data: recentPromotions = [] } = useQuery({
    queryKey: [QUERY_KEYS.recentPromotions],
    queryFn: () => beltProgressionService.getRecentPromotions(10),
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Check Student Eligibility
  // ============================================
  const checkEligibility = useCallback(async (studentId: string) => {
    return beltProgressionService.checkEligibility(studentId);
  }, []);

  // ============================================
  // Get Student Journey
  // ============================================
  const getStudentJourney = useCallback(async (studentId: string) => {
    return beltProgressionService.getStudentJourney(studentId);
  }, []);

  // ============================================
  // Promote Student Mutation
  // ============================================
  const promoteMutation = useMutation({
    mutationFn: async ({
      studentId,
      newBelt,
      newStripes,
      notes,
    }: {
      studentId: string;
      newBelt: BeltColor;
      newStripes: Stripes;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return beltProgressionService.promote(
        studentId,
        newBelt,
        newStripes,
        user.id,
        user.displayName,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.eligibleStudents] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.beltDistribution] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recentPromotions] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      success('Graduacao registrada com sucesso!');
    },
    onError: () => {
      showError('Erro ao registrar graduacao');
    },
  });

  // ============================================
  // Add Stripe Mutation
  // ============================================
  const addStripeMutation = useMutation({
    mutationFn: async ({
      studentId,
      notes,
    }: {
      studentId: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return beltProgressionService.addStripe(
        studentId,
        user.id,
        user.displayName,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.eligibleStudents] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recentPromotions] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      success('Grau adicionado com sucesso!');
    },
    onError: (error: Error) => {
      showError(error.message || 'Erro ao adicionar grau');
    },
  });

  // ============================================
  // Change Belt Mutation
  // ============================================
  const changeBeltMutation = useMutation({
    mutationFn: async ({
      studentId,
      newBelt,
      notes,
    }: {
      studentId: string;
      newBelt: BeltColor;
      notes?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return beltProgressionService.changeBelt(
        studentId,
        newBelt,
        user.id,
        user.displayName,
        notes
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.eligibleStudents] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.beltDistribution] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.recentPromotions] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      success('Faixa alterada com sucesso!');
    },
    onError: () => {
      showError('Erro ao alterar faixa');
    },
  });

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    eligibleStudents,
    beltDistribution,
    recentPromotions,

    // Actions
    checkEligibility,
    getStudentJourney,
    promoteStudent: promoteMutation.mutateAsync,
    addStripe: addStripeMutation.mutateAsync,
    changeBelt: changeBeltMutation.mutateAsync,

    // Loading states
    isLoadingEligible,
    isPromoting: promoteMutation.isPending,
    isAddingStripe: addStripeMutation.isPending,
    isChangingBelt: changeBeltMutation.isPending,

    // Refresh
    refreshEligible: refetchEligible,

    // Helpers
    getBeltLabel: beltProgressionService.getBeltLabel,
    getBeltColorHex: beltProgressionService.getBeltColorHex,
  };
}

// ============================================
// useStudentProgression Hook (for single student)
// ============================================
export function useStudentProgression(studentId: string | null) {
  const { data: journey, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.studentJourney, studentId],
    queryFn: () => (studentId ? beltProgressionService.getStudentJourney(studentId) : null),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: eligibility } = useQuery({
    queryKey: [QUERY_KEYS.eligibility, studentId],
    queryFn: () => (studentId ? beltProgressionService.checkEligibility(studentId) : null),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    journey,
    eligibility,
    isLoading,
  };
}

export default useBeltProgression;
