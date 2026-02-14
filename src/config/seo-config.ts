import type { SEOConfig } from "@sudobility/seo_lib";
import { APP_NAME, APP_DOMAIN } from "./constants";

export const seoConfig: SEOConfig = {
  appName: APP_NAME,
  baseUrl: `https://${APP_DOMAIN}`,
  defaultDescription:
    "Convert raster images (PNG, JPG, WEBP) to scalable vector graphics (SVG). Ideal for AI-generated logos and designs.",
  defaultOgImage: `https://${APP_DOMAIN}/og-image.png`,
};
