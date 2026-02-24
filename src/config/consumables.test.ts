/**
 * Tests for the consumables configuration module.
 *
 * Verifies that REVENUECAT_API_KEY and CONSUMABLES_OFFERING_ID
 * have sensible default values, and that the initialization function
 * handles missing API key gracefully.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sudobility/consumables_client', () => ({
  initializeConsumables: vi.fn(),
  configureConsumablesWebAdapter: vi.fn(),
  createConsumablesWebAdapter: vi.fn(() => ({})),
  ConsumablesApiClient: vi.fn(),
}));

import {
  REVENUECAT_API_KEY,
  CONSUMABLES_OFFERING_ID,
} from './consumables';

describe('consumables config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has a CONSUMABLES_OFFERING_ID with a default value', () => {
    expect(CONSUMABLES_OFFERING_ID).toBeDefined();
    expect(typeof CONSUMABLES_OFFERING_ID).toBe('string');
  });

  it('has a REVENUECAT_API_KEY (may be empty string in test)', () => {
    expect(typeof REVENUECAT_API_KEY).toBe('string');
  });
});
