import { useTranslation } from 'react-i18next';
import type { JobResult } from '@sudobility/svgr_client';

interface JobHistoryListProps {
  jobs: JobResult[];
  currentJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

function formatSettings(
  job: JobResult,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const parts = [`Q${job.quality}`];
  if (job.imageType !== 'auto') parts.push(job.imageType);
  if (job.transparentBg) parts.push(t('settingTransparent'));
  if (!job.ocr) parts.push(t('settingNoOcr'));
  if (job.smooth > 0) parts.push(`smooth=${job.smooth}`);
  return parts.join(', ');
}

export function JobHistoryList({ jobs, currentJobId, onSelectJob }: JobHistoryListProps) {
  const { t } = useTranslation('conversion');
  const doneJobs = jobs.filter(j => j.status === 'done');

  if (doneJobs.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-gray-600">
        {t('jobHistory', 'Conversion History')}
      </h3>
      <div className="space-y-1">
        {doneJobs.map(job => (
          <button
            key={job.jobId}
            type="button"
            onClick={() => onSelectJob(job.jobId)}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
              job.jobId === currentJobId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{formatSettings(job, t)}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(
                /[Z+-]\d/.test(job.createdAt) || job.createdAt.endsWith('Z')
                  ? job.createdAt
                  : job.createdAt + 'Z'
              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
