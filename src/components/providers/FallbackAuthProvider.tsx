/**
 * Detects when Firebase Auth cannot establish a user (e.g. blocked in China)
 * and switches the app into "fallback mode": a stable `nofb_` identity is
 * minted and exposed via context. Consumers (useEffectiveApi) use it to route
 * API calls with an unverified bearer token instead of a Firebase ID token.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthStatus } from '@sudobility/auth-components';
import { getFirebaseAuth } from '@sudobility/auth_lib';
import { getOrCreateFallbackUid } from '../../lib/fallback-uid';
import {
  FallbackIdentityContext,
  FALLBACK_GRACE_MS,
  type FallbackIdentity,
} from './fallback-identity-context';

/**
 * Watches Firebase auth state and engages fallback mode when no Firebase user
 * can be established. MUST be mounted under an `AuthProvider` (it calls
 * `useAuthStatus`). For the Firebase-unconfigured case use
 * {@link ForcedFallbackProvider} instead.
 *
 * Fallback is derived (not imperatively set in effects): it engages when
 * Firebase is unconfigured, or when no user has appeared by the time the grace
 * period elapses. Only the grace timer touches state, and it does so
 * asynchronously.
 */
export function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStatus();
  const firebaseUnconfigured = getFirebaseAuth() === null;
  const [graceElapsed, setGraceElapsed] = useState(false);

  // Start the grace timer only while waiting for a Firebase user. A real user
  // (or unconfigured Firebase) needs no timer.
  useEffect(() => {
    if (user || firebaseUnconfigured) return;
    const id = setTimeout(() => setGraceElapsed(true), FALLBACK_GRACE_MS);
    return () => clearTimeout(id);
  }, [user, firebaseUnconfigured]);

  const isFallback = firebaseUnconfigured || (!user && graceElapsed);
  const fallbackUid = useMemo(
    () => (isFallback ? getOrCreateFallbackUid() : null),
    [isFallback]
  );

  const value = useMemo<FallbackIdentity>(
    () => ({ isFallback, fallbackUid }),
    [isFallback, fallbackUid]
  );

  return (
    <FallbackIdentityContext.Provider value={value}>
      {children}
    </FallbackIdentityContext.Provider>
  );
}

/**
 * Unconditionally provides a fallback identity. Used when Firebase is not
 * configured at all (no `AuthProvider` ancestor, so `useAuthStatus` is
 * unavailable) — in that case the app is always in fallback mode.
 */
export function ForcedFallbackProvider({ children }: { children: ReactNode }) {
  const [fallbackUid] = useState(getOrCreateFallbackUid);
  const value = useMemo<FallbackIdentity>(
    () => ({ isFallback: true, fallbackUid }),
    [fallbackUid]
  );
  return (
    <FallbackIdentityContext.Provider value={value}>
      {children}
    </FallbackIdentityContext.Provider>
  );
}
