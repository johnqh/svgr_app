import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SudobilityApp, AppFooter } from '@sudobility/building_blocks';
import ConvertPage from './pages/ConvertPage';

const queryClient = new QueryClient();

// Minimal i18n stub — SVGR doesn't need localization
const i18nStub = {
  language: 'en',
  languages: ['en'] as const,
  t: (key: string) => key,
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SudobilityApp i18n={i18nStub} storageKeyPrefix="svgr">
        <div className="min-h-screen flex flex-col">
          <ConvertPage />
        <AppFooter
          companyName="Sudobility Inc."
          companyUrl="https://sudobility.com"
          links={[
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
          ]}
          sticky
        />
      </div>
      </SudobilityApp>
    </QueryClientProvider>
  );
}

export default App;
