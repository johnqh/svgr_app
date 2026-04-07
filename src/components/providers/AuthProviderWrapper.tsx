import { type ReactNode, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider } from '@sudobility/auth-components';
import {
  getFirebaseAuth,
  getFirebaseErrorMessage,
  initializeFirebaseAuth,
  FirebaseAuthNetworkService,
} from '@sudobility/auth_lib';
import { setConsumablesUserId } from '@sudobility/consumables_client';
import { createAuthTexts, createAuthErrorTexts } from '../../config/auth-config';
import { initializeConsumablesService } from '../../config/consumables';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that integrates @sudobility/auth-components
 * with i18n translations and Firebase config
 */
export function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const { t } = useTranslation(['auth']);

  // Initialize Firebase Auth (idempotent - safe to call multiple times)
  initializeFirebaseAuth();

  // Memoize texts - must be called before any conditional returns
  const texts = useMemo(() => createAuthTexts(t), [t]);
  const errorTexts = useMemo(() => createAuthErrorTexts(), []);

  const auth = getFirebaseAuth();

  // Initialize the consumables (credit) service once Firebase Auth is ready.
  // Also subscribes to auth state changes to sync the consumables user ID,
  // which ensures credit balance and purchases are tied to the correct user.
  // The consumables API client needs an authenticated network client, so this
  // must run after Firebase Auth initialization.
  useEffect(() => {
    if (!auth) return;

    initializeConsumablesService(new FirebaseAuthNetworkService());

    const unsubscribe = onAuthStateChanged(auth, user => {
      setConsumablesUserId(user?.uid, user?.email ?? undefined);
    });
    return unsubscribe;
  }, [auth]);

  // If Firebase is not configured, render children without auth
  if (!auth) {
    console.warn('[AuthProviderWrapper] No auth instance - Firebase not configured');
    return <>{children}</>;
  }

  return (
    <AuthProvider
      firebaseConfig={{ type: 'instance', auth: auth }}
      providerConfig={{
        providers: ['google', 'email'],
        enableAnonymous: false,
      }}
      texts={texts}
      errorTexts={errorTexts}
      resolveErrorMessage={getFirebaseErrorMessage}
    >
      {children}
    </AuthProvider>
  );
}
