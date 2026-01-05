// ============================================
// MarcusJJ - TypeScript Interfaces
// Sistema de Gestão para Academia de Jiu-Jitsu
// ============================================

// User Roles
export type UserRole = 'admin' | 'instructor' | 'student' | 'guardian';

// ============================================
// Permission System
// ============================================
export type Resource =
  | 'dashboard'
  | 'students'
  | 'attendance'
  | 'financial'
  | 'classes'
  | 'graduation'
  | 'reports'
  | 'settings'
  | 'kids'
  | 'instructors'
  | 'competitions';

export type Action = 'view' | 'view_own' | 'create' | 'edit' | 'delete' | 'manage';

export type Permission = `${Resource}:${Action}`;

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  allowedRoutes: string[];
  defaultRoute: string;
}

// Belt System
export type BeltColor = 'white' | 'blue' | 'purple' | 'brown' | 'black';
export type KidsBeltColor = 'white' | 'grey' | 'yellow' | 'orange' | 'green';
export type Stripes = 0 | 1 | 2 | 3 | 4;

// Student Status
export type StudentStatus = 'active' | 'injured' | 'inactive' | 'suspended';
export type StudentCategory = 'kids' | 'adult';

// Payment Status
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer';
export type PaymentType = 'monthly_tuition' | 'uniform' | 'seminar' | 'graduation' | 'competition' | 'other';

// Achievement Types
export type AchievementType = 'graduation' | 'stripe' | 'competition' | 'milestone';
export type MedalType = 'gold' | 'silver' | 'bronze';
export type CompetitionPosition = 'gold' | 'silver' | 'bronze' | 'participant';

// Competition Types
export type CompetitionStatus = 'upcoming' | 'ongoing' | 'completed';
export type AgeCategory = 'kids' | 'juvenile' | 'adult' | 'master';
export type WeightCategory =
  | 'galo' | 'pluma' | 'pena' | 'leve' | 'medio'
  | 'meio-pesado' | 'pesado' | 'super-pesado' | 'pesadissimo' | 'absoluto';

// Transport Types (for competitions)
export type CompetitionTransportStatus = 'pending' | 'confirmed' | 'no_transport';
export type StudentTransportPreference = 'need_transport' | 'own_transport' | 'undecided';

// Weight Categories CBJJ (constant array for forms)
export const WEIGHT_CATEGORIES_CBJJ = [
  'Galo', 'Pluma', 'Pena', 'Leve', 'Médio',
  'Meio-Pesado', 'Pesado', 'Super-Pesado', 'Pesadíssimo', 'Absoluto'
] as const;

// Age Categories Labels
export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  kids: 'Infantil',
  juvenile: 'Juvenil',
  adult: 'Adulto',
  master: 'Master'
};

// Transport Status Labels
export const TRANSPORT_STATUS_LABELS: Record<CompetitionTransportStatus, string> = {
  pending: 'Verificando',
  confirmed: 'Confirmado',
  no_transport: 'Sem transporte'
};

// Student Transport Preference Labels
export const TRANSPORT_PREFERENCE_LABELS: Record<StudentTransportPreference, string> = {
  need_transport: 'Precisa de transporte',
  own_transport: 'Transporte próprio',
  undecided: 'Ainda não decidiu'
};

// ============================================
// User Interface
// ============================================
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  phone?: string;

  // Role-specific links
  studentId?: string;        // For 'student' role - links to their student record
  linkedStudentIds?: string[]; // For 'guardian' role - links to their children's records
  instructorId?: string;     // For 'instructor' role - links to instructor record

  // Account linking (for student registration flow)
  pendingStudentLink?: string;  // ID of student awaiting approval
  approvedAt?: Date;            // Date when account was approved by master

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Student Interface
// ============================================
export interface Student {
  id: string;

  // Personal Info
  fullName: string;
  nickname?: string;
  birthDate?: Date;
  cpf?: string;
  rg?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;

  // Address
  address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Guardian (for kids)
  guardian?: {
    name: string;
    phone: string;
    email?: string;
    cpf?: string;
    relationship: string;
  };

  // Jiu-Jitsu Info
  startDate: Date;                          // When started at THIS academy
  jiujitsuStartDate?: Date;                 // When started jiu-jitsu overall (at any academy)
  currentBelt: BeltColor | KidsBeltColor;
  currentStripes: Stripes;
  category: StudentCategory;
  teamId?: string;
  weight?: number;                          // Weight in kg

  // Belt History (for timeline)
  beltHistory?: Array<{
    belt: BeltColor | KidsBeltColor;
    stripes: Stripes;
    date: Date;
    notes?: string;
  }>;

  // Attendance tracking
  initialAttendanceCount?: number;  // Previous attendances (from other systems/academies)

  // Status
  status: StudentStatus;
  statusNote?: string;

  // Financial
  planId?: string; // Reference to Plan
  tuitionValue: number;
  tuitionDay: number; // 1-31

  // Medical
  medicalCertificateUrl?: string;
  medicalCertificateExpiry?: Date;
  healthNotes?: string;
  bloodType?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  // Privacy & Account Link
  isProfilePublic?: boolean;     // Whether profile is visible publicly (defaults to false)
  linkedUserId?: string;        // Firebase user ID linked to this student

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================
// Class Interface
// ============================================
export interface Class {
  id: string;
  name: string;
  description?: string;
  instructorId: string;
  instructorName?: string;

  // Students enrolled in this class
  studentIds: string[];

  // Schedule (optional)
  schedule: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
  }[];

  // Target
  category: StudentCategory;
  minBelt?: BeltColor;
  maxBelt?: BeltColor;
  maxStudents?: number;

  // Status
  isActive: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Attendance Interface
// ============================================
export interface Attendance {
  id: string;
  studentId: string;
  studentName?: string;
  classId: string;
  className?: string;
  date: Date;
  verifiedBy: string;
  verifiedByName?: string;
  notes?: string;
  createdAt: Date;
}

// ============================================
// Plan Interface (Subscription Plans)
// ============================================
export interface Plan {
  id: string;
  name: string;
  description?: string;

  // Pricing
  monthlyValue: number;

  // Default due day for tuition (1-31)
  defaultDueDay: number;

  // Classes per week (0 = unlimited)
  classesPerWeek: number;

  // Students enrolled in this plan
  studentIds: string[];

  // Status
  isActive: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Financial Interface
// ============================================
export interface Financial {
  id: string;
  studentId: string;
  studentName?: string;

  // Payment Info
  type: PaymentType;
  description?: string;
  amount: number;
  dueDate: Date;

  // Status
  status: PaymentStatus;
  paymentDate?: Date;
  method?: PaymentMethod;

  // Reference
  referenceMonth?: string; // YYYY-MM
  receiptUrl?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// Assessment Interface (Kids)
// ============================================
export interface Assessment {
  id: string;
  studentId: string;
  studentName?: string;
  date: Date;

  scores: {
    respeito: number;      // 1-5
    disciplina: number;    // 1-5
    pontualidade: number;  // 1-5
    tecnica: number;       // 1-5
    esforco: number;       // 1-5
  };

  notes?: string;
  evaluatedBy: string;
  evaluatedByName?: string;

  createdAt: Date;
}

// ============================================
// Competition Interface
// ============================================
export interface Competition {
  id: string;
  name: string;                     // Ex: "Campeonato Estadual de Jiu-Jitsu"
  date: Date;                       // Event date
  location: string;                 // Location
  description?: string;             // Optional description

  status: CompetitionStatus;        // upcoming | ongoing | completed

  // Registration
  registrationDeadline?: Date;      // Deadline for enrollment
  enrolledStudentIds: string[];     // Students confirmed to participate (legacy, use enrollments)

  // Transport
  transportStatus?: CompetitionTransportStatus;  // pending | confirmed | no_transport
  transportNotes?: string;                       // Notes about transport arrangements
  transportCapacity?: number;                    // Number of spots available

  // Custom weight categories (in addition to CBJJ standard)
  customWeightCategories?: string[];

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// Competition Enrollment Interface
// ============================================
export interface CompetitionEnrollment {
  id: string;
  competitionId: string;
  competitionName?: string;         // Denormalized for display
  studentId: string;
  studentName: string;              // Denormalized for display

  // Category selections (chosen by student at enrollment time)
  ageCategory: AgeCategory;
  weightCategory: string;           // Can be CBJJ standard or custom

  // Transport preference
  transportPreference: StudentTransportPreference;

  enrolledAt: Date;
  enrolledBy?: string;              // User who enrolled (could be self or admin)
}

// ============================================
// Competition Result Interface
// ============================================
export interface CompetitionResult {
  id: string;
  competitionId: string;
  competitionName: string;          // Denormalized for queries
  studentId: string;
  studentName: string;              // Denormalized

  // Detailed result
  position: CompetitionPosition;    // gold | silver | bronze | participant

  // Full category
  beltCategory: BeltColor | KidsBeltColor;  // Belt at competition
  ageCategory: AgeCategory;         // kids | juvenile | adult | master
  weightCategory: string;           // Ex: "Meio-Pesado", "Leve", "Pesado"

  notes?: string;
  date: Date;                       // Competition date
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// Link Code Interface (for student account linking)
// ============================================
export interface LinkCode {
  id: string;
  code: string;                     // Ex: "ABC123"
  studentId: string;                // Student to be linked
  studentName: string;              // For display

  createdBy: string;                // Admin who generated
  createdAt: Date;
  expiresAt: Date;                  // 24h after creation

  usedAt?: Date;                    // When it was used
  usedBy?: string;                  // User ID who used it
}

// ============================================
// Achievement Interface
// ============================================
export interface Achievement {
  id: string;
  studentId: string;
  studentName?: string;

  type: AchievementType;            // graduation | stripe | competition | milestone
  title: string;                    // Ex: "Graduação para Faixa Azul"
  description?: string;

  date: Date;

  // For graduations/stripes
  fromBelt?: BeltColor | KidsBeltColor;
  toBelt?: BeltColor | KidsBeltColor;
  fromStripes?: Stripes;
  toStripes?: Stripes;

  // For competitions
  competitionId?: string;
  competitionName?: string;
  position?: CompetitionPosition;

  // For milestones
  milestone?: string;               // Ex: "100 presenças", "1 ano de treino"

  photoUrl?: string;
  isPublic: boolean;                // Respects student privacy settings

  createdAt: Date;
  createdBy?: string;
}

// ============================================
// Belt Progression Interface
// ============================================
export interface BeltProgression {
  id: string;
  studentId: string;

  previousBelt: BeltColor;
  previousStripes: Stripes;
  newBelt: BeltColor;
  newStripes: Stripes;

  promotionDate: Date;
  totalClasses: number;
  promotedBy: string;
  promotedByName?: string;
  notes?: string;

  createdAt: Date;
}

// ============================================
// Dashboard Stats Interface
// ============================================
export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  studentsThisMonth: number;

  attendanceToday: number;
  attendanceRate: number;

  revenueThisMonth: number;
  revenuePending: number;
  revenueOverdue: number;

  studentsByBelt: Record<BeltColor, number>;
  studentsByCategory: {
    kids: number;
    adult: number;
  };
}

// ============================================
// Filter Types
// ============================================
export interface StudentFilters {
  search?: string;
  status?: StudentStatus;
  category?: StudentCategory;
  belt?: BeltColor;
  paymentStatus?: PaymentStatus;
}

export interface AttendanceFilters {
  classId?: string;
  date?: Date;
  studentId?: string;
}

export interface FinancialFilters {
  studentId?: string;
  status?: PaymentStatus;
  type?: PaymentType;
  month?: string; // YYYY-MM
}

// ============================================
// Pagination
// ============================================
export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
  success: boolean;
}
