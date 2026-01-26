'use client';

import { useMemo } from 'react';
import { useAcademy } from '@/contexts/AcademyContext';
import { usePermissions } from '@/components/providers';

/**
 * Hook to check if the current user is a monitor
 * A monitor is a student who has been granted additional permissions
 * to take attendance and manage students.
 */
export function useIsMonitor(): boolean {
  const { academy } = useAcademy();
  const { linkedStudentIds } = usePermissions();

  const isMonitor = useMemo(() => {
    if (!academy?.monitorIds || academy.monitorIds.length === 0) {
      return false;
    }

    // Check if any of the user's linked student IDs is in the monitors list
    return linkedStudentIds.some(studentId =>
      academy.monitorIds?.includes(studentId)
    );
  }, [academy?.monitorIds, linkedStudentIds]);

  return isMonitor;
}
