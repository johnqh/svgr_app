import { useTranslation } from 'react-i18next';
import type { JobResult } from '@sudobility/svgr_client';

interface JobHistoryListProps {
  jobs: JobResult[];
  currentJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

function formatSettings(job: JobResult): string {
  const parts = [`Q${job.quality}`];
  if (job.imageType !== 'auto') parts.push(job.imageType);
  if (job.transparentBg) parts.push('transparent');
  if (!job.ocr) parts.push('no-ocr');
  if (job.smooth > 0) parts.push(`smooth=${job.smooth}`);
  return parts.join(', ');
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    processing: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[status] ?? colors.pending}`}
    >
      {status}
    </span>
  );
}

export function JobHistoryList({
  jobs,
  currentJobId,
  onSelectJob,
}: JobHistoryListProps) {
  const { t } = useTranslation('conversion');

  if (jobs.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-gray-600">
        {t('jobHistory', 'Conversion History')}
      </h3>
      <div className="space-y-1">
        {jobs.map(job => (
          <button
            key={job.jobId}
            type="button"
            onClick={() => onSelectJob(job.jobId)}
            disabled={job.status !== 'done'}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              job.jobId === currentJobId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            } ${job.status !== 'done' ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              <span className="text-gray-700">{formatSettings(job)}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(job.createdAt).toLocaleTimeString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
