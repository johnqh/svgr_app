/**
 * SEO configuration for SVGR.
 *
 * Used by generate-seo-assets.mjs from @johnqh/workflows to produce
 * per-route localized index.html files, sitemap.xml, and robots.txt.
 */

const APP_NAME = process.env.VITE_APP_NAME || 'SVGR';

export default {
  supportedLanguages: [
    'en', 'ar', 'de', 'es', 'fr', 'it', 'ja', 'ko',
    'pt', 'ru', 'sv', 'th', 'uk', 'vi', 'zh', 'zh-hant',
  ],

  languageHreflangMap: {
    en: 'en',
    ar: 'ar',
    de: 'de',
    es: 'es',
    fr: 'fr',
    it: 'it',
    ja: 'ja',
    ko: 'ko',
    pt: 'pt',
    ru: 'ru',
    sv: 'sv',
    th: 'th',
    uk: 'uk',
    vi: 'vi',
    zh: 'zh-Hans',
    'zh-hant': 'zh-Hant',
  },

  primaryDomain: 'svgr.app',
  appName: APP_NAME,
  appDomain: process.env.VITE_APP_DOMAIN || 'svgr.app',
  robotsDisallowPaths: ['/*/history', '/*/credits', '/*/login'],

  routes: [
    {
      key: 'home',
      path: '',
      namespace: 'content',
      priority: '1.0',
      changefreq: 'weekly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.home.title,
        description: locale.content.seo.home.description,
        keywords: locale.content.seo.home.keywords,
      }),
    },
    {
      key: 'split',
      path: '/split',
      namespace: 'content',
      priority: '0.8',
      changefreq: 'weekly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.home.title,
        description: locale.content.seo.home.description,
        keywords: locale.content.seo.home.keywords,
      }),
    },
    {
      key: 'use-cases',
      path: '/use-cases',
      namespace: 'content',
      priority: '0.8',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.useCases.title,
        description: locale.content.seo.useCases.description,
        keywords: locale.content.seo.useCases.keywords,
      }),
    },
    {
      key: 'tutorials',
      path: '/tutorials',
      namespace: 'content',
      priority: '0.8',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.tutorials.index.title,
        description: locale.content.seo.tutorials.index.description,
        keywords: locale.content.seo.tutorials.index.keywords,
      }),
    },
    {
      key: 'tutorials-ai-logos-to-svg',
      path: '/tutorials/ai-logos-to-svg',
      namespace: 'content',
      priority: '0.7',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.tutorials['ai-logos-to-svg'].title,
        description: locale.content.seo.tutorials['ai-logos-to-svg'].description,
        keywords: locale.content.seo.tutorials['ai-logos-to-svg'].keywords,
      }),
    },
    {
      key: 'tutorials-ai-posters-to-svg',
      path: '/tutorials/ai-posters-to-svg',
      namespace: 'content',
      priority: '0.7',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.tutorials['ai-posters-to-svg'].title,
        description: locale.content.seo.tutorials['ai-posters-to-svg'].description,
        keywords: locale.content.seo.tutorials['ai-posters-to-svg'].keywords,
      }),
    },
    {
      key: 'tutorials-qr-code-to-svg',
      path: '/tutorials/qr-code-to-svg',
      namespace: 'content',
      priority: '0.7',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.tutorials['qr-code-to-svg'].title,
        description: locale.content.seo.tutorials['qr-code-to-svg'].description,
        keywords: locale.content.seo.tutorials['qr-code-to-svg'].keywords,
      }),
    },
    {
      key: 'tutorials-photo-to-svg',
      path: '/tutorials/photo-to-svg',
      namespace: 'content',
      priority: '0.7',
      changefreq: 'monthly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.tutorials['photo-to-svg'].title,
        description: locale.content.seo.tutorials['photo-to-svg'].description,
        keywords: locale.content.seo.tutorials['photo-to-svg'].keywords,
      }),
    },
    {
      key: 'history',
      path: '/history',
      namespace: 'content',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: () => ({
        title: `History - ${APP_NAME}`,
        description: `View your conversion history on ${APP_NAME}.`,
        keywords: [],
      }),
    },
    {
      key: 'credits',
      path: '/credits',
      namespace: 'content',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: locale => ({
        title: locale.content.seo.credits.title,
        description: locale.content.seo.credits.description,
        keywords: locale.content.seo.credits.keywords,
      }),
    },
    {
      key: 'login',
      path: '/login',
      namespace: 'content',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: () => ({
        title: `Login - ${APP_NAME}`,
        description: `Log in to ${APP_NAME}.`,
        keywords: [],
      }),
    },
    {
      key: 'privacy',
      path: '/privacy',
      namespace: 'content',
      priority: '0.5',
      changefreq: 'yearly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.privacy.title,
        description: locale.content.seo.privacy.description,
        keywords: [],
      }),
    },
    {
      key: 'terms',
      path: '/terms',
      namespace: 'content',
      priority: '0.5',
      changefreq: 'yearly',
      indexable: true,
      meta: locale => ({
        title: locale.content.seo.terms.title,
        description: locale.content.seo.terms.description,
        keywords: [],
      }),
    },
    {
      key: 'sitemap',
      path: '/sitemap',
      namespace: 'content',
      priority: '0.1',
      changefreq: 'monthly',
      indexable: false,
      meta: locale => ({
        title: locale.content.seo.sitemap.title,
        description: locale.content.seo.sitemap.description,
        keywords: [],
      }),
    },
  ],
};
