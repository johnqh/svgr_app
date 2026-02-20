import { useCallback, useEffect, useMemo } from 'react';
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
import type { MenuItemConfig } from '@sudobility/building_blocks';
import { AuthAction } from '@sudobility/auth-components';
import { CreditBalanceBadge } from '@sudobility/consumables_pages';
import { useBalance } from '@sudobility/consumables_client';
import type { ComponentType } from 'react';
import type { AuthActionProps } from '@sudobility/building_blocks';
import i18n, { supportedLanguages, type SupportedLanguage } from './i18n';
import { trackButtonClick } from './analytics';
import { API_URL } from './config/constants';
import { AuthProviderWrapper } from './components/providers/AuthProviderWrapper';
import ConvertPage from './pages/ConvertPage';
import CreditsPage from './pages/CreditsPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import UseCasesPage from './pages/UseCasesPage';

const LightBulbIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

const queryClient = new QueryClient();

function LangRoutes() {
  const { lang } = useParams<{ lang: string }>();
  const { t, i18n: i18nInstance } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { balance, isLoading: balanceLoading } = useBalance();

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

  const menuItems: MenuItemConfig[] = useMemo(
    () => [
      {
        id: 'use-cases',
        label: t('navigation.useCases'),
        icon: LightBulbIcon,
        href: `/${currentLang}/use-cases`,
      },
    ],
    [t, currentLang],
  );

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
          menuItems={menuItems}
          currentLanguage={currentLang}
          onLanguageChange={handleLanguageChange}
          AuthActionComponent={AuthAction as ComponentType<AuthActionProps>}
          renderCenterSection={() => (
            <CreditBalanceBadge
              balance={balance}
              isLoading={balanceLoading}
              onClick={() => navigate(`/${currentLang}/credits`)}
            />
          )}
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
      className="h-dvh min-h-0"
      mainClassName="flex flex-col"
      contentClassName="flex-1 flex flex-col min-h-0"
    >
      <Routes>
        <Route index element={<ConvertPage />} />
        <Route path="use-cases" element={<UseCasesPage />} />
        <Route path="credits" element={<CreditsPage />} />
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
