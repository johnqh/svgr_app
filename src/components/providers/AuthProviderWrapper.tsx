import { type ReactNode, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { onAuthStateChanged } from "firebase/auth";
import { AuthProvider } from "@sudobility/auth-components";
import {
  getFirebaseAuth,
  getFirebaseErrorMessage,
  initializeFirebaseAuth,
} from "@sudobility/auth_lib";
import { setConsumablesUserId } from "@sudobility/consumables_client";
import {
  createAuthTexts,
  createAuthErrorTexts,
} from "../../config/auth-config";
import { initializeConsumablesService } from "../../config/consumables";

interface AuthProviderWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that integrates @sudobility/auth-components
 * with i18n translations and Firebase config
 */
export function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const { t } = useTranslation(["auth"]);

  // Initialize Firebase Auth (idempotent - safe to call multiple times)
  initializeFirebaseAuth();

  // Memoize texts - must be called before any conditional returns
  const texts = useMemo(() => createAuthTexts(t), [t]);
  const errorTexts = useMemo(() => createAuthErrorTexts(), []);

  const auth = getFirebaseAuth();

  // Initialize consumables and sync user ID on auth state change
  useEffect(() => {
    if (!auth) return;

    initializeConsumablesService(() =>
      auth.currentUser?.getIdToken() ?? Promise.resolve(null),
    );

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setConsumablesUserId(user?.uid, user?.email ?? undefined);
    });
    return unsubscribe;
  }, [auth]);

  // If Firebase is not configured, render children without auth
  if (!auth) {
    console.warn(
      "[AuthProviderWrapper] No auth instance - Firebase not configured",
    );
    return <>{children}</>;
  }

  return (
    <AuthProvider
      firebaseConfig={{ type: "instance", auth: auth }}
      providerConfig={{
        providers: ["google", "email"],
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
