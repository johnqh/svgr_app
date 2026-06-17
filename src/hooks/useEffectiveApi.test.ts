import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockUseApiSafe = vi.fn();
const mockUseFallbackIdentity = vi.fn();
const mockCreateFallbackNetworkClient = vi.fn(() => ({ tag: 'fallback-client' }));

vi.mock('@sudobility/building_blocks/firebase', () => ({
  useApiSafe: () => mockUseApiSafe(),
}));
vi.mock('../components/providers/FallbackAuthProvider', () => ({
  useFallbackIdentity: () => mockUseFallbackIdentity(),
}));
vi.mock('../lib/FallbackNetworkClient', () => ({
  createFallbackNetworkClient: (getUid: () => string) => mockCreateFallbackNetworkClient(getUid),
}));

import { useEffectiveApi } from './useEffectiveApi';

describe('useEffectiveApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the real API context when not in fallback mode', () => {
    const real = { networkClient: { tag: 'real' }, isReady: false };
    mockUseApiSafe.mockReturnValue(real);
    mockUseFallbackIdentity.mockReturnValue({ isFallback: false, fallbackUid: null });

    const { result } = renderHook(() => useEffectiveApi());
    expect(result.current).toBe(real);
  });

  it('returns a synthetic ready context in fallback mode', () => {
    mockUseApiSafe.mockReturnValue(null);
    mockUseFallbackIdentity.mockReturnValue({
      isFallback: true,
      fallbackUid: 'nofb_0123456789abcdef0123',
    });

    const { result } = renderHook(() => useEffectiveApi());
    expect(result.current?.isReady).toBe(true);
    expect(result.current?.userId).toBe('nofb_0123456789abcdef0123');
    expect(result.current?.token).toBe('nofb_0123456789abcdef0123');
    expect(result.current?.networkClient).toEqual({ tag: 'fallback-client' });
    expect(mockCreateFallbackNetworkClient).toHaveBeenCalled();
  });
});
