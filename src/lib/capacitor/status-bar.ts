/**
 * StatusBar configuration helper for Capacitor (iOS / Android).
 *
 * On web (when not running inside the Capacitor native shell) every call is a
 * no-op so this module is safe to import from any client component.
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type StatusBarTheme = 'light' | 'dark';

/**
 * Apply a status-bar style + background color matching the current theme.
 *
 * Note on Style mapping (Capacitor's API is the inverse of what you'd expect):
 *   - Style.Light  -> light TEXT (use on dark backgrounds)
 *   - Style.Dark   -> dark  TEXT (use on light backgrounds)
 *
 * So when the app theme is 'dark' we want light icons (Style.Light) and a
 * dark background, and vice versa.
 */
export async function configureStatusBar(theme: StatusBarTheme): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Light : Style.Dark,
    });
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#000000' : '#ffffff',
    });
  } catch (e) {
    // Plugin may be unavailable on some platforms (e.g. iOS doesn't support
    // setBackgroundColor). We log and continue — status bar config is
    // non-critical UI polish.
    console.warn('[capacitor/status-bar] configureStatusBar failed', e);
  }
}

/** Hide the status bar entirely (useful for splash screens / fullscreen views). */
export async function hideStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.hide();
  } catch (e) {
    console.warn('[capacitor/status-bar] hideStatusBar failed', e);
  }
}

/** Show the status bar (counterpart to hideStatusBar). */
export async function showStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.show();
  } catch (e) {
    console.warn('[capacitor/status-bar] showStatusBar failed', e);
  }
}
