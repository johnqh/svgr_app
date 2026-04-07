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
import SEO from '../components/seo/SEO';
import { APP_NAME } from '../config/constants';

function LoginPage() {
  const { user, loading } = useAuthStatus();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const auth = getFirebaseAuth();

  // Redirect to main page if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate(`/${lang || 'en'}`, { replace: true });
    }
  }, [user, loading, navigate, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
        <p className="text-red-600">Firebase not configured</p>
      </div>
    );
  }

  return (
    <>
      <SEO noIndex />
      <LoginPageComponent
        appName={APP_NAME}
        logo={<img src="/logo.svg" alt={APP_NAME} className="h-12" />}
        onEmailSignIn={async (email, password) => {
          await signInWithEmailAndPassword(auth, email, password);
        }}
        onEmailSignUp={async (email, password) => {
          await createUserWithEmailAndPassword(auth, email, password);
        }}
        onGoogleSignIn={async () => {
          await signInWithPopup(auth, new GoogleAuthProvider());
        }}
        onSuccess={() => navigate(`/${lang || 'en'}`, { replace: true })}
      />
    </>
  );
}

export default LoginPage;
