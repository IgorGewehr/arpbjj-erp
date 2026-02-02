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
export type KidsBeltColor =
  | 'white'
  | 'grey' | 'grey-white' | 'grey-black'
  | 'yellow' | 'yellow-white' | 'yellow-black'
  | 'orange' | 'orange-white' | 'orange-black'
  | 'green' | 'green-white' | 'green-black';
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
// Global User Interface (ROOT /users/{uid})
// This is the user's global identity, independent of any academy
// ============================================
export type AccountType = 'free' | 'linked';

export interface GlobalUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;

  // Account type
  accountType: AccountType;              // 'free' = no academy, 'linked' = has academy(s)

  // Personal info (for fighter profile)
  birthDate?: Date;
  cpf?: string;
  weight?: number;

  // Global jiu-jitsu info (highest achieved, synced from academies)
  jiujitsuStartDate?: Date;              // When started training jiu-jitsu (any academy)
  highestBelt?: BeltColor | KidsBeltColor;  // Highest belt achieved
  highestStripes?: Stripes;              // Stripes at highest belt

  // Profile visibility
  isProfilePublic?: boolean;             // Visible to others for competitions

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// User Interface (Legacy alias for GlobalUser + AcademyUser combined)
// Kept for backwards compatibility
// ============================================
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  phone?: string;

  // Account type (new)
  accountType?: AccountType;

  // Global jiu-jitsu info (new)
  jiujitsuStartDate?: Date;
  highestBelt?: BeltColor | KidsBeltColor;
  highestStripes?: Stripes;
  isProfilePublic?: boolean;

  // Role-specific links (from AcademyUser context)
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
  attendanceCount?: number;         // Attendances registered in this system (auto-updated)

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

// ============================================
// Multi-Tenant Types
// ============================================

// Academy (Tenant)
export interface Academy {
  id: string;
  name: string;
  slug: string;                         // URL-friendly identifier (e.g., "tropa23")
  logoUrl?: string;

  // Branding
  portalSlogan?: string;                // Frase exibida na TopAppBar do portal
  sidebarLogoUrl?: string;              // Logo alternativo para sidebar
  portalBackgroundUrl?: string;         // Background do portal do aluno
  adminBackgroundUrl?: string;          // Background do painel admin
  sidebarBackgroundUrl?: string;        // Background da sidebar

  // Contact Info
  cnpj?: string;
  email?: string;
  phone?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Financial Settings
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // AbacatePay Integration (API key is global in env, not per-academy)
  abacatePayEnabled?: boolean;

  // Auto-graduation Settings
  autoGraduationEnabled?: boolean;
  autoGraduationAttendances?: number;   // Attendances required per stripe/belt

  // Store Settings
  storeEnabled?: boolean;
  storePublished?: boolean;
  storeWelcomeMessage?: string;
  storeMinOrderAmount?: number;
  storeCreditCardEnabled?: boolean;    // Enable credit card payments in store

  // Monitors (students with additional permissions)
  monitorIds?: string[];                // Array of studentIds that are monitors

  // Student Check-in Settings
  studentCheckinEnabled?: boolean;      // Allow students to self check-in

  // Subscription
  subscription?: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    expiresAt?: Date;
    trialEndsAt?: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;                      // Firebase UID of the academy owner
}

// User-Academy Mapping (for users in multiple academies)
export interface UserAcademyMapping {
  id: string;                           // Firebase UID
  academyIds: string[];                 // List of academy IDs the user belongs to
  primaryAcademyId?: string;            // Default academy (null if no academies)

  // Detailed info per academy
  academyDetails?: {
    [academyId: string]: {
      studentId?: string;               // Student record ID at this academy
      role: UserRole;                   // Role at this academy
      joinedAt: Date;                   // When joined this academy
      status: 'active' | 'inactive' | 'pending';  // Status at this academy
    };
  };

  updatedAt?: Date;
}

// Academy User (user within an academy context - /academies/{academyId}/users/{uid})
// This represents the user's permissions and links WITHIN a specific academy
export interface AcademyUser {
  id: string;                           // Firebase UID (same as GlobalUser.id)
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;                       // Role within THIS academy
  phone?: string;

  // Role-specific links within THIS academy
  studentId?: string;                   // Student record at THIS academy
  linkedStudentIds?: string[];          // Children at THIS academy (for guardians)
  instructorId?: string;                // Instructor record at THIS academy

  // Account linking
  pendingStudentLink?: string;
  approvedAt?: Date;

  // Status at this academy
  status?: 'active' | 'inactive' | 'pending';
  joinedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Notification Types
// ============================================
export type NotificationType =
  | 'payment_received'        // Aluno pagou pela plataforma
  | 'payment_pending'         // Lembrete de pagamento pendente
  | 'payment_overdue'         // Pagamento atrasado
  | 'payment_due_soon'        // Pagamento vence em breve
  | 'order_paid'              // Pedido da loja pago
  | 'withdrawal_completed'    // Saque concluído
  | 'withdrawal_failed'       // Saque falhou
  | 'graduation_eligible'     // Aluno elegível para graduação
  | 'graduation_near'         // Aluno próximo da graduação automática
  | 'new_student_linked'      // Novo aluno vinculou conta
  | 'student_milestone'       // Aluno atingiu milestone de presença
  | 'competition_reminder'    // Lembrete de competição
  | 'system'                  // Notificação do sistema
  | 'custom';                 // Personalizada

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  academyId: string;                    // Academy context

  // Target
  userId: string;                       // Target user Firebase UID
  type: NotificationType;
  priority: NotificationPriority;

  // Content
  title: string;
  message: string;
  imageUrl?: string;

  // Action
  actionUrl?: string;                   // Deep link within app
  actionLabel?: string;                 // Button text

  // Related entities
  studentId?: string;
  financialId?: string;
  competitionId?: string;

  // Status
  read: boolean;
  readAt?: Date;

  // Delivery
  channels: ('in_app' | 'push' | 'email')[];
  sentVia?: ('in_app' | 'push' | 'email')[];

  // Metadata
  createdAt: Date;
  expiresAt?: Date;                     // Auto-delete after this date
}

// ============================================
// Wallet & Transactions (AbacatePay)
// ============================================
export type TransactionType = 'payment' | 'withdrawal' | 'refund' | 'fee';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface WalletTransaction {
  id: string;
  academyId: string;

  // Transaction details
  type: TransactionType;
  amount: number;                       // In cents (BRL)
  status: TransactionStatus;

  // References
  financialId?: string;                 // Link to Financial record
  studentId?: string;
  studentName?: string;

  // AbacatePay data
  abacatePayTransactionId?: string;
  pixCode?: string;
  qrCodeUrl?: string;

  // For withdrawals
  withdrawalPixKey?: string;
  withdrawalPixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

  // Metadata
  description?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface AcademyWallet {
  academyId: string;

  // Balance (in cents)
  availableBalance: number;
  pendingBalance: number;
  totalReceived: number;
  totalWithdrawn: number;

  // Stats
  transactionCount: number;
  lastTransactionAt?: Date;

  updatedAt: Date;
}

// ============================================
// Extended Financial for AbacatePay
// ============================================
export interface FinancialPaymentLink {
  pixCode: string;
  qrCodeUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

// Extended Financial interface with payment link
export interface FinancialWithPayment extends Financial {
  paymentLink?: FinancialPaymentLink;
  abacatePayTransactionId?: string;
  paidViaAbacatePay?: boolean;
}

// ============================================
// Store Types
// ============================================
export type StoreProductCategory = 'uniform' | 'equipment' | 'accessory' | 'other';
export type StoreStockType = 'in_stock' | 'on_demand';
export type StoreOrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

// Store Product
export interface StoreProduct {
  id: string;
  academyId: string;
  name: string;
  description?: string;
  price: number; // in cents
  images: string[]; // URLs of images
  category: StoreProductCategory;
  stockType: StoreStockType;
  stockQuantity?: number; // only if stockType === 'in_stock'
  sizes?: string[]; // e.g., ['P', 'M', 'G', 'GG']
  colors?: string[]; // e.g., ['Branco', 'Azul', 'Preto']
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Store Order Item
export interface StoreOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // in cents
  size?: string;
  color?: string;
}

// Cart Item Input - Used when adding to cart (price not trusted from client)
export interface CartItemInput {
  productId: string;
  productName: string; // For display only, not trusted
  quantity: number;
  displayPrice: number; // For display only - NEVER used for order calculation
  size?: string;
  color?: string;
}

// Store Order
export interface StoreOrder {
  id: string;
  academyId: string;
  studentId: string;
  studentName: string;
  items: StoreOrderItem[];
  totalAmount: number; // in cents
  status: StoreOrderStatus;
  paymentMethod?: 'pix';
  abacatePayTransactionId?: string;
  pixCode?: string;
  qrCodeUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  deliveredAt?: Date;
}

// Status flow:
// pending_payment → paid (webhook) → preparing (admin) → ready (admin) → delivered (admin)
//                                  ↘ cancelled (only admin can cancel after payment)

// Store Category Labels
export const STORE_CATEGORY_LABELS: Record<StoreProductCategory, string> = {
  uniform: 'Uniforme',
  equipment: 'Equipamento',
  accessory: 'Acessorio',
  other: 'Outros',
};

// Store Order Status Labels
export const STORE_ORDER_STATUS_LABELS: Record<StoreOrderStatus, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pago',
  preparing: 'Em Preparacao',
  ready: 'Pronto para Retirada',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// Store Order Status Colors
export const STORE_ORDER_STATUS_COLORS: Record<StoreOrderStatus, 'default' | 'warning' | 'success' | 'info' | 'primary' | 'error'> = {
  pending_payment: 'warning',
  paid: 'success',
  preparing: 'info',
  ready: 'primary',
  delivered: 'success',
  cancelled: 'error',
};

// ============================================
// Student Check-in Types
// ============================================
export type CheckinStatus = 'pending' | 'confirmed' | 'rejected';

export interface Checkin {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  scheduleDate: Date;                   // Training date (normalized to noon)
  scheduleDayOfWeek: number;            // 0-6 (Sunday-Saturday)
  scheduleStartTime: string;            // "HH:mm"
  scheduleEndTime: string;              // "HH:mm"
  checkinTime: Date;                    // When check-in was made
  status: CheckinStatus;

  // Confirmation info (when admin/instructor confirms)
  confirmedBy?: string;                 // User ID who confirmed
  confirmedByName?: string;
  confirmedAt?: Date;

  createdAt: Date;
}
