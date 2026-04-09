import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SudobilityAppWithFirebaseAuth } from '@sudobility/building_blocks/firebase';
import { variants } from '@sudobility/design';
import {
  AppPageLayout,
  type TopBarConfig,
  type FooterConfig,
  type FooterLinkSection,
} from '@sudobility/building_blocks';
import type { MenuItemConfig, AuthActionProps } from '@sudobility/building_blocks';
import { AuthAction } from '@sudobility/auth-components';
import { CreditBalanceBadge } from '@sudobility/consumables_pages';
import { useBalance } from '@sudobility/consumables_client';
import type { ComponentType } from 'react';
import i18n, { supportedLanguages, type SupportedLanguage } from './i18n';
import { trackButtonClick } from './analytics';
import { API_URL, APP_NAME, APP_DOMAIN, COMPANY_NAME } from './config/constants';
import { AuthProviderWrapper } from './components/providers/AuthProviderWrapper';
import { LightBulbIcon } from './components/icons';
import { PageConfigProvider } from './context/PageConfigProvider';
import { usePageConfig } from './hooks/usePageConfig';
import ConvertPage from './pages/ConvertPage';

/*
 * Lazy-loaded page components for route-level code splitting.
 * Only ConvertPage is eagerly imported since it is the primary entry point.
 * All other pages are loaded on demand to reduce the initial bundle size.
 */
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const UseCasesPage = lazy(() => import('./pages/UseCasesPage'));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-theme-bg-primary">
    <div
      role="status"
      aria-label="Loading"
      className={variants.loading.spinner.large()}
    />
  </div>
);

function LangLayoutInner() {
  const { lang } = useParams<{ lang: string }>();
  const { t, i18n: i18nInstance } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { balance, isLoading: balanceLoading } = useBalance();
  const { pageConfig } = usePageConfig();

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
    [t, currentLang]
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
    [i18nInstance, navigate, location.pathname, currentLang]
  );

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isHomePage = pathParts.length <= 1;

  const linkSections: FooterLinkSection[] = [
    {
      title: t('product', { defaultValue: 'Product' }),
      links: [
        { label: t('convert', { defaultValue: 'Convert' }), href: `/${currentLang}` },
        {
          label: t('navigation.useCases', { defaultValue: 'Use Cases' }),
          href: `/${currentLang}/use-cases`,
        },
      ],
    },
    {
      title: t('legal', { defaultValue: 'Legal' }),
      links: [
        { label: t('privacy'), href: `/${currentLang}/privacy` },
        { label: t('terms'), href: `/${currentLang}/terms` },
      ],
    },
  ];

  const footerConfig: FooterConfig = isHomePage
    ? {
        variant: 'full',
        logo: { appName: APP_NAME },
        linkSections,
        companyName: COMPANY_NAME,
        companyUrl: `https://${APP_DOMAIN}`,
        description: t('app.description', {
          defaultValue: `Convert images to SVG with ${APP_NAME}`,
        }),
      }
    : {
        variant: 'compact',
        companyName: COMPANY_NAME,
        companyUrl: `https://${APP_DOMAIN}`,
        links: [
          { label: t('privacy'), href: `/${currentLang}/privacy` },
          { label: t('terms'), href: `/${currentLang}/terms` },
        ],
        sticky: true,
      };

  const topBarConfig: TopBarConfig = {
    variant: 'firebase',
    logo: {
      src: '/logo.svg',
      appName: APP_NAME,
      onClick: () => navigate(`/${currentLang}`),
    },
    menuItems,
    currentLanguage: currentLang,
    onLanguageChange: handleLanguageChange,
    AuthActionComponent: AuthAction as ComponentType<AuthActionProps>,
    renderCenterSection: () => (
      <CreditBalanceBadge
        balance={balance}
        isLoading={balanceLoading}
        onClick={() => navigate(`/${currentLang}/credits`)}
      />
    ),
    onLoginClick: () => {
      trackButtonClick('topbar_login');
      navigate(`/${currentLang}/login`);
    },
    sticky: true,
  };

  return (
    <AppPageLayout
      topBar={topBarConfig}
      footer={footerConfig}
      page={{
        maxWidth: '7xl',
        background: 'default',
        className: 'h-dvh min-h-0',
        mainClassName: 'flex flex-col',
        contentClassName: 'flex-1 flex flex-col min-h-0',
        ...pageConfig,
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>
    </AppPageLayout>
  );
}

/**
 * Route-level layout providing PageConfigProvider so child pages
 * can use useSetPageConfig for layout overrides.
 */
function LangLayout() {
  return (
    <PageConfigProvider>
      <LangLayoutInner />
    </PageConfigProvider>
  );
}

function AppRoutes() {
  const { i18n: i18nInstance } = useTranslation();

  return (
    <Routes>
      <Route path="/:lang" element={<LangLayout />}>
        <Route index element={<ConvertPage />} />
        <Route path="use-cases" element={<UseCasesPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
      </Route>
      <Route path="/" element={<Navigate to={`/${i18nInstance.language || 'en'}`} replace />} />
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
