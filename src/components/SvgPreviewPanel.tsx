import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { getBaseName, getSvgDimensions, getSvgFileSizeKB } from '@sudobility/svgr_lib';
import {
  useBalance,
  isConsumablesInitialized,
  getConsumablesInstance,
  notifyBalanceChange,
} from '@sudobility/consumables_client';
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
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { balance } = useBalance();
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  const consumeCredit = useCallback(async (downloadFilename: string) => {
    if (!isConsumablesInitialized()) return true; // No consumables = free
    try {
      const instance = getConsumablesInstance();
      const result = await instance.recordUsage(downloadFilename);
      notifyBalanceChange();
      return result.success;
    } catch {
      return true; // Allow download on error (async recording)
    }
  }, []);

  const checkBalance = useCallback(() => {
    // If consumables not initialized, allow download
    if (!isConsumablesInitialized()) return true;
    if (balance === null) return true; // Still loading, allow
    if (balance > 0) return true;
    setInsufficientCredits(true);
    return false;
  }, [balance]);

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
    trackButtonClick('download_svg');

    if (!checkBalance()) return;

    const downloadName = `${getBaseName(filename)}.svg`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);

    // Record usage asynchronously
    consumeCredit(downloadName);
  }, [svg, filename, checkBalance, consumeCredit]);

  const handleDownloadPdf = useCallback(async () => {
    if (!svg) return;
    trackButtonClick('download_pdf');

    if (!checkBalance()) return;

    const { width, height } = getSvgDimensions(svg);

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    const orientation = width >= height ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });

    await svg2pdf(svgElement, doc, { x: 0, y: 0, width, height });

    const downloadName = `${getBaseName(filename)}.pdf`;
    doc.save(downloadName);

    // Record usage asynchronously
    consumeCredit(downloadName);
  }, [svg, filename, checkBalance, consumeCredit]);

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
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t('convertedSvg')}
      </h3>

      {/* SVG area — fixed 4:3 aspect ratio, matches ImageUploadPanel */}
      {svgDataUri ? (
        <div className="relative aspect-[4/3] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
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
        <div className="aspect-[4/3] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">
            {t('svgPlaceholder')}
          </p>
        </div>
      )}

      {/* Insufficient credits notice */}
      {insufficientCredits && (
        <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-between">
          <p className="text-xs text-yellow-800">
            {t('credits.insufficient', 'No credits remaining')}
          </p>
          <button
            onClick={() => {
              setInsufficientCredits(false);
              navigate(`/${lang || 'en'}/credits`);
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 ml-2"
          >
            {t('credits.buyMore', 'Buy Credits')}
          </button>
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
