import { APP_NAME, APP_DOMAIN } from './constants';
import { supportedLanguages } from '../i18n';

export const SEO_CONFIG = {
  appName: APP_NAME,
  appDomain: APP_DOMAIN,
  baseUrl: `https://${APP_DOMAIN}`,
  defaultOgImage: `https://${APP_DOMAIN}/og-image.png`,
  twitterHandle: undefined,
  supportedLanguages,
  defaultLanguage: 'en' as const,
} as const;

/**
 * Returns true when the current hostname indicates a non-production environment
 * (localhost, preview deployments, staging). SEOHead uses this to auto-set
 * `noindex` so dev/staging pages are never accidentally indexed.
 */
export function isNonProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('preview') ||
    hostname.includes('staging') ||
    hostname.includes('dev') ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.vercel.app')
  );
}
