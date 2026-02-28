/**
 * Application-wide constants derived from environment variables with
 * sensible defaults from `@sudobility/svgr_lib`.
 *
 * Environment variables must be prefixed with `VITE_` to be available
 * in the Vite client bundle.
 */

import { APP_NAME as DEFAULT_APP_NAME, APP_DOMAIN as DEFAULT_APP_DOMAIN, DEFAULT_API_URL, COMPANY_NAME as DEFAULT_COMPANY_NAME } from '@sudobility/svgr_lib';

/** Base URL for the SVGR conversion API. Overridable via `VITE_API_URL`. */
export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

/** Display name of the application. Overridable via `VITE_APP_NAME`. */
export const APP_NAME = import.meta.env.VITE_APP_NAME || DEFAULT_APP_NAME;

/** Primary domain used for SEO canonical URLs. Overridable via `VITE_APP_DOMAIN`. */
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || DEFAULT_APP_DOMAIN;

/** Name of the company that publishes this application. Overridable via `VITE_COMPANY_NAME`. */
export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || DEFAULT_COMPANY_NAME;

/** Primary company website URL, derived from `APP_DOMAIN`. */
export const COMPANY_URL = `https://${APP_DOMAIN}`;

/** Privacy contact email address, derived from `APP_DOMAIN`. */
export const PRIVACY_EMAIL = `privacy@${APP_DOMAIN}`;

/** Legal contact email address, derived from `APP_DOMAIN`. */
export const LEGAL_EMAIL = `legal@${APP_DOMAIN}`;

/** Date when the privacy policy and terms of service were last updated. */
export const LAST_UPDATED_DATE = '2025-02-14';
