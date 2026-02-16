import { getFirebaseService } from '@sudobility/di';

export function trackButtonClick(buttonName: string, params?: Record<string, unknown>) {
  try {
    getFirebaseService().analytics.logEvent('button_click', {
      button_name: buttonName,
      ...params,
    });
  } catch {
    // Analytics not available
  }
}
