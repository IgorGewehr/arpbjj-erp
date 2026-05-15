/**
 * Haptic feedback helpers for Capacitor (iOS / Android).
 *
 * On web (or any non-native platform) every call is a no-op, so these helpers
 * are safe to invoke from any client component without environment checks.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

const IMPACT_MAP: Record<HapticImpactStyle, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

const NOTIFICATION_MAP: Record<HapticNotificationType, NotificationType> = {
  success: NotificationType.Success,
  warning: NotificationType.Warning,
  error: NotificationType.Error,
};

/**
 * Trigger a physical impact haptic. Use for taps, toggles, and confirmations.
 *
 * - 'light'  -> small confirmations (toggle, tab change)
 * - 'medium' -> primary actions (form submit, refresh)
 * - 'heavy'  -> destructive actions (delete) or strong confirmations
 */
export async function hapticImpact(style: HapticImpactStyle = 'medium'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: IMPACT_MAP[style] });
  } catch {
    // Haptics may be unavailable on the device — ignore silently.
  }
}

/**
 * Trigger a notification-style haptic (iOS Taptic Engine notification).
 * Use after async operations complete to convey success/warning/error.
 */
export async function hapticNotification(type: HapticNotificationType): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NOTIFICATION_MAP[type] });
  } catch {
    // ignore
  }
}

/** Short selection tick (e.g. picker scrubbing, slider step). */
export async function hapticSelection(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch {
    // ignore
  }
}
