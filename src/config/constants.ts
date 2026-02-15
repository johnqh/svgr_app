import { APP_NAME as DEFAULT_APP_NAME, APP_DOMAIN as DEFAULT_APP_DOMAIN, DEFAULT_API_URL, COMPANY_NAME } from '@sudobility/svgr_lib';

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
export const APP_NAME = import.meta.env.VITE_APP_NAME || DEFAULT_APP_NAME;
export const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || DEFAULT_APP_DOMAIN;
export { COMPANY_NAME };
