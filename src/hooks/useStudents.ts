'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services';
import { useAuth, useFeedback } from '@/components/providers';
import { Student, StudentFilters, StudentStatus, StudentCategory, BeltColor, KidsBeltColor, Stripes } from '@/types';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  students: 'students',
  student: 'student',
  activeStudents: 'activeStudents',
  studentsByBelt: 'studentsByBelt',
  studentsByCategory: 'studentsByCategory',
};

// ============================================
// Hook Options
// ============================================
interface UseStudentsOptions {
  autoLoad?: boolean;
  initialFilters?: StudentFilters;
}

// ============================================
// useStudents Hook
// ============================================
export function useStudents(options: UseStudentsOptions = {}) {
  const { autoLoad = true, initialFilters = {} } = options;

  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState<StudentFilters>(initialFilters);

  // ============================================
  // Fetch Students
  // ============================================
  const {
    data: studentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.students, filters],
    queryFn: () => studentService.list(filters),
    enabled: autoLoad,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const students = studentsData?.data || [];
  const pagination = studentsData?.pagination;

  // ============================================
  // Fetch Active Students
  // ============================================
  const { data: activeStudents = [] } = useQuery({
    queryKey: [QUERY_KEYS.activeStudents],
    queryFn: () => studentService.getActive(),
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Get Student by ID
  // ============================================
  const getStudent = useCallback(async (id: string): Promise<Student | null> => {
    return studentService.getById(id);
  }, []);

  // ============================================
  // Create Student Mutation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated');
      return studentService.create(data, user.id);
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeStudents] });
      success(`${student.fullName} cadastrado com sucesso!`);
    },
    onError: () => {
      showError('Erro ao cadastrar aluno');
    },
  });

  // ============================================
  // Quick Create Mutation
  // ============================================
  interface QuickCreateParams {
    fullName: string;
    phone?: string;
    category?: StudentCategory;
    currentBelt?: BeltColor | KidsBeltColor;
    currentStripes?: Stripes;
  }

  const quickCreateMutation = useMutation({
    mutationFn: async ({ fullName, phone, category = 'adult', currentBelt = 'white', currentStripes = 0 }: QuickCreateParams) => {
      if (!user) throw new Error('User not authenticated');
      return studentService.create({
        fullName,
        phone: phone || undefined,
        category,
        currentBelt,
        currentStripes,
        status: 'active',
        startDate: new Date(),
        tuitionValue: 0,
        tuitionDay: 10,
      }, user.id);
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeStudents] });
      success(`${student.fullName} cadastrado com sucesso!`);
    },
    onError: () => {
      showError('Erro ao cadastrar aluno');
    },
  });

  // ============================================
  // Update Student Mutation
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Student> }) => {
      return studentService.update(id, data);
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.student, student.id] });
      success('Aluno atualizado com sucesso!');
    },
    onError: () => {
      showError('Erro ao atualizar aluno');
    },
  });

  // ============================================
  // Delete Student Mutation (Soft delete)
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return studentService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.activeStudents] });
      success('Aluno desativado com sucesso!');
    },
    onError: () => {
      showError('Erro ao desativar aluno');
    },
  });

  // ============================================
  // Update Belt Mutation
  // ============================================
  const updateBeltMutation = useMutation({
    mutationFn: async ({
      id,
      belt,
      stripes,
    }: {
      id: string;
      belt: Student['currentBelt'];
      stripes: Student['currentStripes'];
    }) => {
      return studentService.updateBelt(id, belt, stripes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.students] });
      success('Graduação atualizada!');
    },
    onError: () => {
      showError('Erro ao atualizar graduação');
    },
  });

  // ============================================
  // Search Students
  // ============================================
  const searchMutation = useMutation({
    mutationFn: async (searchTerm: string) => {
      return studentService.search(searchTerm);
    },
  });

  // ============================================
  // Filter Helpers
  // ============================================
  const updateFilter = useCallback((key: keyof StudentFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // ============================================
  // Stats
  // ============================================
  const stats = useMemo(() => {
    const byStatus: Record<StudentStatus, number> = {
      active: 0,
      injured: 0,
      inactive: 0,
      suspended: 0,
    };

    const byCategory: Record<StudentCategory, number> = {
      kids: 0,
      adult: 0,
    };

    const byBelt: Partial<Record<BeltColor, number>> = {};

    students.forEach((student) => {
      byStatus[student.status]++;
      byCategory[student.category]++;

      const belt = student.currentBelt as BeltColor;
      byBelt[belt] = (byBelt[belt] || 0) + 1;
    });

    return {
      total: students.length,
      byStatus,
      byCategory,
      byBelt,
    };
  }, [students]);

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    students,
    activeStudents,
    pagination,
    stats,

    // State
    filters,
    setFilters,
    updateFilter,
    clearFilters,

    // Actions
    getStudent,
    createStudent: createMutation.mutateAsync,
    quickCreateStudent: quickCreateMutation.mutateAsync,
    updateStudent: updateMutation.mutateAsync,
    deleteStudent: deleteMutation.mutateAsync,
    updateBelt: updateBeltMutation.mutateAsync,
    searchStudents: searchMutation.mutateAsync,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSearching: searchMutation.isPending,
    error,

    // Refresh
    refresh: refetch,
  };
}

// ============================================
// useStudent Hook (Single student)
// ============================================
export function useStudent(studentId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: student,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEYS.student, studentId],
    queryFn: () => (studentId ? studentService.getById(studentId) : null),
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5,
  });

  const refresh = useCallback(() => {
    if (studentId) {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.student, studentId] });
    }
  }, [queryClient, studentId]);

  return {
    student,
    isLoading,
    error,
    refresh,
  };
}

export default useStudents;
