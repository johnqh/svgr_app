/**
 * Context + hook for the client-side fallback identity (used when Firebase Auth
 * is unreachable, e.g. in China). Kept separate from the provider components so
 * the provider file can export only components (react-refresh friendly).
 */

import { createContext, useContext } from 'react';

/** How long to wait for Firebase (incl. anonymous sign-in) before giving up. */
export const FALLBACK_GRACE_MS = 8000;

export interface FallbackIdentity {
  isFallback: boolean;
  fallbackUid: string | null;
}

export const FallbackIdentityContext = createContext<FallbackIdentity>({
  isFallback: false,
  fallbackUid: null,
});

export function useFallbackIdentity(): FallbackIdentity {
  return useContext(FallbackIdentityContext);
}
