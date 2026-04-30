/**
 * Tutorials page with master-detail layout.
 *
 * Uses MasterDetailLayout from @sudobility/components to display
 * a list of tutorials in the master panel and tutorial content in
 * the detail panel. Each tutorial has a unique URL slug.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MasterDetailLayout, MasterListItem } from '@sudobility/components/layout';
import { ui, buttonVariant } from '@sudobility/design';
import { trackButtonClick, trackPageView } from '../analytics';
import SEOHead from '../components/SEOHead';
import { useSetPageConfig } from '../hooks/usePageConfig';

/** Tutorial slug identifiers — order defines master list order. */
const TUTORIAL_SLUGS = [
  'ai-logos-to-svg',
  'ai-posters-to-svg',
  'qr-code-to-svg',
  'photo-to-svg',
] as const;

type TutorialSlug = (typeof TUTORIAL_SLUGS)[number];

/** Step keys per tutorial — used to iterate i18n step entries. */
const STEP_KEYS = ['step1', 'step2', 'step3', 'step4', 'step5'] as const;

/** Tip keys per tutorial. */
const TIP_KEYS = ['tip1', 'tip2', 'tip3'] as const;

/** Tutorials that have a file-size warning section. */
const TUTORIALS_WITH_WARNING: readonly TutorialSlug[] = ['ai-posters-to-svg', 'photo-to-svg'];

export default function TutorialsPage() {
  useSetPageConfig({ scrollable: false, contentPadding: 'sm', maxWidth: '7xl' });
  const { t } = useTranslation();
  const { lang, slug } = useParams<{ lang: string; slug?: string }>();
  const navigate = useNavigate();
  const currentLang = lang || 'en';

  const selectedSlug: TutorialSlug =
    slug && TUTORIAL_SLUGS.includes(slug as TutorialSlug)
      ? (slug as TutorialSlug)
      : TUTORIAL_SLUGS[0];

  const [mobileView, setMobileView] = useState<'navigation' | 'content'>(
    slug ? 'content' : 'navigation'
  );

  useEffect(() => {
    trackPageView(`/tutorials/${selectedSlug}`, `Tutorial: ${selectedSlug}`);
  }, [selectedSlug]);

  const handleSelect = useCallback(
    (tutorialSlug: TutorialSlug) => {
      navigate(`/${currentLang}/tutorials/${tutorialSlug}`, { replace: false });
      setMobileView('content');
    },
    [navigate, currentLang]
  );

  const hasSlug = slug && TUTORIAL_SLUGS.includes(slug as TutorialSlug);

  const seoKey = hasSlug ? `seo.tutorials.${selectedSlug}` : 'seo.tutorials.index';
  const seoTitle = t(`${seoKey}.title`);
  const seoDescription = t(`${seoKey}.description`);
  const seoKeywords = t(`${seoKey}.keywords`, { returnObjects: true }) as string[];

  // Build structured data for the selected tutorial
  const structuredData = useMemo(() => {
    if (!hasSlug) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: t(`seo.tutorials.${selectedSlug}.title`),
      description: t(`seo.tutorials.${selectedSlug}.description`),
      step: STEP_KEYS.map((key, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        text: t(`tutorials.items.${selectedSlug}.steps.${key}`),
      })),
    };
  }, [selectedSlug, hasSlug, t]);

  const masterContent = (
    <div>
      {TUTORIAL_SLUGS.map(tutorialSlug => (
        <MasterListItem
          key={tutorialSlug}
          isSelected={selectedSlug === tutorialSlug}
          onClick={() => handleSelect(tutorialSlug)}
          label={t(`tutorials.items.${tutorialSlug}.title`)}
          description={t(`tutorials.items.${tutorialSlug}.description`)}
        />
      ))}
    </div>
  );

  const hasWarning = TUTORIALS_WITH_WARNING.includes(selectedSlug);

  const detailContent = (
    <div className="space-y-8">
      {/* Introduction */}
      <p className={ui.text.bodyLarge}>{t(`tutorials.items.${selectedSlug}.intro`)}</p>

      {/* Steps */}
      <section>
        <h2 className={`${ui.text.h3} mb-4`}>{t(`tutorials.items.${selectedSlug}.steps.title`)}</h2>
        <ol className="list-decimal list-inside space-y-3">
          {STEP_KEYS.map(key => (
            <li key={key} className={ui.text.body}>
              {t(`tutorials.items.${selectedSlug}.steps.${key}`)}
            </li>
          ))}
        </ol>
      </section>

      {/* Warning (if applicable) */}
      {hasWarning && (
        <section className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
          <h3 className={`${ui.text.h4} text-amber-700 dark:text-amber-400 mb-2`}>
            {t(`tutorials.items.${selectedSlug}.warning.title`)}
          </h3>
          <p className={ui.text.body}>{t(`tutorials.items.${selectedSlug}.warning.text`)}</p>
        </section>
      )}

      {/* Tips */}
      <section>
        <h2 className={`${ui.text.h3} mb-4`}>{t(`tutorials.items.${selectedSlug}.tips.title`)}</h2>
        <ul className="list-disc list-inside space-y-3">
          {TIP_KEYS.map(key => (
            <li key={key} className={ui.text.body}>
              {t(`tutorials.items.${selectedSlug}.tips.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section
        className={`text-center py-8 bg-theme-bg-secondary rounded-2xl border ${ui.border.default}`}
      >
        <h2 className={`${ui.text.h3} mb-3`}>{t('tutorials.cta.title')}</h2>
        <p className={`${ui.text.body} mb-6`}>{t('tutorials.cta.subtitle')}</p>
        <button
          onClick={() => {
            trackButtonClick('tutorial_cta');
            navigate(`/${currentLang}`);
          }}
          className={`${buttonVariant('primary')} rounded-lg px-8 py-3 font-semibold`}
        >
          {t('tutorials.cta.button')}
        </button>
      </section>
    </div>
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden flex-1 flex flex-col min-h-0">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        ogType={hasSlug ? 'article' : 'website'}
        structuredData={structuredData}
      />
      <MasterDetailLayout
        masterTitle={t('tutorials.title')}
        masterContent={masterContent}
        detailTitle={t(`tutorials.items.${selectedSlug}.title`)}
        detailContent={detailContent}
        mobileView={mobileView}
        onBackToNavigation={() => {
          setMobileView('navigation');
          navigate(`/${currentLang}/tutorials`, { replace: true });
        }}
        backButtonText={t('tutorials.backButton')}
        contentKey={selectedSlug}
        masterWidth={320}
      />
    </div>
  );
}
