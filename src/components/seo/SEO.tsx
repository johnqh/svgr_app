import { SEO as SeoLibSEO } from "@sudobility/seo_lib";
import { useTranslation } from "react-i18next";
import { supportedLanguages } from "../../i18n";
import { seoConfig } from "../../config/seo-config";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  noIndex?: boolean;
  structuredData?: object | object[];
}

const LANGUAGE_HREFLANG_MAP: Record<string, string> = {
  en: "en",
  ar: "ar",
  de: "de",
  es: "es",
  fr: "fr",
  it: "it",
  ja: "ja",
  ko: "ko",
  pt: "pt",
  ru: "ru",
  sv: "sv",
  th: "th",
  uk: "uk",
  vi: "vi",
  zh: "zh-Hans",
  "zh-hant": "zh-Hant",
};

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
    supportedLanguages.forEach((lang) => {
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
  supportedLanguages
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
