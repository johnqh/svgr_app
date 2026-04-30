/**
 * Authentication page supporting email/password and Google sign-in.
 *
 * Redirects authenticated users to the main page. Delegates rendering
 * to the shared `LoginPage` component from `@sudobility/building_blocks`.
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStatus } from '@sudobility/auth-components';
import { getFirebaseAuth } from '@sudobility/auth_lib';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { LoginPage as LoginPageComponent } from '@sudobility/building_blocks';
import { variants, ui } from '@sudobility/design';
import { trackButtonClick, trackError, trackPageView } from '../analytics';
import SEOHead from '../components/SEOHead';
import { APP_NAME } from '../config/constants';

function LoginPage() {
  const { user, loading } = useAuthStatus();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const auth = getFirebaseAuth();

  useEffect(() => {
    trackPageView('/login', 'Login');
  }, []);

  // Redirect to main page if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate(`/${lang || 'en'}`, { replace: true });
    }
  }, [user, loading, navigate, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
        <div className={variants.loading.spinner.large()} />
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
        <p className={ui.text.error}>Firebase not configured</p>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="Login" description="Sign in to your SVGR account" noIndex />
      <LoginPageComponent
        appName={APP_NAME}
        logo={<img src="/logo.svg" alt={APP_NAME} className="h-12" />}
        onEmailSignIn={async (email, password) => {
          trackButtonClick('email_sign_in');
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch (err) {
            trackError(
              err instanceof Error ? err.message : 'Email sign-in failed',
              'email_sign_in_error'
            );
            throw err;
          }
        }}
        onEmailSignUp={async (email, password) => {
          trackButtonClick('email_sign_up');
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (err) {
            trackError(
              err instanceof Error ? err.message : 'Email sign-up failed',
              'email_sign_up_error'
            );
            throw err;
          }
        }}
        onGoogleSignIn={async () => {
          trackButtonClick('google_sign_in');
          try {
            await signInWithPopup(auth, new GoogleAuthProvider());
          } catch (err) {
            trackError(
              err instanceof Error ? err.message : 'Google sign-in failed',
              'google_sign_in_error'
            );
            throw err;
          }
        }}
        onSuccess={() => navigate(`/${lang || 'en'}`, { replace: true })}
      />
    </>
  );
}

export default LoginPage;
