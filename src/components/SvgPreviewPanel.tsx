import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

interface SvgPreviewPanelProps {
  svg: string | null;
  filename?: string;
}

function getBaseName(filename?: string): string {
  return filename ? filename.replace(/\.[^.]+$/, '') : 'converted';
}

export default function SvgPreviewPanel({
  svg,
  filename,
}: SvgPreviewPanelProps) {
  const { t } = useTranslation();

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
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

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    let width = parseFloat(svgElement.getAttribute('width') || '0');
    let height = parseFloat(svgElement.getAttribute('height') || '0');

    if (width === 0 || height === 0) {
      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4) {
          width = parts[2];
          height = parts[3];
        }
      }
    }

    if (width === 0 || height === 0) {
      width = 800;
      height = 600;
    }

    const orientation = width >= height ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });

    await svg2pdf(svgElement, doc, { x: 0, y: 0, width, height });

    doc.save(`${getBaseName(filename)}.pdf`);
  }, [svg, filename]);

  const svgDataUri = svg
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    : null;

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

      {svgDataUri ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <img
              src={svgDataUri}
              alt={t('convertedSvg')}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            {svg && (
              <span className="text-sm text-gray-500">
                {(new Blob([svg]).size / 1024).toFixed(1)} KB
              </span>
            )}
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
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">
            {t('svgPlaceholder')}
          </p>
        </div>
      )}
    </div>
  );
}
