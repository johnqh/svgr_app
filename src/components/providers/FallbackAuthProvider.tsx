/**
 * Detects when Firebase Auth cannot establish a user (e.g. blocked in China)
 * and switches the app into "fallback mode": a stable `nofb_` identity is
 * minted and exposed via context. Consumers (useEffectiveApi) use it to route
 * API calls with an unverified bearer token instead of a Firebase ID token.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuthStatus } from '@sudobility/auth-components';
import { getFirebaseAuth } from '@sudobility/auth_lib';
import { getOrCreateFallbackUid } from '../../lib/fallback-uid';

/** How long to wait for Firebase (incl. anonymous sign-in) before giving up. */
export const FALLBACK_GRACE_MS = 8000;

interface FallbackIdentity {
  isFallback: boolean;
  fallbackUid: string | null;
}

const FallbackIdentityContext = createContext<FallbackIdentity>({
  isFallback: false,
  fallbackUid: null,
});

export function useFallbackIdentity(): FallbackIdentity {
  return useContext(FallbackIdentityContext);
}

export function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStatus();
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackUid, setFallbackUid] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const engageFallback = () => {
    setFallbackUid(getOrCreateFallbackUid());
    setIsFallback(true);
  };

  // Firebase not configured at all -> fallback immediately.
  useEffect(() => {
    if (getFirebaseAuth() === null) {
      engageFallback();
    }
  }, []);

  // A real Firebase user (anonymous or registered) -> leave fallback mode.
  // Otherwise start a grace timer; if it elapses with still no user, engage.
  useEffect(() => {
    if (user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsFallback(false);
      setFallbackUid(null);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(engageFallback, FALLBACK_GRACE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user]);

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
