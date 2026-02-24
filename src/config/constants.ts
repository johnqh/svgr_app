/**
 * Application-wide constants derived from environment variables with
 * sensible defaults from `@sudobility/svgr_lib`.
 *
 * Environment variables must be prefixed with `VITE_` to be available
 * in the Vite client bundle.
 */

import { APP_NAME as DEFAULT_APP_NAME, APP_DOMAIN as DEFAULT_APP_DOMAIN, DEFAULT_API_URL, COMPANY_NAME } from '@sudobility/svgr_lib';

/** Base URL for the SVGR conversion API. Overridable via `VITE_API_URL`. */
export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

/** Display name of the application. Overridable via `VITE_APP_NAME`. */
export const APP_NAME = import.meta.env.VITE_APP_NAME || DEFAULT_APP_NAME;

/** Primary domain used for SEO canonical URLs. Overridable via `VITE_APP_DOMAIN`. */
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || DEFAULT_APP_DOMAIN;

/** Date when the privacy policy and terms of service were last updated. */
export const LAST_UPDATED_DATE = '2025-02-14';

export { COMPANY_NAME };
