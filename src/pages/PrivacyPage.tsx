import { useTranslation } from 'react-i18next';
import { AppTextPage } from '@sudobility/building_blocks';
import type { TextPageContent } from '@sudobility/building_blocks';
import SEO from '../components/seo/SEO';

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
            items: [
              t('privacyCollectUploadItem1'),
              t('privacyCollectUploadItem2'),
            ],
          },
        ],
      },
      {
        title: t('privacyUseTitle'),
        items: [
          t('privacyUseItem1'),
          t('privacyUseItem2'),
          t('privacyUseItem3'),
        ],
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
        items: [
          t('privacyRightsItem1'),
          t('privacyRightsItem2'),
          t('privacyRightsItem3'),
        ],
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
        email: 'privacy@sudobility.com',
        websiteLabel: t('privacyContactWebsiteLabel'),
        websiteUrl: 'https://sudobility.com',
      },
    },
  };

  return (
    <>
      <SEO title={t('privacyTitle')} canonical="/privacy" />
      <AppTextPage text={text} lastUpdatedDate="2025-02-14" />
    </>
  );
}
