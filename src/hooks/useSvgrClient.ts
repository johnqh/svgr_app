/**
 * Hook for creating a memoized SVGR API client instance.
 *
 * @module useSvgrClient
 */

import { useMemo } from 'react';
import { SvgrClient } from '@sudobility/svgr_client';
import { useApiSafe } from '@sudobility/building_blocks/firebase';
import { useFirebaseAuthNetworkClient } from '@sudobility/auth_lib';
import { API_URL } from '../config/constants';

/**
 * Creates and memoizes a `SvgrClient` instance for calling the conversion API.
 *
 * Uses a two-level fallback strategy for the network client:
 * 1. **Primary**: `useApiSafe()` -- the app-level API context from `SudobilityAppWithFirebaseAuth`.
 *    This is available when the full auth/API provider tree is mounted.
 * 2. **Fallback**: `useFirebaseAuthNetworkClient()` -- a standalone Firebase Auth network client.
 *    Used when the API context is not yet available (e.g., during initial render).
 *
 * The client is re-created only when the resolved network client reference changes.
 *
 * @returns A memoized `SvgrClient` instance configured with the API URL and authenticated network client.
 */
export function useSvgrClient(): SvgrClient {
  const api = useApiSafe();
  const fallbackNetworkClient = useFirebaseAuthNetworkClient();
  const networkClient = api?.networkClient ?? fallbackNetworkClient;

  return useMemo(
    () => new SvgrClient({ baseUrl: API_URL, networkClient }),
    [networkClient],
  );
}
