'use client';

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createStudentService, createAttendanceService, createFinancialService } from '@/services';
import { useAcademy } from '@/contexts/AcademyContext';
import { createRetentionService } from '@/services/retentionService';
import { Student, Attendance, Financial } from '@/types';
import { subDays } from 'date-fns';

// ============================================
// Query Keys
// ============================================
const QUERY_KEYS = {
  retentionStudents: 'retentionStudents',
  retentionAttendance: 'retentionAttendance',
  retentionFinancials: 'retentionFinancials',
};

// ============================================
// useRetention Hook
// ============================================
export function useRetention() {
  const { academyId } = useAcademy();
  const queryClient = useQueryClient();

  // Create services with useMemo
  const studentService = useMemo(
    () => createStudentService(academyId || 'default'),
    [academyId]
  );
  const attendanceService = useMemo(
    () => createAttendanceService(academyId || 'default'),
    [academyId]
  );
  const financialService = useMemo(
    () => createFinancialService(academyId || 'default'),
    [academyId]
  );
  const retentionService = useMemo(() => createRetentionService(), []);

  // ============================================
  // Query 1: Fetch all active students
  // ============================================
  const {
    data: students = [],
    isLoading: isLoadingStudents,
    error: studentsError,
  } = useQuery({
    queryKey: [QUERY_KEYS.retentionStudents, academyId],
    queryFn: () => studentService.getActive(),
    staleTime: 1000 * 60 * 3, // 3 minutes
    enabled: !!academyId,
  });

  // ============================================
  // Query 2: Fetch attendance records (last 30 days)
  // ============================================
  const {
    data: attendanceRecords = [],
    isLoading: isLoadingAttendance,
    error: attendanceError,
  } = useQuery({
    queryKey: [QUERY_KEYS.retentionAttendance, academyId],
    queryFn: () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      return attendanceService.getByDateRange(thirtyDaysAgo, now);
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    enabled: !!academyId,
  });

  // ============================================
  // Query 3: Fetch all financials (to identify overdue)
  // ============================================
  const {
    data: financials = [],
    isLoading: isLoadingFinancials,
    error: financialsError,
  } = useQuery({
    queryKey: [QUERY_KEYS.retentionFinancials, academyId],
    queryFn: () => financialService.list({ status: 'overdue' }),
    staleTime: 1000 * 60 * 3, // 3 minutes
    enabled: !!academyId,
  });

  // ============================================
  // Compute derived data with useMemo
  // ============================================

  // Build attendance map: studentId -> Attendance[]
  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    attendanceRecords.forEach((record) => {
      const existing = map.get(record.studentId) || [];
      existing.push(record);
      map.set(record.studentId, existing);
    });
    return map;
  }, [attendanceRecords]);

  // Build financials map: studentId -> Financial[] (overdue only)
  const financialsMap = useMemo(() => {
    const map = new Map<string, Financial[]>();
    financials.forEach((financial) => {
      const existing = map.get(financial.studentId) || [];
      existing.push(financial);
      map.set(financial.studentId, existing);
    });
    return map;
  }, [financials]);

  // Compute at-risk students
  const atRiskStudents = useMemo(() => {
    if (students.length === 0) return [];
    return retentionService.getAtRiskStudents(students, attendanceMap, financialsMap);
  }, [students, attendanceMap, financialsMap, retentionService]);

  // Compute retention metrics
  const metrics = useMemo(() => {
    if (students.length === 0) {
      return {
        totalAtRisk: 0,
        atRiskPercentage: 0,
        averageFrequency: 0,
        paymentComplianceRate: 100,
        distributionByRisk: { low: 0, medium: 0, high: 0, critical: 0 },
        distributionByBelt: {},
        distributionByCategory: {},
      };
    }

    const baseMetrics = retentionService.getRetentionMetrics(students, atRiskStudents);

    // Compute average frequency from raw attendance data (last 30 days)
    const now = new Date();
    const last30Days = subDays(now, 30);
    const activeStudents = students.filter((s) => s.status === 'active');

    if (activeStudents.length > 0) {
      let totalAttendanceLast30 = 0;
      activeStudents.forEach((student) => {
        const studentAttendance = attendanceMap.get(student.id) || [];
        const last30Count = studentAttendance.filter(
          (a) => a.date.getTime() >= last30Days.getTime()
        ).length;
        totalAttendanceLast30 += last30Count;
      });
      baseMetrics.averageFrequency = totalAttendanceLast30 / activeStudents.length;
    }

    return baseMetrics;
  }, [students, atRiskStudents, attendanceMap, retentionService]);

  // ============================================
  // Combined loading and error state
  // ============================================
  const isLoading = isLoadingStudents || isLoadingAttendance || isLoadingFinancials;
  const error = studentsError || attendanceError || financialsError;

  // ============================================
  // Refresh function
  // ============================================
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.retentionStudents, academyId] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.retentionAttendance, academyId] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.retentionFinancials, academyId] });
  }, [queryClient, academyId]);

  return {
    atRiskStudents,
    metrics,
    isLoading,
    error,
    refresh,
  };
}

export default useRetention;
