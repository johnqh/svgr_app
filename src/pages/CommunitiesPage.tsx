import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useCommunities } from '@sudobility/svgr_lib';
import type { Community, CommunityPlatform } from '@sudobility/svgr_lib';
import { SEOHead } from '@sudobility/seo_lib';
import { trackPageView } from '../analytics';
import { useSvgrClient } from '../hooks/useSvgrClient';

const PLATFORM_LABELS: Record<CommunityPlatform, string> = {
  forum: 'Forums',
  discord: 'Discord',
  reddit: 'Reddit',
  telegram: 'Telegram',
  slack: 'Slack',
  facebook: 'Facebook',
  youtube: 'YouTube',
  other: 'Other',
};

export default function CommunitiesPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'en';
  const client = useSvgrClient();
  const { communities, communitiesByPlatform, isLoading } = useCommunities(client, currentLang);

  useEffect(() => {
    trackPageView('/communities', 'Communities');
  }, []);

  return (
    <>
      <SEOHead
        title={t('seo.communities.title', 'Designer Communities - SVGR')}
        description={t(
          'seo.communities.description',
          'Find designer communities for vector graphics, SVG conversion, and logo design.'
        )}
      />
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('communities.title', 'Designer Communities')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t(
            'communities.subtitle',
            'Connect with designers and get help with vector graphics, SVG conversion, and logo design.'
          )}
        </p>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && communities.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-12">
            {t('communities.emptyState', 'No communities found for this language.')}
          </p>
        )}

        {!isLoading &&
          Array.from(communitiesByPlatform.entries()).map(([platform, items]) => (
            <section key={platform} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {PLATFORM_LABELS[platform] || platform}
              </h2>
              <div className="space-y-3">
                {items.map(community => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </div>
            </section>
          ))}
      </div>
    </>
  );
}

function CommunityCard({ community }: { community: Community }) {
  const { t } = useTranslation();
  return (
    <a
      href={community.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        {community.iconUrl ? (
          <img
            src={community.iconUrl}
            alt=""
            className="w-8 h-8 rounded flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 dark:text-indigo-300 text-sm font-bold">
              {community.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{community.name}</h3>
            {community.nameEnglish && community.nameEnglish !== community.name && (
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                ({community.nameEnglish})
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {community.description}
          </p>
        </div>
        <span className="text-indigo-600 dark:text-indigo-400 text-sm flex-shrink-0">
          {t('communities.visitButton', 'Visit')} →
        </span>
      </div>
    </a>
  );
}
