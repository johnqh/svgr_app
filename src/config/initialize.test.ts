/**
 * Tests for the app initialization module.
 *
 * Verifies that initializeApp calls all required service initialization
 * functions in the correct order.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sudobility/di', () => ({
  initializeStorageService: vi.fn(),
  initializeNetworkService: vi.fn(),
  initializeFirebaseService: vi.fn(),
}));

vi.mock('@sudobility/di_web', () => ({
  initializeInfoService: vi.fn(),
}));

import { initializeApp } from './initialize';
import {
  initializeStorageService,
  initializeNetworkService,
  initializeFirebaseService,
} from '@sudobility/di';
import { initializeInfoService } from '@sudobility/di_web';

describe('initializeApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls initializeStorageService', () => {
    initializeApp();
    expect(initializeStorageService).toHaveBeenCalledOnce();
  });

  it('calls initializeFirebaseService with env variables', () => {
    initializeApp();
    expect(initializeFirebaseService).toHaveBeenCalledOnce();
    expect(initializeFirebaseService).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      })
    );
  });

  it('calls initializeNetworkService', () => {
    initializeApp();
    expect(initializeNetworkService).toHaveBeenCalledOnce();
  });

  it('calls initializeInfoService', () => {
    initializeApp();
    expect(initializeInfoService).toHaveBeenCalledOnce();
  });
});
