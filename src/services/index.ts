// Legacy exports (backwards compatible)
export { studentService, createStudentService } from './studentService';
export { classService } from './classService';
export { attendanceService } from './attendanceService';
export { financialService } from './financialService';
export { assessmentService } from './assessmentService';
export { achievementService } from './achievementService';
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
