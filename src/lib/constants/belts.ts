import { BeltColor, KidsBeltColor } from '@/types';

// ============================================
// Belt Colors (Hex values)
// ============================================
export const BELT_COLORS: Record<string, string> = {
  // Adult belts
  white: '#F5F5F5',
  blue: '#1E40AF',
  purple: '#7C3AED',
  brown: '#78350F',
  black: '#171717',
  // Kids belts (base colors)
  grey: '#6B7280',
  yellow: '#EAB308',
  orange: '#EA580C',
  green: '#16A34A',
};

// ============================================
// Belt Labels (Portuguese)
// ============================================
export const BELT_LABELS: Record<string, string> = {
  // Adult belts
  white: 'Branca',
  blue: 'Azul',
  purple: 'Roxa',
  brown: 'Marrom',
  black: 'Preta',
  // Kids belts - plain
  grey: 'Cinza',
  yellow: 'Amarela',
  orange: 'Laranja',
  green: 'Verde',
  // Kids belts - with white stripe
  'grey-white': 'Cinza/Branca',
  'yellow-white': 'Amarela/Branca',
  'orange-white': 'Laranja/Branca',
  'green-white': 'Verde/Branca',
  // Kids belts - with black stripe
  'grey-black': 'Cinza/Preta',
  'yellow-black': 'Amarela/Preta',
  'orange-black': 'Laranja/Preta',
  'green-black': 'Verde/Preta',
};

// ============================================
// Belt Options for Selects
// ============================================
export interface BeltOption {
  value: string;
  label: string;
  color: string;
  stripeColor?: 'white' | 'black';
  group?: 'adult' | 'plain' | 'white-stripe' | 'black-stripe';
}

// Adult belt options
export const ADULT_BELT_OPTIONS: BeltOption[] = [
  { value: 'white', label: 'Branca', color: '#F5F5F5', group: 'adult' },
  { value: 'blue', label: 'Azul', color: '#1E40AF', group: 'adult' },
  { value: 'purple', label: 'Roxa', color: '#7C3AED', group: 'adult' },
  { value: 'brown', label: 'Marrom', color: '#78350F', group: 'adult' },
  { value: 'black', label: 'Preta', color: '#171717', group: 'adult' },
];

// Kids belt options (organized by type)
export const KIDS_BELT_OPTIONS: BeltOption[] = [
  // Plain belts
  { value: 'white', label: 'Branca', color: '#F5F5F5', group: 'plain' },
  { value: 'grey', label: 'Cinza', color: '#6B7280', group: 'plain' },
  { value: 'yellow', label: 'Amarela', color: '#EAB308', group: 'plain' },
  { value: 'orange', label: 'Laranja', color: '#EA580C', group: 'plain' },
  { value: 'green', label: 'Verde', color: '#16A34A', group: 'plain' },
  // White stripe belts
  { value: 'grey-white', label: 'Cinza/Branca', color: '#6B7280', stripeColor: 'white', group: 'white-stripe' },
  { value: 'yellow-white', label: 'Amarela/Branca', color: '#EAB308', stripeColor: 'white', group: 'white-stripe' },
  { value: 'orange-white', label: 'Laranja/Branca', color: '#EA580C', stripeColor: 'white', group: 'white-stripe' },
  { value: 'green-white', label: 'Verde/Branca', color: '#16A34A', stripeColor: 'white', group: 'white-stripe' },
  // Black stripe belts
  { value: 'grey-black', label: 'Cinza/Preta', color: '#6B7280', stripeColor: 'black', group: 'black-stripe' },
  { value: 'yellow-black', label: 'Amarela/Preta', color: '#EAB308', stripeColor: 'black', group: 'black-stripe' },
  { value: 'orange-black', label: 'Laranja/Preta', color: '#EA580C', stripeColor: 'black', group: 'black-stripe' },
  { value: 'green-black', label: 'Verde/Preta', color: '#16A34A', stripeColor: 'black', group: 'black-stripe' },
];

// All belt options combined
export const ALL_BELT_OPTIONS: BeltOption[] = [
  ...ADULT_BELT_OPTIONS,
  ...KIDS_BELT_OPTIONS.filter(b => b.value !== 'white'), // Avoid duplicate white
];

// ============================================
// Group Labels for Select Dropdown
// ============================================
export const BELT_GROUP_LABELS = {
  adult: 'Adulto',
  plain: 'Lisas',
  'white-stripe': 'Com Listra Branca',
  'black-stripe': 'Com Listra Preta',
} as const;

// ============================================
// Stripe Options
// ============================================
export const STRIPE_OPTIONS = [
  { value: 0, label: 'Sem graus' },
  { value: 1, label: '1 grau' },
  { value: 2, label: '2 graus' },
  { value: 3, label: '3 graus' },
  { value: 4, label: '4 graus' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Get belt color by belt value
 */
export function getBeltColor(belt: string): string {
  // For striped belts, get the base color
  const baseBelt = belt.split('-')[0];
  return BELT_COLORS[baseBelt] || BELT_COLORS.white;
}

/**
 * Get belt label by belt value
 */
export function getBeltLabel(belt: string): string {
  return BELT_LABELS[belt] || belt;
}

/**
 * Check if belt has white stripe
 */
export function hasWhiteStripe(belt: string): boolean {
  return belt.endsWith('-white');
}

/**
 * Check if belt has black stripe
 */
export function hasBlackStripe(belt: string): boolean {
  return belt.endsWith('-black');
}

/**
 * Get stripe color for belt
 */
export function getStripeColor(belt: string): 'white' | 'black' | null {
  if (hasWhiteStripe(belt)) return 'white';
  if (hasBlackStripe(belt)) return 'black';
  return null;
}

/**
 * Get text color for belt (for contrast)
 */
export function getBeltTextColor(belt: string): string {
  const lightBelts = ['white', 'yellow', 'yellow-white', 'yellow-black'];
  return lightBelts.includes(belt) ? '#171717' : '#FFFFFF';
}

/**
 * Get belt options by category
 */
export function getBeltOptionsByCategory(category: 'kids' | 'adult'): BeltOption[] {
  return category === 'kids' ? KIDS_BELT_OPTIONS : ADULT_BELT_OPTIONS;
}

/**
 * Group belt options for dropdown display
 */
export function getGroupedBeltOptions(category: 'kids' | 'adult'): Record<string, BeltOption[]> {
  const options = getBeltOptionsByCategory(category);

  return options.reduce((groups, option) => {
    const group = option.group || 'other';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(option);
    return groups;
  }, {} as Record<string, BeltOption[]>);
}
