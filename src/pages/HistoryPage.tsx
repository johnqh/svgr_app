import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ui } from '@sudobility/design';
import { useAuthStatus } from '@sudobility/auth-components';
import { useUserImages, type ImageWithJobs, type JobResult } from '@sudobility/svgr_client';
import type { SvgrClient } from '@sudobility/svgr_client';
import { getBaseName } from '@sudobility/svgr_lib';
import { useSvgrClient } from '../hooks/useSvgrClient';
import { trackButtonClick, trackError } from '../analytics';
import { DownloadIcon, SpinnerIcon } from '../components/icons';

function formatSettings(job: JobResult): string {
  const parts = [`Q${job.quality}`];
  if (job.imageType !== 'auto') parts.push(job.imageType);
  if (job.transparentBg) parts.push('transparent');
  if (!job.ocr) parts.push('no-ocr');
  if (job.smooth > 0) parts.push(`smooth=${job.smooth}`);
  return parts.join(', ');
}

/** Fetches a file via the API and displays it as a thumbnail image. */
function Thumbnail({
  filename,
  alt,
  client,
}: {
  filename: string | undefined;
  alt: string;
  client: SvgrClient;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filename) return;
    let revoke: string | null = null;
    client
      .fetchFile(filename)
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => setUrl(null));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [filename, client]);

  if (!url) {
    return (
      <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
        <span className="text-gray-300 text-xs">--</span>
      </div>
    );
  }

  return (
    <img src={url} alt={alt} className="w-16 h-16 rounded object-cover flex-shrink-0 bg-gray-100" />
  );
}

function ImageCard({ image, client }: { image: ImageWithJobs; client: SvgrClient }) {
  const { t } = useTranslation('conversion');
  const [expanded, setExpanded] = useState(false);
  const [downloadingJob, setDownloadingJob] = useState<string | null>(null);

  const handleDownloadSvg = useCallback(
    async (job: JobResult) => {
      if (!job.svgFilename) return;
      trackButtonClick('history_download_svg');
      setDownloadingJob(job.jobId);
      try {
        const blob = await client.fetchFile(job.svgFilename);
        const downloadName = `${getBaseName(image.originalFilename || undefined)}.svg`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('SVG download failed:', error);
        trackError(
          error instanceof Error ? error.message : 'SVG download failed',
          'history_download_error'
        );
      } finally {
        setDownloadingJob(null);
      }
    },
    [client, image.originalFilename]
  );

  const doneJobs = image.jobs.filter((j: JobResult) => j.status === 'done' && j.svgFilename);
  const latestDoneJob = doneJobs[0];

  return (
    <div
      className={`rounded-lg border ${ui.border.default} ${ui.background.surface} overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Original thumbnail */}
        <Thumbnail
          filename={image.storageFilename}
          alt={image.originalFilename || 'Original'}
          client={client}
        />

        {/* Converted thumbnail (latest done job) */}
        <Thumbnail filename={latestDoneJob?.previewFilename} alt="Converted" client={client} />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`${ui.text.label} truncate`}>
            {image.originalFilename || t('untitled', { defaultValue: 'Untitled' })}
          </p>
          <p className={`text-xs ${ui.text.muted}`}>
            {image.width}x{image.height} &middot; {(image.fileSizeBytes / 1024).toFixed(1)} KB
            &middot; {new Date(image.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs ${ui.text.muted}`}>
            {doneJobs.length} {doneJobs.length === 1 ? 'conversion' : 'conversions'}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && doneJobs.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-3">
          <div className="space-y-1 pt-2">
            {doneJobs.map((job: JobResult) => (
              <div
                key={job.jobId}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Per-job converted thumbnail */}
                  <Thumbnail
                    filename={job.previewFilename}
                    alt={formatSettings(job)}
                    client={client}
                  />
                  <div className="min-w-0">
                    <span className="text-gray-700 truncate block">{formatSettings(job)}</span>
                    <span className={`text-xs ${ui.text.muted}`}>
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {job.svgFilename && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDownloadSvg(job);
                    }}
                    disabled={downloadingJob === job.jobId}
                    className={`flex items-center gap-1 text-xs font-medium ${ui.text.linkSubtle} ${downloadingJob === job.jobId ? 'opacity-50' : ''}`}
                  >
                    {downloadingJob === job.jobId ? (
                      <SpinnerIcon className="animate-spin w-3.5 h-3.5" />
                    ) : (
                      <DownloadIcon className="w-3.5 h-3.5" />
                    )}
                    SVG
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && doneJobs.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className={`text-sm ${ui.text.muted}`}>
            {t('noConversions', { defaultValue: 'No conversions yet' })}
          </p>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation('conversion');
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStatus();
  const client = useSvgrClient();
  const isRegistered = !!user && !user.isAnonymous;

  const { data, isLoading } = useUserImages(client, isRegistered);
  const images = data?.data ?? [];

  if (!isRegistered) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <h2 className={`${ui.text.label} text-lg mb-2`}>
          {t('historyLoginRequired', { defaultValue: 'Sign in to view your history' })}
        </h2>
        <p className={`${ui.text.muted} text-sm mb-4`}>
          {t('historyLoginDescription', {
            defaultValue: 'Create an account to save your conversion history across sessions.',
          })}
        </p>
        <button
          onClick={() => navigate(`/${lang || 'en'}/login`)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {t('signIn', { defaultValue: 'Sign In' })}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className={`${ui.text.label} text-xl mb-6`}>
        {t('history', { defaultValue: 'Conversion History' })}
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <SpinnerIcon className="animate-spin h-8 w-8 text-gray-400" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16">
          <p className={`${ui.text.muted} text-sm`}>
            {t('noHistory', {
              defaultValue: 'No images uploaded yet. Start by converting an image!',
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map(image => (
            <ImageCard key={image.imageId} image={image} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
