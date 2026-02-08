'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAcademy } from '@/contexts/AcademyContext';
import { useFeedback } from '@/components/providers';
import { createFinancialReportService } from '@/services/financialReportService';
import { format, subMonths, addMonths } from 'date-fns';
import {
  MonthlyReport,
  RevenueProjection,
  RevenueByPlan,
  FinancialRecommendation,
} from '@/types';

// ============================================
// Query Keys
// ============================================
const REPORT_QUERY_KEYS = {
  financialReportData: 'financialReportData',
};

// ============================================
// Aggregated report data (single query result)
// ============================================
interface FinancialReportData {
  historicalData: MonthlyReport[];
  projections: RevenueProjection[];
}

// ============================================
// useFinancialReport Hook
// ============================================
export function useFinancialReport() {
  const { academyId } = useAcademy();
  const { success, error: showError } = useFeedback();

  // State: selected month (YYYY-MM format)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );

  // Create service instance
  const service = useMemo(
    () => createFinancialReportService(academyId || 'default'),
    [academyId]
  );

  // ============================================
  // Single query: load all data once, compute everything
  // ============================================
  const {
    data: reportData,
    isLoading,
  } = useQuery({
    queryKey: [REPORT_QUERY_KEYS.financialReportData, academyId],
    queryFn: async (): Promise<FinancialReportData> => {
      await service.loadAll();
      const historicalData = service.getHistoricalData(6);
      const projections = service.projectRevenue(3);
      return { historicalData, projections };
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!academyId,
  });

  const historicalData = reportData?.historicalData ?? [];
  const projections = reportData?.projections ?? [];

  // ============================================
  // Derived: Monthly report for selected month
  // ============================================
  const monthlyReport: MonthlyReport | undefined = useMemo(() => {
    if (!reportData) return undefined;
    // Check if selectedMonth is in the historical data
    const existing = historicalData.find((r) => r.month === selectedMonth);
    if (existing) return existing;
    // Otherwise generate from cached data
    return service.generateMonthlyReport(selectedMonth);
  }, [reportData, historicalData, selectedMonth, service]);

  // ============================================
  // Derived: Revenue by plan for selected month
  // ============================================
  const revenueByPlan: RevenueByPlan[] = useMemo(() => {
    if (!reportData) return [];
    return service.getRevenueByPlan(selectedMonth);
  }, [reportData, selectedMonth, service]);

  // ============================================
  // Computed: Recommendations
  // ============================================
  const recommendations: FinancialRecommendation[] = useMemo(() => {
    if (!monthlyReport || historicalData.length === 0) return [];
    return service.generateRecommendations(monthlyReport, historicalData);
  }, [monthlyReport, historicalData, service]);

  // ============================================
  // Navigation: Previous Month
  // ============================================
  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const [year, month] = prev.split('-').map(Number);
      const prevDate = subMonths(new Date(year, month - 1, 1), 1);
      return format(prevDate, 'yyyy-MM');
    });
  }, []);

  // ============================================
  // Navigation: Next Month
  // ============================================
  const goToNextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const [year, month] = prev.split('-').map(Number);
      const nextDate = addMonths(new Date(year, month - 1, 1), 1);
      return format(nextDate, 'yyyy-MM');
    });
  }, []);

  // ============================================
  // Export CSV
  // ============================================
  const exportCSV = useCallback(() => {
    try {
      if (historicalData.length === 0) {
        showError('Nenhum dado disponivel para exportar');
        return;
      }

      const csvContent = service.exportCSV(historicalData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-financeiro-${selectedMonth}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      success('Relatorio exportado com sucesso!');
    } catch {
      showError('Erro ao exportar relatorio');
    }
  }, [historicalData, selectedMonth, service, success, showError]);

  // ============================================
  // Return
  // ============================================
  return {
    // Data
    monthlyReport,
    historicalData,
    projections,
    revenueByPlan,
    recommendations,

    // Selected month
    selectedMonth,
    setSelectedMonth,

    // Navigation
    goToPreviousMonth,
    goToNextMonth,

    // Export
    exportCSV,

    // Loading states
    isLoading,
    isLoadingReport: isLoading,
    isLoadingHistorical: isLoading,
    isLoadingProjections: isLoading,
    isLoadingRevenueByPlan: isLoading,
  };
}

export default useFinancialReport;
