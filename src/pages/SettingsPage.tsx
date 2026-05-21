import { useTranslation } from 'react-i18next';
import { GlobalSettingsPage } from '@sudobility/building_blocks';
import { useTheme, Theme, FontSize } from '@sudobility/components';
import { SEOHead } from '@sudobility/seo_lib';
import { useSetPageConfig } from '../hooks/usePageConfig';
import { trackPageView } from '../analytics';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { t: tSettings } = useTranslation('settings');
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  useEffect(() => {
    trackPageView('/settings', 'Settings');
  }, []);

  useSetPageConfig({ scrollable: false, contentPadding: 'sm', maxWidth: '7xl' });

  return (
    <>
      <SEOHead
        title={t('navigation.settings', { defaultValue: 'Settings' })}
        description=""
        noIndex
      />
      <GlobalSettingsPage
        theme={theme}
        fontSize={fontSize}
        onThemeChange={value => setTheme(value as Theme)}
        onFontSizeChange={value => setFontSize(value as FontSize)}
        t={(key, fallback) => t(key, { defaultValue: fallback })}
        appearanceT={(key, fallback) => tSettings(`appearance.${key}`, { defaultValue: fallback })}
      />
    </>
  );
}
