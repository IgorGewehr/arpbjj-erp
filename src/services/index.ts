// Legacy exports (backwards compatible)
export { studentService, createStudentService } from './studentService';
export { classService, createClassService } from './classService';
export { attendanceService, createAttendanceService } from './attendanceService';
export { financialService, createFinancialService } from './financialService';
export { assessmentService } from './assessmentService';
export { achievementService, createAchievementService } from './achievementService';
export { beltProgressionService } from './beltProgressionService';
export { planService } from './planService';
export { settingsService, createSettingsService } from './settingsService';
export { linkCodeService } from './linkCodeService';
export { competitionService } from './competitionService';

// Multi-tenant services (factory functions)
export { createNotificationService } from './notificationService';
export { createAbacatePayService } from './abacatePayService';

// Type exports
export type { AcademySettings } from './settingsService';
