/**
 * SEO configuration for meta tags, Open Graph, and hreflang generation.
 *
 * Used by the `SEO` component to produce consistent metadata across
 * all language-prefixed routes. The default description is in English
 * and serves as the fallback when no page-specific description is provided.
 */

import type { SEOConfig } from "@sudobility/seo_lib";
import { APP_NAME, APP_DOMAIN } from "./constants";

/** Global SEO configuration shared across all pages. */
export const seoConfig: SEOConfig = {
  appName: APP_NAME,
  baseUrl: `https://${APP_DOMAIN}`,
  defaultDescription:
    "Convert raster images (PNG, JPG, WEBP) to scalable vector graphics (SVG). Ideal for AI-generated logos and designs.",
  defaultOgImage: `https://${APP_DOMAIN}/og-image.png`,
};
