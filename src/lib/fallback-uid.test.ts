import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getOrCreateFallbackUid } from './fallback-uid';

const KEY = 'svgr_fallback_uid';

describe('getOrCreateFallbackUid', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('mints a nofb_ UID matching the agreed format and stores it', () => {
    const uid = getOrCreateFallbackUid();
    expect(uid).toMatch(/^nofb_[A-Za-z0-9_-]{16,}$/);
    expect(localStorage.getItem(KEY)).toBe(uid);
  });

  it('reuses the stored UID across calls', () => {
    const first = getOrCreateFallbackUid();
    const second = getOrCreateFallbackUid();
    expect(second).toBe(first);
  });

  it('falls back to an in-memory UID when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const uid = getOrCreateFallbackUid();
    expect(uid).toMatch(/^nofb_[A-Za-z0-9_-]{16,}$/);
    // Stable within the session even though storage is unavailable.
    expect(getOrCreateFallbackUid()).toBe(uid);
  });
});
