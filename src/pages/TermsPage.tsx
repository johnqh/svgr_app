import { useTranslation } from 'react-i18next';
import { AppTextPage } from '@sudobility/building_blocks';
import type { TextPageContent } from '@sudobility/building_blocks';

export default function TermsPage() {
  const { t } = useTranslation();

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
        items: [
          t('termsUseItem1'),
          t('termsUseItem2'),
          t('termsUseItem3'),
          t('termsUseItem4'),
        ],
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
        email: 'legal@sudobility.com',
        websiteLabel: t('termsContactWebsiteLabel'),
        websiteUrl: 'https://sudobility.com',
      },
    },
  };

  return <AppTextPage text={text} lastUpdatedDate="2025-02-14" />;
}
