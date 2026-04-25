/**
 * Terms of service page rendered from i18n-translated content.
 *
 * Uses the shared `AppTextPage` layout component from `@sudobility/building_blocks`
 * for consistent legal page formatting across the Sudobility ecosystem.
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppTextPage } from '@sudobility/building_blocks';
import type { TextPageContent } from '@sudobility/building_blocks';
import { trackPageView } from '../analytics';
import SEO from '../components/seo/SEO';
import { LAST_UPDATED_DATE, LEGAL_EMAIL, COMPANY_URL } from '../config/constants';

export default function TermsPage() {
  const { t } = useTranslation('terms');

  useEffect(() => {
    trackPageView('/terms', 'Terms of Service');
  }, []);

  const text: TextPageContent = {
    title: t('termsTitle'),
    lastUpdated: t('lastUpdated'),
    sections: [
      {
        title: t('termsAcceptanceTitle'),
        content: t('termsAcceptanceContent'),
      },
      {
        title: t('termsServiceTitle'),
        content: t('termsServiceContent'),
      },
      {
        title: t('termsUseTitle'),
        items: [t('termsUseItem1'), t('termsUseItem2'), t('termsUseItem3'), t('termsUseItem4')],
      },
      {
        title: t('termsIpTitle'),
        content: t('termsIpContent'),
      },
      {
        title: t('termsUploadsTitle'),
        content: t('termsUploadsContent'),
      },
      {
        title: t('termsDisclaimerTitle'),
        content: t('termsDisclaimerContent'),
      },
      {
        title: t('termsLiabilityTitle'),
        content: t('termsLiabilityContent'),
      },
      {
        title: t('termsTerminationTitle'),
        content: t('termsTerminationContent'),
      },
      {
        title: t('termsChangesTitle'),
        content: t('termsChangesContent'),
      },
    ],
    contact: {
      title: t('termsContactTitle'),
      description: t('termsContactDescription'),
      info: {
        emailLabel: t('termsContactEmailLabel'),
        email: LEGAL_EMAIL,
        websiteLabel: t('termsContactWebsiteLabel'),
        websiteUrl: COMPANY_URL,
      },
    },
  };

  return (
    <>
      <SEO
        title={t('seo.terms.title')}
        description={t('seo.terms.description')}
        canonical="/terms"
      />
      <AppTextPage text={text} lastUpdatedDate={LAST_UPDATED_DATE} />
    </>
  );
}
