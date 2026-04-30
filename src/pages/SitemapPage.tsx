/**
 * HTML sitemap page listing all public pages and supported languages.
 *
 * Uses the shared `AppSitemapPage` component from `@sudobility/building_blocks`
 * for consistent sitemap layout across the Sudobility ecosystem.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { SUPPORTED_LANGUAGES } from '@sudobility/svgr_lib';
import { trackPageView } from '../analytics';
import { AppSitemapPage } from '@sudobility/building_blocks';
import type {
  SitemapPageText,
  SitemapSection,
  LanguageOption,
  LinkComponentProps,
} from '@sudobility/building_blocks';
import SEOHead from '../components/SEOHead';

/** Flag emoji for each language code. */
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '\u{1F1FA}\u{1F1F8}',
  ar: '\u{1F1F8}\u{1F1E6}',
  de: '\u{1F1E9}\u{1F1EA}',
  es: '\u{1F1EA}\u{1F1F8}',
  fr: '\u{1F1EB}\u{1F1F7}',
  it: '\u{1F1EE}\u{1F1F9}',
  ja: '\u{1F1EF}\u{1F1F5}',
  ko: '\u{1F1F0}\u{1F1F7}',
  pt: '\u{1F1E7}\u{1F1F7}',
  ru: '\u{1F1F7}\u{1F1FA}',
  sv: '\u{1F1F8}\u{1F1EA}',
  th: '\u{1F1F9}\u{1F1ED}',
  uk: '\u{1F1FA}\u{1F1E6}',
  vi: '\u{1F1FB}\u{1F1F3}',
  zh: '\u{1F1E8}\u{1F1F3}',
  'zh-hant': '\u{1F1F9}\u{1F1FC}',
};

function LinkWrapper({
  href,
  className,
  children,
  language,
}: LinkComponentProps & { language?: string }) {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const targetLang = language || lang || 'en';
  const path = `/${targetLang}${href === '/' ? '' : href}`;

  return (
    <a
      href={path}
      className={className}
      onClick={e => {
        e.preventDefault();
        navigate(path);
      }}
    >
      {children}
    </a>
  );
}

export default function SitemapPage() {
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView('/sitemap', 'Sitemap');
  }, []);

  const sections: SitemapSection[] = [
    {
      title: t('sitemap.sections.main'),
      icon: 'home',
      links: [
        {
          path: '/',
          label: t('sitemap.links.convert'),
          description: t('sitemap.descriptions.convert'),
        },
        {
          path: '/use-cases',
          label: t('sitemap.links.useCases'),
          description: t('sitemap.descriptions.useCases'),
        },
        {
          path: '/tutorials',
          label: t('sitemap.links.tutorials'),
          description: t('sitemap.descriptions.tutorials'),
        },
        {
          path: '/credits',
          label: t('sitemap.links.credits'),
          description: t('sitemap.descriptions.credits'),
        },
      ],
    },
    {
      title: t('sitemap.sections.legal'),
      icon: 'document',
      links: [
        {
          path: '/privacy',
          label: t('sitemap.links.privacy'),
          description: t('sitemap.descriptions.privacy'),
        },
        {
          path: '/terms',
          label: t('sitemap.links.terms'),
          description: t('sitemap.descriptions.terms'),
        },
      ],
    },
  ];

  const languageOptions: LanguageOption[] = SUPPORTED_LANGUAGES.map(lang => ({
    code: lang.code,
    name: lang.nativeName,
    flag: LANGUAGE_FLAGS[lang.code] || '',
  }));

  const text: SitemapPageText = {
    title: t('sitemap.title'),
    subtitle: t('sitemap.subtitle'),
    languagesSectionTitle: t('sitemap.languages'),
    languagesDescription: t('sitemap.languagesDescription'),
    quickLinksTitle: t('sitemap.quickLinks'),
  };

  return (
    <>
      <SEOHead
        title={t('seo.sitemap.title')}
        description={t('seo.sitemap.description')}
      />
      <AppSitemapPage
        text={text}
        sections={sections}
        languages={languageOptions}
        LinkComponent={LinkWrapper}
      />
    </>
  );
}
