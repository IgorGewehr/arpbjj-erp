'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialService } from '@/services';
import { useAuth, useFeedback } from '@/components/providers';
import { Financial, FinancialFilters, PaymentMethod } from '@/types';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  financials: 'financials',
  financial: 'financial',
  pending: 'pendingPayments',
  overdue: 'overduePayments',
  summary: 'monthlySummary',
  revenue: 'revenueStats',
};

// ============================================
// Hook Options
// ============================================
interface UseFinancialOptions {
  autoLoad?: boolean;
  initialFilters?: FinancialFilters;
}

// ============================================
// useFinancial Hook
// ============================================
export function useFinancial(options: UseFinancialOptions = {}) {
  const { autoLoad = true, initialFilters = {} } = options;

  const { user } = useAuth();
  const { success, error: showError } = useFeedback();
  const queryClient = useQueryClient();

  // Current month for default view
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Filter state
  const [filters, setFilters] = useState<FinancialFilters>({
    month: currentMonth,
    ...initialFilters,
  });

  // ============================================
  // Fetch Financials
  // ============================================
  const {
    data: financials = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.financials, filters],
    queryFn: () => financialService.list(filters),
    enabled: autoLoad,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // ============================================
  // Fetch Pending Payments
  // ============================================
  const { data: pendingPayments = [] } = useQuery({
    queryKey: [QUERY_KEYS.pending],
    queryFn: () => financialService.getPending(),
    staleTime: 1000 * 60 * 2,
  });

  // ============================================
  // Fetch Overdue Payments
  // ============================================
  const { data: overduePayments = [] } = useQuery({
    queryKey: [QUERY_KEYS.overdue],
    queryFn: () => financialService.getOverdue(),
    staleTime: 1000 * 60 * 2,
  });

  // ============================================
  // Fetch Monthly Summary
  // ============================================
  const { data: monthlySummary } = useQuery({
    queryKey: [QUERY_KEYS.summary, filters.month || currentMonth],
    queryFn: () => financialService.getMonthlySummary(filters.month || currentMonth),
    staleTime: 1000 * 60 * 2,
  });

  // ============================================
  // Fetch Revenue Stats (last 6 months)
  // ============================================
  const { data: revenueStats } = useQuery({
    queryKey: [QUERY_KEYS.revenue],
    queryFn: () => {
      const endDate = endOfMonth(new Date());
      const startDate = startOfMonth(subMonths(new Date(), 5));
      return financialService.getRevenueStats(startDate, endDate);
    },
    staleTime: 1000 * 60 * 5,
  });

  // ============================================
  // Create Financial Record Mutation
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data: Omit<Financial, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated');
      return financialService.create(data, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financials] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.summary] });
      success('Registro financeiro criado!');
    },
    onError: () => {
      showError('Erro ao criar registro');
    },
  });

  // ============================================
  // Mark as Paid Mutation
  // ============================================
  const markPaidMutation = useMutation({
    mutationFn: async ({
      id,
      method,
      paymentDate,
    }: {
      id: string;
      method: PaymentMethod;
      paymentDate?: Date;
    }) => {
      return financialService.markAsPaid(id, method, paymentDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financials] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.overdue] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.summary] });
      success('Pagamento registrado!');
    },
    onError: () => {
      showError('Erro ao registrar pagamento');
    },
  });

  // ============================================
  // Cancel Payment Mutation
  // ============================================
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return financialService.cancel(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financials] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.summary] });
      success('Pagamento cancelado');
    },
    onError: () => {
      showError('Erro ao cancelar pagamento');
    },
  });

  // ============================================
  // Generate Monthly Tuitions Mutation
  // ============================================
  const generateTuitionsMutation = useMutation({
    mutationFn: async ({
      students,
      month,
    }: {
      students: Array<{ id: string; fullName: string; tuitionValue: number; tuitionDay: number }>;
      month: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return financialService.generateMonthlyTuitions(students, month, user.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.financials] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.summary] });
      success(`${result.length} mensalidades geradas!`);
    },
    onError: () => {
      showError('Erro ao gerar mensalidades');
    },
  });

  // ============================================
  // Filter Helpers
  // ============================================
  const updateFilter = useCallback((key: keyof FinancialFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }, []);

  const setMonth = useCallback((month: string) => {
    updateFilter('month', month);
  }, [updateFilter]);

  const clearFilters = useCallback(() => {
    setFilters({ month: currentMonth });
  }, [currentMonth]);

  // ============================================
  // Stats
  // ============================================
  const stats = useMemo(() => {
    const totalPending = pendingPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalOverdue = overduePayments.reduce((acc, p) => acc + p.amount, 0);

    return {
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      totalPending,
      totalOverdue,
      ...monthlySummary,
    };
  }, [pendingPayments, overduePayments, monthlySummary]);

  // ============================================
  // Get WhatsApp Reminder
  // ============================================
  const getWhatsAppLink = useCallback(
    (phone: string, studentName: string, amount: number, dueDate: Date) => {
      return financialService.getWhatsAppReminderLink(phone, studentName, amount, dueDate);
    },
    []
  );

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    financials,
    pendingPayments,
    overduePayments,
    monthlySummary,
    revenueStats,
    stats,

    // Filters
    filters,
    setFilters,
    updateFilter,
    setMonth,
    clearFilters,
    currentMonth,

    // Actions
    createFinancial: createMutation.mutateAsync,
    markAsPaid: markPaidMutation.mutateAsync,
    cancelPayment: cancelMutation.mutateAsync,
    generateTuitions: generateTuitionsMutation.mutateAsync,
    getWhatsAppLink,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isMarkingPaid: markPaidMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isGenerating: generateTuitionsMutation.isPending,
    error,

    // Refresh
    refresh: refetch,
  };
}

export default useFinancial;
