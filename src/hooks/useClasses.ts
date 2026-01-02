'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '@/services';
import { useFeedback } from '@/components/providers';
import { Class } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  classes: 'classes',
  class: 'class',
  todayClasses: 'todayClasses',
  weeklySchedule: 'weeklySchedule',
  currentClass: 'currentClass',
};

// ============================================
// useClasses Hook
// ============================================
export function useClasses() {
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // ============================================
  // Fetch All Classes
  // ============================================
  const {
    data: classes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.classes],
    queryFn: () => classService.list(),
    staleTime: 1000 * 60 * 10,
  });

  // ============================================
  // Fetch Today's Classes
  // ============================================
  const { data: todayClasses = [] } = useQuery({
    queryKey: [QUERY_KEYS.todayClasses],
    queryFn: () => classService.getTodayClasses(),
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Fetch Weekly Schedule
  // ============================================
  const { data: weeklySchedule } = useQuery({
    queryKey: [QUERY_KEYS.weeklySchedule],
    queryFn: () => classService.getWeeklySchedule(),
    staleTime: 1000 * 60 * 10,
  });

  // ============================================
  // Fetch Current Class
  // ============================================
  const { data: currentClass } = useQuery({
    queryKey: [QUERY_KEYS.currentClass],
    queryFn: () => classService.getCurrentClass(),
    staleTime: 1000 * 60 * 1,
    refetchInterval: 1000 * 60 * 1, // Refetch every minute
  });

  // ============================================
  // Create Class Mutation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) => {
      return classService.create(data);
    },
    onSuccess: (newClass) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.classes] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.weeklySchedule] });
      // Also invalidate allClasses used by useAttendance
      queryClient.invalidateQueries({ queryKey: ['allClasses'] });
      success(`Turma "${newClass.name}" criada com sucesso!`);
    },
    onError: () => {
      showError('Erro ao criar turma');
    },
  });

  // ============================================
  // Update Class Mutation
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Class> }) => {
      return classService.update(id, data);
    },
    onSuccess: (updatedClass) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.classes] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.weeklySchedule] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.class, updatedClass.id] });
      // Also invalidate allClasses used by useAttendance
      queryClient.invalidateQueries({ queryKey: ['allClasses'] });
      success('Turma atualizada com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar turma');
    },
  });

  // ============================================
  // Delete Class Mutation
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return classService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.classes] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.weeklySchedule] });
      // Also invalidate allClasses used by useAttendance
      queryClient.invalidateQueries({ queryKey: ['allClasses'] });
      success('Turma desativada com sucesso!');
    },
    onError: () => {
      showError('Erro ao desativar turma');
    },
  });

  // ============================================
  // Toggle Student in Class Mutation
  // ============================================
  const toggleStudentMutation = useMutation({
    mutationFn: async ({ classId, studentId }: { classId: string; studentId: string }) => {
      return classService.toggleStudent(classId, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.classes] });
      // Also invalidate allClasses used by useAttendance
      queryClient.invalidateQueries({ queryKey: ['allClasses'] });
    },
    onError: () => {
      showError('Erro ao atualizar aluno na turma');
    },
  });

  // ============================================
  // Get Class by ID
  // ============================================
  const getClass = useCallback(async (id: string): Promise<Class | null> => {
    return classService.getById(id);
  }, []);

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    classes,
    todayClasses,
    weeklySchedule,
    currentClass,

    // Actions
    getClass,
    createClass: createMutation.mutateAsync,
    updateClass: updateMutation.mutateAsync,
    deleteClass: deleteMutation.mutateAsync,
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

export default useClasses;
