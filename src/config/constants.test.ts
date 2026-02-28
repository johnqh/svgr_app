import { describe, it, expect } from 'vitest';
import { API_URL, APP_NAME, APP_DOMAIN, LAST_UPDATED_DATE, COMPANY_NAME, COMPANY_URL, PRIVACY_EMAIL, LEGAL_EMAIL } from './constants';

describe('constants', () => {
  it('has a default API_URL', () => {
    expect(API_URL).toBeDefined();
    expect(typeof API_URL).toBe('string');
  });

  it('has a default APP_NAME', () => {
    expect(APP_NAME).toBeDefined();
    expect(APP_NAME).toBe('SVGR');
  });

  it('has a default APP_DOMAIN', () => {
    expect(APP_DOMAIN).toBeDefined();
    expect(typeof APP_DOMAIN).toBe('string');
    expect(APP_DOMAIN).toContain('.');
  });

  it('has a LAST_UPDATED_DATE in YYYY-MM-DD format', () => {
    expect(LAST_UPDATED_DATE).toBeDefined();
    expect(LAST_UPDATED_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('has a COMPANY_NAME', () => {
    expect(COMPANY_NAME).toBeDefined();
    expect(typeof COMPANY_NAME).toBe('string');
  });

  it('has a COMPANY_URL derived from APP_DOMAIN', () => {
    expect(COMPANY_URL).toBe(`https://${APP_DOMAIN}`);
  });

  it('has a PRIVACY_EMAIL derived from APP_DOMAIN', () => {
    expect(PRIVACY_EMAIL).toBe(`privacy@${APP_DOMAIN}`);
  });

  it('has a LEGAL_EMAIL derived from APP_DOMAIN', () => {
    expect(LEGAL_EMAIL).toBe(`legal@${APP_DOMAIN}`);
  });
});
