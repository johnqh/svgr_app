/**
 * Tests for the SEO configuration module.
 */

import { describe, it, expect } from 'vitest';
import { seoConfig } from './seo-config';

describe('seoConfig', () => {
  it('has an appName', () => {
    expect(seoConfig.appName).toBeDefined();
    expect(typeof seoConfig.appName).toBe('string');
  });

  it('has a baseUrl starting with https://', () => {
    expect(seoConfig.baseUrl).toMatch(/^https:\/\//);
  });

  it('has a defaultDescription', () => {
    expect(seoConfig.defaultDescription).toBeDefined();
    expect(seoConfig.defaultDescription!.length).toBeGreaterThan(10);
  });

  it('has a defaultOgImage URL', () => {
    expect(seoConfig.defaultOgImage).toMatch(/^https:\/\//);
    expect(seoConfig.defaultOgImage).toContain('og-image');
  });
});
