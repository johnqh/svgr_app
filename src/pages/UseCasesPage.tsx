/**
 * Marketing page showcasing use cases for SVGR image-to-SVG conversion.
 *
 * Highlights two primary use cases:
 * 1. Converting AI-generated logo designs (from services like Looka, Brandmark, etc.)
 *    from raster PNG/JPG to scalable SVG format.
 * 2. Converting legacy raster assets to modern vector formats.
 *
 * Each use case is presented with a problem/solution layout and a call-to-action
 * that navigates back to the main conversion page.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { buttonVariant, ui } from '@sudobility/design';
import { trackButtonClick, trackPageView } from '../analytics';
import SEOHead from '../components/SEOHead';

/** Keys for AI logo designer entries used to generate the designer grid from i18n. */
const AI_DESIGNER_KEYS = [
  'looka',
  'brandmark',
  'hatchful',
  'logoai',
  'designsai',
  'tailorbrands',
  'turbologo',
  'logocom',
] as const;

export default function UseCasesPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const currentLang = lang || 'en';

  useEffect(() => {
    trackPageView('/use-cases', 'Use Cases');
  }, []);

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <SEOHead
        title={t('seo.useCases.title')}
        description={t('seo.useCases.description')}
        keywords={t('seo.useCases.keywords', { returnObjects: true }) as string[]}
      />

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className={`${ui.text.h1} mb-4`}>{t('useCases.title')}</h1>
        <p className={`${ui.text.bodyLarge} max-w-2xl mx-auto`}>{t('useCases.subtitle')}</p>
      </div>

      {/* Use Case 1: AI Logos */}
      <section className="mb-16">
        <h2 className={`${ui.text.h2} mb-4`}>{t('useCases.aiLogos.title')}</h2>
        <p className={`${ui.text.bodyLarge} mb-8`}>{t('useCases.aiLogos.description')}</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Problem */}
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <h3 className={`${ui.text.h4} ${ui.text.error} mb-3`}>
              {t('useCases.aiLogos.problem')}
            </h3>
            <p className={ui.text.body}>{t('useCases.aiLogos.problemDescription')}</p>
          </div>

          {/* Solution */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <h3 className={`${ui.text.h4} ${ui.text.success} mb-3`}>
              {t('useCases.aiLogos.solution')}
            </h3>
            <p className={ui.text.body}>{t('useCases.aiLogos.solutionDescription')}</p>
          </div>
        </div>

        {/* AI Logo Designers List */}
        <h3 className={`${ui.text.h3} mb-6`}>{t('useCases.aiLogos.designersTitle')}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {AI_DESIGNER_KEYS.map(key => (
            <a
              key={key}
              href={t(`useCases.aiLogos.designers.${key}.url`)}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-theme-bg-secondary rounded-xl p-5 border ${ui.border.default} hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md ${ui.transition.all}`}
            >
              <h4
                className={`${ui.text.strong} group-hover:text-blue-600 dark:group-hover:text-blue-400 ${ui.transition.default} mb-1`}
              >
                {t(`useCases.aiLogos.designers.${key}.name`)}
                <span className={`ml-1 text-xs ${ui.text.muted}`}>&#8599;</span>
              </h4>
              <p className={ui.text.bodySmall}>
                {t(`useCases.aiLogos.designers.${key}.description`)}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Use Case 2: Legacy Assets */}
      <section className="mb-16">
        <h2 className={`${ui.text.h2} mb-4`}>{t('useCases.legacyAssets.title')}</h2>
        <p className={`${ui.text.bodyLarge} mb-8`}>{t('useCases.legacyAssets.description')}</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <h3 className={`${ui.text.h4} ${ui.text.error} mb-3`}>
              {t('useCases.legacyAssets.problem')}
            </h3>
            <p className={ui.text.body}>{t('useCases.legacyAssets.problemDescription')}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <h3 className={`${ui.text.h4} ${ui.text.success} mb-3`}>
              {t('useCases.legacyAssets.solution')}
            </h3>
            <p className={ui.text.body}>{t('useCases.legacyAssets.solutionDescription')}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className={`text-center py-12 bg-theme-bg-secondary rounded-2xl border ${ui.border.default}`}
      >
        <h2 className={`${ui.text.h2} mb-4`}>{t('useCases.cta.title')}</h2>
        <p className={`${ui.text.bodyLarge} mb-8`}>{t('useCases.cta.subtitle')}</p>
        <button
          onClick={() => {
            trackButtonClick('use_cases_cta');
            navigate(`/${currentLang}`);
          }}
          className={`${buttonVariant('primary')} rounded-lg px-8 py-3 font-semibold`}
        >
          {t('useCases.cta.button')}
        </button>
      </section>
    </div>
  );
}
