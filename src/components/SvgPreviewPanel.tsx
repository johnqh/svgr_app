import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { getBaseName, getSvgDimensions, getSvgFileSizeKB } from '@sudobility/svgr_lib';
import { trackButtonClick } from '../analytics';

interface SvgPreviewPanelProps {
  svg: string | null;
  filename?: string;
}

export default function SvgPreviewPanel({
  svg,
  filename,
}: SvgPreviewPanelProps) {
  const { t } = useTranslation();

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
    trackButtonClick('download_svg');
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getBaseName(filename)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [svg, filename]);

  const handleDownloadPdf = useCallback(async () => {
    if (!svg) return;
    trackButtonClick('download_pdf');

    const { width, height } = getSvgDimensions(svg);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    const orientation = width >= height ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });

    await svg2pdf(svgElement, doc, { x: 0, y: 0, width, height });

    doc.save(`${getBaseName(filename)}.pdf`);
  }, [svg, filename]);

  const svgDataUri = svg
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    : null;

  const dimensions = svg ? getSvgDimensions(svg) : null;
  const fileSizeKB = svg ? getSvgFileSizeKB(svg) : null;

  const downloadIcon = (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t('convertedSvg')}
      </h3>

      {/* SVG area — flex-1, matches ImageUploadPanel */}
      {svgDataUri ? (
        <div className="relative flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <img
            src={svgDataUri}
            alt={t('convertedSvg')}
            className="max-w-full max-h-full object-contain"
          />
          {/* Info badge overlay */}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-1 shadow">
            <span className="text-xs text-white font-medium">
              {dimensions && `${dimensions.width}x${dimensions.height}`}
              {dimensions && fileSizeKB && ' · '}
              {fileSizeKB}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">
            {t('svgPlaceholder')}
          </p>
        </div>
      )}

      {/* Bottom bar — fixed height, matches ImageUploadPanel */}
      <div className="h-10 flex items-center justify-end mt-2">
        {svg && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {downloadIcon}
              SVG
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {downloadIcon}
              PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
