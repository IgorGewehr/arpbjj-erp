'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCheckinService, isInCheckinWindow, getTimeUntilCheckinOpens } from '@/services/checkinService';
import { useAuth, useFeedback } from '@/components/providers';
import { useAcademy } from '@/contexts/AcademyContext';
import { Checkin, Class } from '@/types';
import { format } from 'date-fns';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  checkins: 'checkins',
  pendingCheckins: 'pendingCheckins',
  studentCheckin: 'studentCheckin',
  checkinCount: 'checkinCount',
};

// ============================================
// useCheckin Hook
// ============================================
export function useCheckin() {
  const { user } = useAuth();
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  const checkinService = useMemo(
    () => createCheckinService(academyId || 'default'),
    [academyId]
  );

  // ============================================
  // Create Check-in Mutation (Student)
  // ============================================
  const createCheckinMutation = useMutation({
    mutationFn: async ({
      studentId,
      studentName,
      classData,
      scheduleStartTime,
      scheduleEndTime,
      scheduleDayOfWeek,
    }: {
      studentId: string;
      studentName: string;
      classData: Class;
      scheduleStartTime: string;
      scheduleEndTime: string;
      scheduleDayOfWeek: number;
    }) => {
      return checkinService.createCheckin({
        studentId,
        studentName,
        classId: classData.id,
        className: classData.name,
        scheduleStartTime,
        scheduleEndTime,
        scheduleDayOfWeek,
      });
    },
    onSuccess: () => {
      success('Check-in realizado com sucesso!');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentCheckin] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pendingCheckins] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.checkinCount] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer check-in';
      showError(errorMessage);
    },
  });

  // ============================================
  // Get Pending Check-ins Query (Admin)
  // ============================================
  const usePendingCheckins = (classId: string | null, date: Date) => {
    return useQuery({
      queryKey: [QUERY_KEYS.pendingCheckins, classId, format(date, 'yyyy-MM-dd'), academyId],
      queryFn: async () => {
        if (!classId) return [];
        return checkinService.getPendingByClassAndDate(classId, date);
      },
      enabled: !!classId,
      staleTime: 1000 * 30, // 30 seconds
    });
  };

  // ============================================
  // Get Student Check-in Query
  // ============================================
  const useStudentCheckin = (studentId: string | null, classId: string | null, date: Date) => {
    return useQuery({
      queryKey: [QUERY_KEYS.studentCheckin, studentId, classId, format(date, 'yyyy-MM-dd'), academyId],
      queryFn: async () => {
        if (!studentId || !classId) return null;
        return checkinService.getStudentCheckin(studentId, classId, date);
      },
      enabled: !!studentId && !!classId,
      staleTime: 1000 * 30,
    });
  };

  // ============================================
  // Count Pending Check-ins Query
  // ============================================
  const useCheckinCount = (classId: string | null, date: Date) => {
    return useQuery({
      queryKey: [QUERY_KEYS.checkinCount, classId, format(date, 'yyyy-MM-dd'), academyId],
      queryFn: async () => {
        if (!classId) return 0;
        return checkinService.countPendingCheckins(classId, date);
      },
      enabled: !!classId,
      staleTime: 1000 * 30,
    });
  };

  // ============================================
  // Remove Check-in Mutation
  // ============================================
  const removeCheckinMutation = useMutation({
    mutationFn: async (checkinId: string) => {
      return checkinService.removeCheckin(checkinId);
    },
    onSuccess: () => {
      success('Check-in removido');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pendingCheckins] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.checkinCount] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover check-in';
      showError(errorMessage);
    },
  });

  // ============================================
  // Add Manual Check-in Mutation (Admin)
  // ============================================
  const addManualCheckinMutation = useMutation({
    mutationFn: async ({
      studentId,
      studentName,
      classData,
      scheduleStartTime,
      scheduleEndTime,
      scheduleDayOfWeek,
      date,
    }: {
      studentId: string;
      studentName: string;
      classData: Class;
      scheduleStartTime: string;
      scheduleEndTime: string;
      scheduleDayOfWeek: number;
      date: Date;
    }) => {
      return checkinService.addManualCheckin({
        studentId,
        studentName,
        classId: classData.id,
        className: classData.name,
        scheduleStartTime,
        scheduleEndTime,
        scheduleDayOfWeek,
        date,
      });
    },
    onSuccess: () => {
      success('Check-in adicionado');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pendingCheckins] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.checkinCount] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar check-in';
      showError(errorMessage);
    },
  });

  // ============================================
  // Confirm Check-ins Mutation (Admin)
  // ============================================
  const confirmCheckinsMutation = useMutation({
    mutationFn: async (checkinIds: string[]) => {
      if (!user) throw new Error('User not authenticated');
      return checkinService.confirmCheckins(checkinIds, user.id, user.displayName);
    },
    onSuccess: (result) => {
      if (result.success > 0) {
        success(`${result.success} presenca(s) confirmada(s)!`);
      }
      if (result.failed > 0) {
        showError(`${result.failed} check-in(s) falharam`);
      }
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pendingCheckins] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.checkinCount] });
      queryClient.invalidateQueries({ queryKey: ['presentStudentIds'] });
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao confirmar check-ins';
      showError(errorMessage);
    },
  });

  // ============================================
  // Return
  // ============================================
  return {
    // Queries (hooks that need to be called in components)
    usePendingCheckins,
    useStudentCheckin,
    useCheckinCount,

    // Mutations
    createCheckin: createCheckinMutation.mutate,
    createCheckinAsync: createCheckinMutation.mutateAsync,
    isCreatingCheckin: createCheckinMutation.isPending,

    removeCheckin: removeCheckinMutation.mutate,
    removeCheckinAsync: removeCheckinMutation.mutateAsync,
    isRemovingCheckin: removeCheckinMutation.isPending,

    addManualCheckin: addManualCheckinMutation.mutate,
    addManualCheckinAsync: addManualCheckinMutation.mutateAsync,
    isAddingManualCheckin: addManualCheckinMutation.isPending,

    confirmCheckins: confirmCheckinsMutation.mutate,
    confirmCheckinsAsync: confirmCheckinsMutation.mutateAsync,
    isConfirmingCheckins: confirmCheckinsMutation.isPending,

    // Helpers
    isInCheckinWindow,
    getTimeUntilCheckinOpens,

    // Invalidate queries
    invalidateCheckins: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pendingCheckins] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.studentCheckin] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.checkinCount] });
    },
  };
}

export default useCheckin;
