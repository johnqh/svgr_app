import { describe, it, expect } from 'vitest';
import { API_URL, APP_NAME } from './constants';

describe('constants', () => {
  it('has a default API_URL', () => {
    expect(API_URL).toBeDefined();
    expect(typeof API_URL).toBe('string');
  });

  it('has a default APP_NAME', () => {
    expect(APP_NAME).toBeDefined();
    expect(APP_NAME).toBe('SVGR');
  });
});
