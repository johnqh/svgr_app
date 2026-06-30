import { useTranslation } from 'react-i18next';
import { ui, colors } from '@sudobility/design';
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
      <h3 className={`mb-2 text-sm font-medium ${ui.text.muted}`}>
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
                ? `${colors.component.alert.info.base} ${colors.component.alert.info.dark}`
                : `${ui.border.default} hover:bg-accent`
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-foreground">{formatSettings(job, t)}</span>
            </div>
            <span className={`text-xs ${ui.text.muted}`}>
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
