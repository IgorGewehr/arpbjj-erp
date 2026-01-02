'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService, classService, studentService } from '@/services';
import { useAuth } from '@/components/providers';
import { useFeedback } from '@/components/providers';
import { Attendance, Class, Student } from '@/types';
import { format, isSameDay, isToday } from 'date-fns';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  attendance: 'attendance',
  todayAttendance: 'todayAttendance',
  currentClass: 'currentClass',
  todayClasses: 'todayClasses',
  classesForDate: 'classesForDate',
  activeStudents: 'activeStudents',
  presentStudentIds: 'presentStudentIds',
  allClasses: 'allClasses',
};

// ============================================
// Hook Options
// ============================================
interface UseAttendanceOptions {
  autoDetectClass?: boolean;
  classId?: string;
  initialDate?: Date;
}

// ============================================
// useAttendance Hook
// ============================================
export function useAttendance(options: UseAttendanceOptions = {}) {
  const { autoDetectClass = true, classId: initialClassId, initialDate = new Date() } = options;

  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // Selected date state
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  // Selected class state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId || null);

  // Selected schedule/time state (for classes with multiple schedules)
  const [selectedScheduleTime, setSelectedScheduleTime] = useState<string | null>(null);

  // ============================================
  // Fetch All Classes (for any day selection)
  // ============================================
  const {
    data: allClasses = [],
    isLoading: isLoadingAllClasses,
  } = useQuery({
    queryKey: [QUERY_KEYS.allClasses],
    queryFn: () => classService.list(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // ============================================
  // Get Classes for Selected Date
  // ============================================
  const classesForDate = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    return allClasses.filter((cls) =>
      cls.schedule.some((s) => s.dayOfWeek === dayOfWeek)
    ).sort((a, b) => {
      // Sort by earliest start time for this day
      const aTime = a.schedule.find((s) => s.dayOfWeek === dayOfWeek)?.startTime || '23:59';
      const bTime = b.schedule.find((s) => s.dayOfWeek === dayOfWeek)?.startTime || '23:59';
      return aTime.localeCompare(bTime);
    });
  }, [allClasses, selectedDate]);

  // ============================================
  // Get Schedule Options for Selected Class
  // ============================================
  const scheduleOptions = useMemo(() => {
    if (!selectedClassId) return [];

    const selectedClass = allClasses.find(c => c.id === selectedClassId);
    if (!selectedClass) return [];

    const dayOfWeek = selectedDate.getDay();
    return selectedClass.schedule
      .filter(s => s.dayOfWeek === dayOfWeek)
      .map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        label: `${s.startTime} - ${s.endTime}`,
      }));
  }, [selectedClassId, allClasses, selectedDate]);

  // ============================================
  // Fetch Current Class (Auto-detect based on time) - Only for today
  // ============================================
  const {
    data: currentClass,
    isLoading: isLoadingCurrentClass,
  } = useQuery({
    queryKey: [QUERY_KEYS.currentClass],
    queryFn: () => classService.getCurrentClass(),
    enabled: autoDetectClass && !initialClassId && isToday(selectedDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set selected class when current class is detected (only on today)
  useEffect(() => {
    if (autoDetectClass && currentClass && !selectedClassId && isToday(selectedDate)) {
      setSelectedClassId(currentClass.id);
      // Also auto-select the current time slot
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const dayOfWeek = selectedDate.getDay();

      const matchingSchedule = currentClass.schedule.find(s => {
        if (s.dayOfWeek !== dayOfWeek) return false;
        const [startH, startM] = s.startTime.split(':').map(Number);
        const [endH, endM] = s.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        return currentTime >= startMinutes - 30 && currentTime <= endMinutes;
      });

      if (matchingSchedule) {
        setSelectedScheduleTime(matchingSchedule.startTime);
      }
    }
  }, [autoDetectClass, currentClass, selectedClassId, selectedDate]);

  // ============================================
  // Fetch Active Students
  // ============================================
  const {
    data: students = [],
    isLoading: isLoadingStudents,
  } = useQuery({
    queryKey: [QUERY_KEYS.activeStudents],
    queryFn: () => studentService.getActive(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // ============================================
  // Fetch Present Student IDs for Selected Class and Date
  // ============================================
  const {
    data: presentStudentIds = new Set<string>(),
    isLoading: isLoadingPresent,
  } = useQuery({
    queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!selectedClassId) return new Set<string>();
      return attendanceService.getPresentStudentIds(selectedClassId, selectedDate);
    },
    enabled: !!selectedClassId,
    staleTime: 1000 * 30, // 30 seconds (more frequent updates)
  });

  // ============================================
  // Mark Present Mutation (Optimistic Update)
  // ============================================
  const markPresentMutation = useMutation({
    mutationFn: async ({ student, classData }: { student: Student; classData: Class }) => {
      if (!user) throw new Error('User not authenticated');

      return attendanceService.markPresent(
        student.id,
        student.fullName,
        classData.id,
        classData.name,
        user.id,
        user.displayName,
        selectedDate
      );
    },
    // Optimistic Update
    onMutate: async ({ student }) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });

      // Snapshot previous value
      const previousPresent = queryClient.getQueryData<Set<string>>([
        QUERY_KEYS.presentStudentIds,
        selectedClassId,
        dateKey,
      ]);

      // Optimistically update
      queryClient.setQueryData<Set<string>>(
        [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
        (old) => {
          const newSet = new Set(old);
          newSet.add(student.id);
          return newSet;
        }
      );

      return { previousPresent };
    },
    onError: (err, _variables, context) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      // Rollback on error
      if (context?.previousPresent) {
        queryClient.setQueryData(
          [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
          context.previousPresent
        );
      }
      showError('Erro ao marcar presenca');
    },
    onSuccess: (_data, { student }) => {
      success(`${student.nickname || student.fullName} - Presenca registrada!`);
    },
    onSettled: () => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });
    },
  });

  // ============================================
  // Unmark Present Mutation (Optimistic Update)
  // ============================================
  const unmarkPresentMutation = useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      if (!selectedClassId) throw new Error('No class selected');

      return attendanceService.unmarkPresent(studentId, selectedClassId, selectedDate);
    },
    // Optimistic Update
    onMutate: async ({ studentId }) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      await queryClient.cancelQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });

      const previousPresent = queryClient.getQueryData<Set<string>>([
        QUERY_KEYS.presentStudentIds,
        selectedClassId,
        dateKey,
      ]);

      queryClient.setQueryData<Set<string>>(
        [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
        (old) => {
          const newSet = new Set(old);
          newSet.delete(studentId);
          return newSet;
        }
      );

      return { previousPresent };
    },
    onError: (err, _variables, context) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      if (context?.previousPresent) {
        queryClient.setQueryData(
          [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
          context.previousPresent
        );
      }
      showError('Erro ao remover presenca');
    },
    onSuccess: () => {
      success('Presenca removida');
    },
    onSettled: () => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });
    },
  });

  // ============================================
  // Bulk Mark Present Mutation
  // ============================================
  const bulkMarkPresentMutation = useMutation({
    mutationFn: async ({ studentsToMark, classData }: { studentsToMark: Student[]; classData: Class }) => {
      if (!user) throw new Error('User not authenticated');

      return attendanceService.bulkMarkPresent(
        studentsToMark.map((s) => ({ id: s.id, name: s.fullName })),
        classData.id,
        classData.name,
        user.id,
        user.displayName,
        selectedDate
      );
    },
    onMutate: async ({ studentsToMark }) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      await queryClient.cancelQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });

      const previousPresent = queryClient.getQueryData<Set<string>>([
        QUERY_KEYS.presentStudentIds,
        selectedClassId,
        dateKey,
      ]);

      queryClient.setQueryData<Set<string>>(
        [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
        (old) => {
          const newSet = new Set(old);
          studentsToMark.forEach((s) => newSet.add(s.id));
          return newSet;
        }
      );

      return { previousPresent };
    },
    onError: (err, _variables, context) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      if (context?.previousPresent) {
        queryClient.setQueryData(
          [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
          context.previousPresent
        );
      }
      showError('Erro ao marcar presencas');
    },
    onSuccess: (data) => {
      success(`${data.length} alunos marcados como presentes!`);
    },
    onSettled: () => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });
    },
  });

  // ============================================
  // Bulk Unmark Present Mutation
  // ============================================
  const bulkUnmarkPresentMutation = useMutation({
    mutationFn: async ({ studentIds }: { studentIds: string[] }) => {
      if (!selectedClassId) throw new Error('No class selected');

      // Unmark each student
      for (const studentId of studentIds) {
        try {
          await attendanceService.unmarkPresent(studentId, selectedClassId, selectedDate);
        } catch {
          // Skip if not found
        }
      }
    },
    onMutate: async ({ studentIds }) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      await queryClient.cancelQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });

      const previousPresent = queryClient.getQueryData<Set<string>>([
        QUERY_KEYS.presentStudentIds,
        selectedClassId,
        dateKey,
      ]);

      queryClient.setQueryData<Set<string>>(
        [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
        (old) => {
          const newSet = new Set(old);
          studentIds.forEach((id) => newSet.delete(id));
          return newSet;
        }
      );

      return { previousPresent };
    },
    onError: (err, _variables, context) => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      if (context?.previousPresent) {
        queryClient.setQueryData(
          [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
          context.previousPresent
        );
      }
      showError('Erro ao remover presencas');
    },
    onSuccess: () => {
      success('Todas as presencas removidas');
    },
    onSettled: () => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey],
      });
    },
  });

  // ============================================
  // Toggle Attendance Handler
  // ============================================
  const toggleAttendance = useCallback(
    async (student: Student) => {
      const classData = classesForDate.find((c) => c.id === selectedClassId);
      if (!classData) {
        showError('Selecione uma turma');
        return;
      }

      const isPresent = presentStudentIds.has(student.id);

      if (isPresent) {
        unmarkPresentMutation.mutate({ studentId: student.id });
      } else {
        markPresentMutation.mutate({ student, classData });
      }
    },
    [selectedClassId, classesForDate, presentStudentIds, markPresentMutation, unmarkPresentMutation, showError]
  );

  // ============================================
  // Bulk Mark All Present
  // ============================================
  const markAllPresent = useCallback(
    (studentsToMark: Student[]) => {
      const classData = classesForDate.find((c) => c.id === selectedClassId);
      if (!classData) {
        showError('Selecione uma turma');
        return;
      }

      // Filter out already present students
      const notPresent = studentsToMark.filter((s) => !presentStudentIds.has(s.id));
      if (notPresent.length === 0) {
        success('Todos ja estao presentes');
        return;
      }

      bulkMarkPresentMutation.mutate({ studentsToMark: notPresent, classData });
    },
    [selectedClassId, classesForDate, presentStudentIds, bulkMarkPresentMutation, showError, success]
  );

  // ============================================
  // Bulk Unmark All Present
  // ============================================
  const unmarkAllPresent = useCallback(() => {
    if (!selectedClassId) {
      showError('Selecione uma turma');
      return;
    }

    const presentIds = Array.from(presentStudentIds);
    if (presentIds.length === 0) {
      success('Nenhuma presenca para remover');
      return;
    }

    bulkUnmarkPresentMutation.mutate({ studentIds: presentIds });
  }, [selectedClassId, presentStudentIds, bulkUnmarkPresentMutation, showError, success]);

  // ============================================
  // Check if Student is Present
  // ============================================
  const isStudentPresent = useCallback(
    (studentId: string) => presentStudentIds.has(studentId),
    [presentStudentIds]
  );

  // ============================================
  // Get Selected Class
  // ============================================
  const selectedClass = useMemo(
    () => classesForDate.find((c) => c.id === selectedClassId) || null,
    [classesForDate, selectedClassId]
  );

  // ============================================
  // Filter students by class enrollment or category
  // ============================================
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return students;

    // If class has studentIds, use those
    if (selectedClass.studentIds && selectedClass.studentIds.length > 0) {
      return students.filter((student) => selectedClass.studentIds.includes(student.id));
    }

    // Otherwise filter by category
    return students.filter((student) => {
      if (selectedClass.category && student.category !== selectedClass.category) {
        return false;
      }
      return true;
    });
  }, [students, selectedClass]);

  // ============================================
  // Handle Date Change
  // ============================================
  const handleDateChange = useCallback((newDate: Date) => {
    setSelectedDate(newDate);
    // Reset class selection when date changes to a different day of week
    if (newDate.getDay() !== selectedDate.getDay()) {
      setSelectedClassId(null);
      setSelectedScheduleTime(null);
    }
  }, [selectedDate]);

  // ============================================
  // Stats
  // ============================================
  const stats = useMemo(() => ({
    totalStudents: filteredStudents.length,
    presentCount: presentStudentIds.size,
    absentCount: filteredStudents.length - presentStudentIds.size,
    attendanceRate: filteredStudents.length > 0
      ? Math.round((presentStudentIds.size / filteredStudents.length) * 100)
      : 0,
  }), [filteredStudents, presentStudentIds]);

  // ============================================
  // Loading State
  // ============================================
  const isLoading = isLoadingCurrentClass || isLoadingAllClasses || isLoadingStudents || isLoadingPresent;
  const isMutating = markPresentMutation.isPending || unmarkPresentMutation.isPending || bulkMarkPresentMutation.isPending || bulkUnmarkPresentMutation.isPending;

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    students: filteredStudents,
    allClasses,
    classesForDate,
    todayClasses: classesForDate, // Alias for backwards compatibility
    selectedClass,
    currentClass,
    presentStudentIds,
    scheduleOptions,

    // Date State
    selectedDate,
    setSelectedDate: handleDateChange,
    isToday: isToday(selectedDate),

    // Class State
    selectedClassId,
    setSelectedClassId,

    // Schedule State
    selectedScheduleTime,
    setSelectedScheduleTime,

    // Actions
    toggleAttendance,
    isStudentPresent,
    markAllPresent,
    unmarkAllPresent,

    // Stats
    stats,

    // Loading
    isLoading,
    isMutating,

    // Refresh
    refresh: () => {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.presentStudentIds, selectedClassId, dateKey] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeStudents] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allClasses] });
    },
  };
}

export default useAttendance;
