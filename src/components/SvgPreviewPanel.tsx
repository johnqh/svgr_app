/**
 * SVG preview panel displaying the conversion result with download options.
 *
 * Renders the converted SVG as an image with dimension/size metadata overlay.
 * Download buttons (SVG and PDF) are credit-gated: the user must have at least
 * 1 credit to download. Each download costs 1 credit.
 *
 * Credit-gating design decisions:
 * - `consumeCredit` silently returns `true` on API errors so that transient
 *   network issues do not block the user from downloading. Usage recording
 *   is treated as "best effort" (fire-and-forget).
 * - `checkBalance` allows downloads when `balance === null` (still loading)
 *   to avoid blocking the user during the initial balance fetch.
 */

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
import { DownloadIcon } from './icons';

interface SvgPreviewPanelProps {
  /** The converted SVG markup string, or null if no conversion has been done. */
  svg: string | null;
  /** Original filename used to derive the download filename. */
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

  /**
   * Records a credit usage for a download. Returns true if the download
   * should proceed. Silently returns true on error so transient failures
   * do not block the user -- usage is recorded asynchronously (best effort).
   */
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

  /**
   * Checks whether the user has sufficient credits for a download.
   * Returns true if the download should proceed.
   *
   * Allows downloads when balance is null (still loading) or when
   * consumables are not initialized (free mode).
   */
  const checkBalance = useCallback(() => {
    // If consumables not initialized, allow download
    if (!isConsumablesInitialized()) return true;
    if (balance === null) return true; // Still loading, allow
    if (balance > 0) return true;
    setInsufficientCredits(true);
    return false;
  }, [balance]);

  /** Triggers an SVG file download after checking the credit balance. */
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

  /**
   * Converts the SVG to PDF using jsPDF + svg2pdf.js and triggers a download.
   * Wrapped in try/catch to handle malformed SVG dimensions or parsing failures
   * gracefully rather than crashing silently.
   */
  const handleDownloadPdf = useCallback(async () => {
    if (!svg) return;
    trackButtonClick('download_pdf');

    if (!checkBalance()) return;

    try {
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
    } catch (error) {
      console.error('[SvgPreviewPanel] PDF generation failed:', error);
    }
  }, [svg, filename, checkBalance, consumeCredit]);

  const svgDataUri = svg
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    : null;

  const dimensions = svg ? getSvgDimensions(svg) : null;
  const fileSizeKB = svg ? getSvgFileSizeKB(svg) : null;

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t('convertedSvg')}
      </h3>

      {/* SVG area -- fixed 4:3 aspect ratio, matches ImageUploadPanel */}
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
        <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-between" role="alert">
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

      {/* Bottom bar -- fixed height, matches ImageUploadPanel */}
      <div className="h-10 flex items-center justify-end mt-2">
        {svg && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadSvg}
              aria-label={t('downloadSvg', 'Download SVG')}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <DownloadIcon className="w-4 h-4" />
              SVG
            </button>
            <button
              onClick={handleDownloadPdf}
              aria-label={t('downloadPdf', 'Download PDF')}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <DownloadIcon className="w-4 h-4" />
              PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
