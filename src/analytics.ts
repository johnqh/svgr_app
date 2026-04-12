import { getAnalyticsService } from '@sudobility/di';

function getAnalytics() {
  try {
    return getAnalyticsService();
  } catch {
    return null;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  getAnalytics()?.trackEvent(eventName, params);
}

export function trackButtonClick(buttonName: string, params?: Record<string, unknown>) {
  getAnalytics()?.trackButtonClick(buttonName, params);
}

export function trackError(errorMessage: string, errorCode?: string) {
  getAnalytics()?.trackError(errorMessage, errorCode);
}

export function trackPageView(pagePath: string, pageTitle?: string) {
  getAnalytics()?.trackPageView(pagePath, pageTitle);
}
