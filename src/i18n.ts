import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { SUPPORTED_LANGUAGE_CODES, DEFAULT_LANGUAGE } from '@sudobility/svgr_lib';

const NAMESPACES = ['auth', 'content', 'conversion', 'howto', 'privacy', 'terms'] as const;
const DEFAULT_NAMESPACE = 'content';

export const supportedLanguages = SUPPORTED_LANGUAGE_CODES;

export type SupportedLanguage = (typeof supportedLanguages)[number];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: supportedLanguages,
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    load: 'currentOnly',
    lowerCaseLng: true,
    cleanCode: false,
    nonExplicitSupportedLngs: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
