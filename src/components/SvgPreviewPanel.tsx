/**
 * Preview panel displaying the conversion result with download options.
 *
 * Shows a JPEG preview of the converted SVG. The actual SVG is only fetched
 * from the server when the user clicks Download SVG or Download PDF.
 *
 * Downloads are credit-gated: the user must have at least 1 credit.
 * Each download costs 1 credit.
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ui, colors } from '@sudobility/design';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { getBaseName, getSvgDimensions } from '@sudobility/svgr_lib';
import {
  useBalance,
  isConsumablesInitialized,
  getConsumablesInstance,
  notifyBalanceChange,
} from '@sudobility/consumables_client';
import { trackButtonClick, trackEvent, trackError } from '../analytics';
import { DownloadIcon, SpinnerIcon } from './icons';

interface SvgPreviewPanelProps {
  /** JPEG preview object URL, or null if no conversion has completed. */
  previewUrl: string | null;
  /** SVG filename on the server for download. */
  svgFilename: string | null;
  /** Original filename used to derive the download filename. */
  filename: string | null;
  /** Whether a conversion is currently in progress. */
  isConverting: boolean;
  /** SVG file size in bytes, if available. */
  svgSizeBytes: number | null;
  /** Callback to fetch SVG blob from server. */
  onFetchSvg: () => Promise<Blob | null>;
}

export default function SvgPreviewPanel({
  previewUrl,
  svgFilename,
  filename,
  isConverting,
  svgSizeBytes,
  onFetchSvg,
}: SvgPreviewPanelProps) {
  const { t } = useTranslation('conversion');
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { balance } = useBalance();
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const consumeCredit = useCallback(async (downloadFilename: string) => {
    if (!isConsumablesInitialized()) return true;
    try {
      const instance = getConsumablesInstance();
      const result = await instance.recordUsage(downloadFilename);
      notifyBalanceChange();
      return result.success;
    } catch {
      return true;
    }
  }, []);

  const checkBalance = useCallback(() => {
    if (!isConsumablesInitialized()) return true;
    if (balance === null) return true;
    if (balance > 0) return true;
    setInsufficientCredits(true);
    trackEvent('insufficient_credits', { balance });
    return false;
  }, [balance]);

  const handleDownloadSvg = useCallback(async () => {
    if (!svgFilename) return;
    trackButtonClick('download_svg');

    if (!checkBalance()) return;

    setIsDownloading(true);
    try {
      const blob = await onFetchSvg();
      if (!blob) return;

      const downloadName = `${getBaseName(filename ?? undefined)}.svg`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);

      consumeCredit(downloadName);
    } catch (error) {
      console.error('[SvgPreviewPanel] SVG download failed:', error);
      trackError(
        error instanceof Error ? error.message : 'SVG download failed',
        'svg_download_error'
      );
    } finally {
      setIsDownloading(false);
    }
  }, [svgFilename, filename, checkBalance, consumeCredit, onFetchSvg]);

  const handleDownloadPdf = useCallback(async () => {
    if (!svgFilename) return;
    trackButtonClick('download_pdf');

    if (!checkBalance()) return;

    setIsDownloading(true);
    try {
      const blob = await onFetchSvg();
      if (!blob) return;

      const svgText = await blob.text();
      const { width, height } = getSvgDimensions(svgText);

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;

      const orientation = width >= height ? 'landscape' : 'portrait';
      const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });

      await svg2pdf(svgElement, doc, { x: 0, y: 0, width, height });

      const downloadName = `${getBaseName(filename ?? undefined)}.pdf`;
      doc.save(downloadName);

      consumeCredit(downloadName);
    } catch (error) {
      console.error('[SvgPreviewPanel] PDF generation failed:', error);
      trackError(
        error instanceof Error ? error.message : 'PDF generation failed',
        'pdf_generation_error'
      );
    } finally {
      setIsDownloading(false);
    }
  }, [svgFilename, filename, checkBalance, consumeCredit, onFetchSvg]);

  return (
    <div className="flex flex-col">
      <h3 className={`${ui.text.uppercase} mb-3`}>{t('convertedSvg')}</h3>

      {/* Preview area -- fixed 4:3 aspect ratio */}
      {previewUrl ? (
        <div
          className={`relative aspect-[4/3] flex items-center justify-center ${ui.background.subtle} rounded-lg border ${ui.border.default} overflow-hidden`}
        >
          <img
            src={previewUrl}
            alt={t('convertedSvg')}
            className="max-w-full max-h-full object-contain"
          />
          {svgSizeBytes != null && (
            <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-1 shadow">
              <span className="text-xs text-white font-medium">
                {(svgSizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`aspect-[4/3] flex items-center justify-center ${ui.background.subtle} rounded-lg border-2 border-dashed ${ui.border.default}`}
        >
          {isConverting ? (
            <div className="flex flex-col items-center gap-2">
              <SpinnerIcon className={`animate-spin h-8 w-8 ${ui.text.muted}`} />
              <p className={`${ui.text.caption} text-sm`}>{t('converting')}</p>
            </div>
          ) : (
            <p className={ui.text.caption}>{t('svgPlaceholder')}</p>
          )}
        </div>
      )}

      {/* Insufficient credits notice */}
      {insufficientCredits && (
        <div
          className={`mt-2 p-2 ${colors.component.alert.warning.base} ${colors.component.alert.warning.dark} rounded-lg border flex items-center justify-between`}
          role="alert"
        >
          <p className={`text-xs ${ui.text.warning}`}>
            {t('credits.insufficient', 'No credits remaining')}
          </p>
          <button
            onClick={() => {
              setInsufficientCredits(false);
              navigate(`/${lang || 'en'}/credits`);
            }}
            className={`text-xs font-medium ${ui.text.linkSubtle} ml-2`}
          >
            {t('credits.buyMore', 'Buy Credits')}
          </button>
        </div>
      )}

      {/* Download buttons */}
      <div className="h-10 flex items-center justify-end mt-2">
        {svgFilename && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadSvg}
              disabled={isDownloading}
              aria-label={t('downloadSvg', 'Download SVG')}
              className={`flex items-center gap-1.5 text-sm font-medium ${ui.text.linkSubtle} ${isDownloading ? 'opacity-50' : ''}`}
            >
              {isDownloading ? (
                <SpinnerIcon className="animate-spin w-4 h-4" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
              SVG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              aria-label={t('downloadPdf', 'Download PDF')}
              className={`flex items-center gap-1.5 text-sm font-medium ${ui.text.linkSubtle} ${isDownloading ? 'opacity-50' : ''}`}
            >
              {isDownloading ? (
                <SpinnerIcon className="animate-spin w-4 h-4" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
              PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
