// ============================================
// Sports Constants — Multi-Sport Support
// MarcusJJ / GraduaBJJ
// ============================================

export type SportId = 'bjj' | 'muaythai' | 'karate' | 'judo' | 'kickboxing' | 'boxing' | 'mma';
export type GradeSystem = 'belt' | 'armband' | 'none';

export interface GradeDefinition {
  id: string;           // e.g. 'blue', 'light-blue'
  label: string;        // e.g. 'Azul'
  color: string;        // hex primary
  tipColor?: string;    // hex for armband tips (Muay Thai)
  maxStripes: number;   // 0 = no stripes
  isBlackBelt?: boolean;
  danLevel?: number;
  kidsOnly?: boolean;
  adultOnly?: boolean;
}

export interface SportDefinition {
  id: SportId;
  label: string;        // 'Jiu-Jitsu Brasileiro'
  labelShort: string;   // 'BJJ'
  gradeSystem: GradeSystem;
  supportsKids: boolean;   // Kids variant with different grade colors (only BJJ)
  adultGrades: GradeDefinition[];
  kidsGrades?: GradeDefinition[];  // Only BJJ
  supportsStripes: boolean;
  icon: string;         // lucide icon name
}

// ============================================
// BJJ Adult Grades
// ============================================
const BJJ_ADULT_GRADES: GradeDefinition[] = [
  { id: 'white', label: 'Branca', color: '#F5F5F5', maxStripes: 4 },
  { id: 'blue', label: 'Azul', color: '#1E40AF', maxStripes: 4 },
  { id: 'purple', label: 'Roxa', color: '#7C3AED', maxStripes: 4 },
  { id: 'brown', label: 'Marrom', color: '#78350F', maxStripes: 4 },
  { id: 'black', label: 'Preta', color: '#171717', maxStripes: 4, isBlackBelt: true },
];

// ============================================
// BJJ Kids Grades
// ============================================
const BJJ_KIDS_GRADES: GradeDefinition[] = [
  { id: 'white', label: 'Branca', color: '#F5F5F5', maxStripes: 4, kidsOnly: true },
  { id: 'grey', label: 'Cinza', color: '#6B7280', maxStripes: 4, kidsOnly: true },
  { id: 'grey-white', label: 'Cinza/Branca', color: '#6B7280', maxStripes: 4, kidsOnly: true },
  { id: 'grey-black', label: 'Cinza/Preta', color: '#6B7280', maxStripes: 4, kidsOnly: true },
  { id: 'yellow', label: 'Amarela', color: '#EAB308', maxStripes: 4, kidsOnly: true },
  { id: 'yellow-white', label: 'Amarela/Branca', color: '#EAB308', maxStripes: 4, kidsOnly: true },
  { id: 'yellow-black', label: 'Amarela/Preta', color: '#EAB308', maxStripes: 4, kidsOnly: true },
  { id: 'orange', label: 'Laranja', color: '#EA580C', maxStripes: 4, kidsOnly: true },
  { id: 'orange-white', label: 'Laranja/Branca', color: '#EA580C', maxStripes: 4, kidsOnly: true },
  { id: 'orange-black', label: 'Laranja/Preta', color: '#EA580C', maxStripes: 4, kidsOnly: true },
  { id: 'green', label: 'Verde', color: '#16A34A', maxStripes: 4, kidsOnly: true },
  { id: 'green-white', label: 'Verde/Branca', color: '#16A34A', maxStripes: 4, kidsOnly: true },
  { id: 'green-black', label: 'Verde/Preta', color: '#16A34A', maxStripes: 4, kidsOnly: true },
];

// ============================================
// Sports Registry
// ============================================
export const SPORTS: Record<SportId, SportDefinition> = {
  bjj: {
    id: 'bjj',
    label: 'Jiu-Jitsu Brasileiro',
    labelShort: 'BJJ',
    gradeSystem: 'belt',
    supportsKids: true,
    supportsStripes: true,
    adultGrades: BJJ_ADULT_GRADES,
    kidsGrades: BJJ_KIDS_GRADES,
    icon: 'Shield',
  },
  muaythai: {
    id: 'muaythai',
    label: 'Muay Thai',
    labelShort: 'MT',
    gradeSystem: 'armband',
    supportsKids: false,
    supportsStripes: true,
    adultGrades: [
      { id: 'white', label: 'Branca', color: '#F5F5F5', maxStripes: 1 },
      { id: 'red', label: 'Vermelha', color: '#DC2626', maxStripes: 1 },
      { id: 'light-blue', label: 'Azul Clara', color: '#60A5FA', maxStripes: 1 },
      { id: 'dark-blue', label: 'Azul Escura', color: '#1E40AF', maxStripes: 1 },
      { id: 'black', label: 'Preta', color: '#171717', maxStripes: 2, isBlackBelt: true },
    ],
    icon: 'Zap',
  },
  karate: {
    id: 'karate',
    label: 'Karatê',
    labelShort: 'KRT',
    gradeSystem: 'belt',
    supportsKids: false,
    supportsStripes: true,
    adultGrades: [
      { id: 'white', label: 'Branca', color: '#F5F5F5', maxStripes: 1 },
      { id: 'yellow', label: 'Amarela', color: '#EAB308', maxStripes: 1 },
      { id: 'orange', label: 'Laranja', color: '#EA580C', maxStripes: 1 },
      { id: 'green', label: 'Verde', color: '#16A34A', maxStripes: 1 },
      { id: 'blue', label: 'Azul', color: '#1E40AF', maxStripes: 1 },
      { id: 'purple', label: 'Roxa', color: '#7C3AED', maxStripes: 1 },
      { id: 'brown', label: 'Marrom', color: '#78350F', maxStripes: 1 },
      { id: 'black', label: 'Preta', color: '#171717', maxStripes: 4, isBlackBelt: true },
    ],
    icon: 'Shield',
  },
  judo: {
    id: 'judo',
    label: 'Judô',
    labelShort: 'JDO',
    gradeSystem: 'belt',
    supportsKids: false,
    supportsStripes: false,
    adultGrades: [
      { id: 'white', label: 'Branca', color: '#F5F5F5', maxStripes: 0 },
      { id: 'grey', label: 'Cinza', color: '#6B7280', maxStripes: 0 },
      { id: 'blue', label: 'Azul', color: '#1E40AF', maxStripes: 0 },
      { id: 'yellow', label: 'Amarela', color: '#EAB308', maxStripes: 0 },
      { id: 'orange', label: 'Laranja', color: '#EA580C', maxStripes: 0 },
      { id: 'green', label: 'Verde', color: '#16A34A', maxStripes: 0 },
      { id: 'purple', label: 'Roxa', color: '#7C3AED', maxStripes: 0 },
      { id: 'brown', label: 'Marrom', color: '#78350F', maxStripes: 0 },
      { id: 'black', label: 'Preta', color: '#171717', maxStripes: 0, isBlackBelt: true },
      { id: 'coral', label: 'Coral', color: '#E11D48', maxStripes: 0 },
    ],
    icon: 'Users',
  },
  kickboxing: {
    id: 'kickboxing',
    label: 'Kickboxing',
    labelShort: 'KB',
    gradeSystem: 'belt',
    supportsKids: false,
    supportsStripes: true,
    adultGrades: [
      { id: 'white', label: 'Branca', color: '#F5F5F5', maxStripes: 1 },
      { id: 'yellow', label: 'Amarela', color: '#EAB308', maxStripes: 1 },
      { id: 'orange', label: 'Laranja', color: '#EA580C', maxStripes: 1 },
      { id: 'green', label: 'Verde', color: '#16A34A', maxStripes: 1 },
      { id: 'blue', label: 'Azul', color: '#1E40AF', maxStripes: 1 },
      { id: 'brown', label: 'Marrom', color: '#78350F', maxStripes: 1 },
      { id: 'black', label: 'Preta', color: '#171717', maxStripes: 4, isBlackBelt: true },
    ],
    icon: 'Swords',
  },
  boxing: {
    id: 'boxing',
    label: 'Boxe',
    labelShort: 'BOX',
    gradeSystem: 'none',
    supportsKids: false,
    supportsStripes: false,
    adultGrades: [],
    icon: 'CircleDot',
  },
  mma: {
    id: 'mma',
    label: 'MMA',
    labelShort: 'MMA',
    gradeSystem: 'none',
    supportsKids: false,
    supportsStripes: false,
    adultGrades: [],
    icon: 'Swords',
  },
};

// ============================================
// Ordered list for selects
// ============================================
export const SPORT_OPTIONS: { value: SportId; label: string; labelShort: string }[] = [
  { value: 'bjj', label: 'Jiu-Jitsu Brasileiro', labelShort: 'BJJ' },
  { value: 'muaythai', label: 'Muay Thai', labelShort: 'MT' },
  { value: 'karate', label: 'Karatê', labelShort: 'KRT' },
  { value: 'judo', label: 'Judô', labelShort: 'JDO' },
  { value: 'kickboxing', label: 'Kickboxing', labelShort: 'KB' },
  { value: 'boxing', label: 'Boxe', labelShort: 'BOX' },
  { value: 'mma', label: 'MMA', labelShort: 'MMA' },
];

// ============================================
// Helper: Get sport definition
// ============================================
export function getSport(sportId: SportId): SportDefinition {
  return SPORTS[sportId];
}

// ============================================
// Helper: Get grades for a sport (respects kids)
// ============================================
export function getGradesForSport(
  sportId: SportId,
  category: 'kids' | 'adult' = 'adult'
): GradeDefinition[] {
  const sport = SPORTS[sportId];
  if (category === 'kids' && sport.supportsKids && sport.kidsGrades) {
    return sport.kidsGrades;
  }
  return sport.adultGrades;
}

// ============================================
// Helper: Get grade label for a sport
// ============================================
export function getGradeLabel(sportId: SportId, gradeId: string): string {
  const sport = SPORTS[sportId];
  const allGrades = [...sport.adultGrades, ...(sport.kidsGrades || [])];
  return allGrades.find(g => g.id === gradeId)?.label ?? gradeId;
}

// ============================================
// Helper: Get grade color for a sport
// ============================================
export function getGradeColor(sportId: SportId, gradeId: string): string {
  const sport = SPORTS[sportId];
  const allGrades = [...sport.adultGrades, ...(sport.kidsGrades || [])];
  const grade = allGrades.find(g => g.id === gradeId);
  // Fallback: extract base color for compound grade ids (e.g. 'grey-white')
  if (!grade) {
    const basePart = gradeId.split('-')[0];
    const baseGrade = allGrades.find(g => g.id === basePart);
    return baseGrade?.color ?? '#F5F5F5';
  }
  return grade.color;
}
