/**
 * Privacy policy page rendered from i18n-translated content.
 *
 * Uses the shared `AppTextPage` layout component from `@sudobility/building_blocks`
 * for consistent legal page formatting across the Sudobility ecosystem.
 */

import { useTranslation } from 'react-i18next';
import { AppTextPage } from '@sudobility/building_blocks';
import type { TextPageContent } from '@sudobility/building_blocks';
import SEO from '../components/seo/SEO';
import { LAST_UPDATED_DATE, PRIVACY_EMAIL, COMPANY_URL } from '../config/constants';

export default function PrivacyPage() {
  const { t } = useTranslation();

  const text: TextPageContent = {
    title: t('privacyTitle'),
    lastUpdated: t('lastUpdated'),
    sections: [
      {
        title: t('privacyIntroTitle'),
        content: t('privacyIntroContent'),
      },
      {
        title: t('privacyCollectTitle'),
        subsections: [
          {
            title: t('privacyCollectAutoTitle'),
            items: [
              t('privacyCollectAutoItem1'),
              t('privacyCollectAutoItem2'),
              t('privacyCollectAutoItem3'),
            ],
          },
          {
            title: t('privacyCollectUploadTitle'),
            items: [t('privacyCollectUploadItem1'), t('privacyCollectUploadItem2')],
          },
        ],
      },
      {
        title: t('privacyUseTitle'),
        items: [t('privacyUseItem1'), t('privacyUseItem2'), t('privacyUseItem3')],
      },
      {
        title: t('privacyStorageTitle'),
        content: t('privacyStorageContent'),
      },
      {
        title: t('privacyThirdPartyTitle'),
        content: t('privacyThirdPartyContent'),
      },
      {
        title: t('privacyRightsTitle'),
        items: [t('privacyRightsItem1'), t('privacyRightsItem2'), t('privacyRightsItem3')],
      },
      {
        title: t('privacyChangesTitle'),
        content: t('privacyChangesContent'),
      },
    ],
    contact: {
      title: t('privacyContactTitle'),
      description: t('privacyContactDescription'),
      info: {
        emailLabel: t('privacyContactEmailLabel'),
        email: PRIVACY_EMAIL,
        websiteLabel: t('privacyContactWebsiteLabel'),
        websiteUrl: COMPANY_URL,
      },
    },
  };

  return (
    <>
      <SEO title={t('privacyTitle')} canonical="/privacy" />
      <AppTextPage text={text} lastUpdatedDate={LAST_UPDATED_DATE} />
    </>
  );
}
