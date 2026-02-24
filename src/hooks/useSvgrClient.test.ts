/**
 * Tests for the useSvgrClient hook.
 *
 * Verifies that the hook creates a SvgrClient instance with the correct
 * configuration and handles the network client fallback strategy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockFallbackNetworkClient = { get: vi.fn(), post: vi.fn() };
const mockApiNetworkClient = { get: vi.fn(), post: vi.fn() };

// Track constructor calls
const svgrClientInstances: Array<{ baseUrl: string; networkClient: unknown }> = [];

vi.mock('@sudobility/building_blocks/firebase', () => ({
  useApiSafe: vi.fn(() => null),
}));

vi.mock('@sudobility/auth_lib', () => ({
  useFirebaseAuthNetworkClient: vi.fn(() => mockFallbackNetworkClient),
}));

vi.mock('@sudobility/svgr_client', () => {
  return {
    SvgrClient: class MockSvgrClient {
      baseUrl: string;
      networkClient: unknown;
      constructor(config: { baseUrl: string; networkClient: unknown }) {
        this.baseUrl = config.baseUrl;
        this.networkClient = config.networkClient;
        svgrClientInstances.push(config);
      }
      convert = vi.fn();
    },
  };
});

import { useApiSafe } from '@sudobility/building_blocks/firebase';

describe('useSvgrClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svgrClientInstances.length = 0;
  });

  it('creates a SvgrClient with the fallback network client when API context is null', async () => {
    // Dynamic import to get the module after mocks are set up
    const { useSvgrClient } = await import('./useSvgrClient');
    vi.mocked(useApiSafe).mockReturnValue(null);

    renderHook(() => useSvgrClient());

    expect(svgrClientInstances.length).toBeGreaterThan(0);
    expect(svgrClientInstances[0]?.networkClient).toBe(mockFallbackNetworkClient);
  });

  it('creates a SvgrClient with the API context network client when available', async () => {
    const { useSvgrClient } = await import('./useSvgrClient');
    vi.mocked(useApiSafe).mockReturnValue({
      networkClient: mockApiNetworkClient,
    } as unknown as ReturnType<typeof useApiSafe>);

    renderHook(() => useSvgrClient());

    expect(svgrClientInstances.length).toBeGreaterThan(0);
    const lastInstance = svgrClientInstances[svgrClientInstances.length - 1];
    expect(lastInstance?.networkClient).toBe(mockApiNetworkClient);
  });

  it('returns a SvgrClient instance', async () => {
    const { useSvgrClient } = await import('./useSvgrClient');
    const { result } = renderHook(() => useSvgrClient());
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('convert');
  });

  it('memoizes the client across re-renders with the same network client', async () => {
    const { useSvgrClient } = await import('./useSvgrClient');
    vi.mocked(useApiSafe).mockReturnValue(null);

    const { result, rerender } = renderHook(() => useSvgrClient());
    const firstClient = result.current;

    rerender();

    expect(result.current).toBe(firstClient);
  });
});
