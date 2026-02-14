import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

export const supportedLanguages = [
  'en',
  'zh',
  'zh-hant',
  'ja',
  'ko',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'ar',
  'sv',
  'th',
  'uk',
  'vi',
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    ns: ['svgr'],
    defaultNS: 'svgr',
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
