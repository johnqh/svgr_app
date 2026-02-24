/**
 * SEO wrapper component that generates meta tags, hreflang links, and
 * Open Graph metadata for all language-prefixed routes.
 *
 * Automatically prepends the current language prefix to canonical URLs
 * and generates hreflang alternate links for all 16 supported languages
 * plus an `x-default` entry pointing to `/en`.
 *
 * Delegates actual `<head>` rendering to `@sudobility/seo_lib`.
 */

import { SEO as SeoLibSEO } from "@sudobility/seo_lib";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGE_CODES, LANGUAGE_HREFLANG_MAP } from "@sudobility/svgr_lib";
import { seoConfig } from "../../config/seo-config";

interface SEOProps {
  /** Page-specific title appended to the app name. */
  title?: string;
  /** Meta description for search engines. Falls back to seoConfig.defaultDescription. */
  description?: string;
  /** Comma-separated keywords for the meta keywords tag. */
  keywords?: string;
  /** Canonical path without language prefix (e.g., "/", "/credits"). */
  canonical?: string;
  /** Open Graph content type. */
  ogType?: "website" | "article";
  /** Open Graph image URL override. */
  ogImage?: string;
  /** If true, adds a noindex meta tag to prevent search engine indexing. */
  noIndex?: boolean;
  /** JSON-LD structured data for rich search results. */
  structuredData?: object | object[];
}

export default function SEO({
  title,
  description,
  keywords,
  canonical,
  ogType = "website",
  ogImage,
  noIndex = false,
  structuredData,
}: SEOProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  // Build canonical path with language prefix
  const canonicalPath = canonical
    ? `/${currentLang}${canonical === "/" ? "" : canonical.replace(/\/$/, "")}`
    : undefined;

  // Generate hreflang links for all supported languages
  const hreflangLinks: Array<{
    rel: string;
    href: string;
    [key: string]: string;
  }> = [];
  if (canonical) {
    const normalizedPath =
      canonical === "/" ? "" : canonical.replace(/\/$/, "");
    SUPPORTED_LANGUAGE_CODES.forEach((lang) => {
      hreflangLinks.push({
        rel: "alternate",
        hrefLang: LANGUAGE_HREFLANG_MAP[lang] || lang,
        href: `${seoConfig.baseUrl}/${lang}${normalizedPath}`,
      });
    });
    hreflangLinks.push({
      rel: "alternate",
      hrefLang: "x-default",
      href: `${seoConfig.baseUrl}/en${normalizedPath}`,
    });
  }

  // Locale meta tags
  const additionalMeta: Array<{
    name?: string;
    property?: string;
    content: string;
  }> = [
    { name: "content-language", content: currentLang },
    {
      property: "og:locale",
      content: currentLang === "en" ? "en_US" : currentLang,
    },
  ];
  SUPPORTED_LANGUAGE_CODES
    .filter((lang) => lang !== currentLang)
    .forEach((lang) => {
      additionalMeta.push({
        property: "og:locale:alternate",
        content: lang === "en" ? "en_US" : lang,
      });
    });

  return (
    <SeoLibSEO
      config={seoConfig}
      title={title}
      description={description}
      keywords={keywords}
      canonical={canonicalPath}
      ogType={ogType}
      ogImage={ogImage}
      noIndex={noIndex}
      structuredData={structuredData}
      links={hreflangLinks}
      meta={additionalMeta}
    />
  );
}
