// Legacy exports (backwards compatible) + Factory functions
export { studentService, createStudentService } from './studentService';
export { classService, createClassService } from './classService';
export { attendanceService, createAttendanceService } from './attendanceService';
export { financialService, createFinancialService } from './financialService';
export { assessmentService, createAssessmentService } from './assessmentService';
export { achievementService, createAchievementService } from './achievementService';
export { beltProgressionService, createBeltProgressionService } from './beltProgressionService';
export { planService, createPlanService, getStudentValue } from './planService';
export { settingsService, createSettingsService } from './settingsService';
export { linkCodeService, createLinkCodeService } from './linkCodeService';
export {
  createInstructorLinkCodeService,
  validateInstructorCodeGlobally,
  redeemInstructorCode,
} from './instructorLinkCodeService';
export { competitionService, createCompetitionService } from './competitionService';
export { competitionEnrollmentService, createCompetitionEnrollmentService } from './competitionEnrollmentService';
export { createCheckinService } from './checkinService';

// Multi-tenant services (factory functions only)
export { createNotificationService } from './notificationService';
export { createAbacatePayService } from './abacatePayService';
export { createAsaasService } from './asaasService';
export { createBillingReminderService } from './billingReminderService';
export { createBillingNotificationService } from './billingNotificationService';
export { createRetentionService } from './retentionService';
export { createFinancialReportService } from './financialReportService';

// Global services (ROOT level, not per-academy)
export { globalUserService } from './globalUserService';
export { crossAcademyService } from './crossAcademyService';
export type {
  CrossAcademyBeltProgression,
  CrossAcademyCompetitionResult,
  AcademyAttendanceStats,
  CrossAcademyStudentHistory,
} from './crossAcademyService';

// Type exports
export type { AcademySettings } from './settingsService';
