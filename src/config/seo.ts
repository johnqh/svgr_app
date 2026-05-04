import { type SEOHeadConfig } from '@sudobility/seo_lib';
import { APP_NAME, APP_DOMAIN } from './constants';
import { supportedLanguages } from '../i18n';

export const seoHeadConfig: SEOHeadConfig = {
  appName: APP_NAME,
  baseUrl: `https://${APP_DOMAIN}`,
  defaultOgImage: `https://${APP_DOMAIN}/logo.png`,
  twitterHandle: undefined,
  supportedLanguages: supportedLanguages as unknown as string[],
  defaultLanguage: 'en',
  applicationCategory: 'DesignApplication',
  applicationSubCategory: 'Image Converter',
};
