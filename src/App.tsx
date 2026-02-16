import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SudobilityAppWithFirebaseAuth } from '@sudobility/building_blocks/firebase';
import {
  AppPageLayout,
  AppTopBarWithFirebaseAuth,
  AppFooter,
} from '@sudobility/building_blocks';
import { AuthAction } from '@sudobility/auth-components';
import type { ComponentType } from 'react';
import type { AuthActionProps } from '@sudobility/building_blocks';
import i18n, { supportedLanguages, type SupportedLanguage } from './i18n';
import { trackButtonClick } from './analytics';
import { API_URL } from './config/constants';
import { AuthProviderWrapper } from './components/providers/AuthProviderWrapper';
import ConvertPage from './pages/ConvertPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

const queryClient = new QueryClient();

function LangRoutes() {
  const { lang } = useParams<{ lang: string }>();
  const { t, i18n: i18nInstance } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (lang && supportedLanguages.includes(lang as SupportedLanguage)) {
      if (i18nInstance.language !== lang) {
        i18nInstance.changeLanguage(lang);
      }
    } else if (lang) {
      navigate('/en', { replace: true });
    }
  }, [lang, i18nInstance, navigate]);

  const currentLang = (lang || i18nInstance.language || 'en') as string;

  const handleLanguageChange = useCallback(
    (newLang: string) => {
      if (supportedLanguages.includes(newLang as SupportedLanguage)) {
        i18nInstance.changeLanguage(newLang);
        // Replace the lang prefix in the current path
        const subPath = location.pathname.replace(`/${currentLang}`, '') || '';
        navigate(`/${newLang}${subPath}`);
      }
    },
    [i18nInstance, navigate, location.pathname, currentLang],
  );

  return (
    <AppPageLayout
      topBar={
        <AppTopBarWithFirebaseAuth
          logo={{
            src: '/logo.svg',
            appName: 'SVGR',
            onClick: () => navigate(`/${currentLang}`),
          }}
          menuItems={[]}
          currentLanguage={currentLang}
          onLanguageChange={handleLanguageChange}
          AuthActionComponent={AuthAction as ComponentType<AuthActionProps>}
          onLoginClick={() => {
            trackButtonClick('topbar_login');
            navigate(`/${currentLang}/login`);
          }}
          sticky
        />
      }
      footer={
        <AppFooter
          companyName="Sudobility Inc."
          companyUrl="https://sudobility.com"
          links={[
            { label: t('privacy'), href: `/${currentLang}/privacy` },
            { label: t('terms'), href: `/${currentLang}/terms` },
          ]}
          sticky
        />
      }
      maxWidth="7xl"
      background="default"
    >
      <Routes>
        <Route index element={<ConvertPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
      </Routes>
    </AppPageLayout>
  );
}

function AppRoutes() {
  const { i18n: i18nInstance } = useTranslation();

  return (
    <Routes>
      <Route path="/:lang/*" element={<LangRoutes />} />
      <Route
        path="/"
        element={
          <Navigate to={`/${i18nInstance.language || 'en'}`} replace />
        }
      />
      <Route path="*" element={<Navigate to="/en" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SudobilityAppWithFirebaseAuth
        i18n={i18n}
        storageKeyPrefix="svgr"
        baseUrl={API_URL}
        AuthProviderWrapper={AuthProviderWrapper}
      >
        <AppRoutes />
      </SudobilityAppWithFirebaseAuth>
    </QueryClientProvider>
  );
}

export default App;
