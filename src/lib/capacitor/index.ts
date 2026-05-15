// Barrel re-exports for Capacitor helpers.
// Always import from '@/lib/capacitor' so platform checks stay in one place.
export {
  configureStatusBar,
  hideStatusBar,
  showStatusBar,
  type StatusBarTheme,
} from './status-bar';

export {
  hapticImpact,
  hapticNotification,
  hapticSelection,
  type HapticImpactStyle,
  type HapticNotificationType,
} from './haptics';
