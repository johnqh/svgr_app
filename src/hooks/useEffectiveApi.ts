/**
 * Returns the API context the app should use. Normally this is the real
 * Firebase-backed context from `useApiSafe()`. When the app is in fallback mode
 * (Firebase unreachable), it returns a synthetic, already-"ready" context
 * backed by the fallback network client, so the conversion pipeline can run
 * with an unverified `nofb_` identity.
 */

import { useMemo } from 'react';
import { useApiSafe, type ApiContextValue } from '@sudobility/building_blocks/firebase';
import { useFallbackIdentity } from '../components/providers/fallback-identity-context';
import { createFallbackNetworkClient } from '../lib/FallbackNetworkClient';
import { API_URL } from '../config/constants';

export function useEffectiveApi(): ApiContextValue | null {
  const realApi = useApiSafe();
  const { isFallback, fallbackUid } = useFallbackIdentity();

  return useMemo<ApiContextValue | null>(() => {
    if (isFallback && fallbackUid) {
      return {
        networkClient: createFallbackNetworkClient(() => fallbackUid),
        baseUrl: API_URL,
        userId: fallbackUid,
        token: fallbackUid,
        isReady: true,
        isLoading: false,
        refreshToken: async () => fallbackUid,
        testMode: false,
      };
    }
    return realApi;
  }, [isFallback, fallbackUid, realApi]);
}
