/**
 * Main conversion page -- the primary feature of the SVGR app.
 *
 * Provides a two-panel layout: image upload (left) and SVG preview (right),
 * with a bottom control bar for quality adjustment and conversion trigger.
 *
 * Flow:
 * 1. User uploads an image via drag-drop or file picker (`ImageUploadPanel`)
 * 2. Adjusts quality slider and transparent background toggle
 * 3. Clicks the convert button -- calls the SVGR API (free, no auth required)
 * 4. Result appears in `SvgPreviewPanel` with download buttons (credit-gated)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useImageConverter,
  APP_NAME,
  APP_DOMAIN,
  QUALITY_MIN,
  QUALITY_MAX,
} from '@sudobility/svgr_lib';
import { ui, colors } from '@sudobility/design';
import { useSvgrClient } from '../hooks/useSvgrClient';
import { trackButtonClick, trackEvent, trackError, trackPageView } from '../analytics';
import SEO from '../components/seo/SEO';
import ImageUploadPanel from '../components/ImageUploadPanel';
import ConvertButton from '../components/ConvertButton';
import SvgPreviewPanel from '../components/SvgPreviewPanel';

export default function ConvertPage() {
  const { t } = useTranslation();
  const client = useSvgrClient();
  const converter = useImageConverter(client);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    trackPageView('/convert', 'Convert');
  }, []);

  // Track the current object URL in a ref so the cleanup effect can revoke
  // it on unmount without needing previewUrl in its dependency array.
  const previewUrlRef = useRef<string | null>(null);

  // Revoke the object URL when the component unmounts to prevent memory leaks
  // (Item 6: consolidate object URL memory management).
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (converter.svgResult) {
      trackEvent('conversion_success');
    }
  }, [converter.svgResult]);

  useEffect(() => {
    if (converter.error) {
      trackError(converter.error, 'conversion_error');
    }
  }, [converter.error]);

  const handleFileSelect = useCallback(
    (f: File) => {
      // Revoke the previous object URL before creating a new one
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      setFile(f);
      const url = URL.createObjectURL(f);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setImageDimensions(null);
      converter.reset();

      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    },
    [converter]
  );

  const handleClear = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    converter.reset();
  }, [converter]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    trackButtonClick('convert_to_svg', { file_type: file.type, file_size: file.size });

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      converter.convert(base64, file.name);
    };
    reader.onerror = () => {
      console.error('[ConvertPage] FileReader failed:', reader.error);
      trackError(reader.error?.message || 'FileReader failed', 'file_read_error');
      converter.reset();
    };
    reader.readAsDataURL(file);
  }, [file, converter]);

  return (
    <main className="flex-1 flex flex-col">
      <SEO
        title={t('seo.home.title')}
        description={t('seo.home.description')}
        keywords={t('seo.home.keywords')}
        canonical="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: APP_NAME,
          url: `https://${APP_DOMAIN}`,
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Any',
          description: t('subtitle'),
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        }}
      />
      {/* Header -- hidden on mobile to save space */}
      <div className="hidden md:block text-center py-8 px-4">
        <p className={ui.text.caption}>{t('subtitle')}</p>
        <p className={`mt-1 ${ui.text.muted} text-xs italic`}>{t('pronunciation')}</p>
        <p className={`mt-3 ${ui.text.muted} text-xs max-w-xl mx-auto`}>{t('description')}</p>
      </div>

      {/* Two-column panels */}
      <div className="max-w-6xl w-full mx-auto px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageUploadPanel
          file={file}
          previewUrl={previewUrl}
          imageDimensions={imageDimensions}
          onFileSelect={handleFileSelect}
          onClear={handleClear}
        />

        <SvgPreviewPanel svg={converter.svgResult} filename={file?.name} />
      </div>

      {/* Error display */}
      {converter.error && (
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div
            className={`${colors.component.alert.error.base} ${colors.component.alert.error.dark} border border-red-200 rounded-lg p-3 text-sm`}
          >
            {converter.error}
          </div>
        </div>
      )}

      {/* Controls bar — always at bottom, sticky when scrolling */}
      <div
        className={`mt-auto sticky bottom-0 z-10 border-t ${ui.border.default} ${ui.background.subtle} px-4 py-3`}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Quality slider */}
          <div className="w-full md:w-auto md:flex-1 flex items-center gap-3">
            <label htmlFor="quality-slider" className={`${ui.text.label} whitespace-nowrap`}>
              {t('quality')}
            </label>
            <span className={`text-xs ${ui.text.muted}`}>{t('qualityMin')}</span>
            <input
              id="quality-slider"
              type="range"
              min={QUALITY_MIN}
              max={QUALITY_MAX}
              value={converter.quality}
              onChange={e => converter.setQuality(Number(e.target.value))}
              aria-label={t('quality')}
              aria-valuemin={QUALITY_MIN}
              aria-valuemax={QUALITY_MAX}
              aria-valuenow={converter.quality}
              className="flex-1"
            />
            <span className={`text-xs ${ui.text.muted}`}>{t('qualityMax')}</span>
            <span className={`text-sm ${ui.text.muted} w-12 text-right`}>
              {converter.quality}/{QUALITY_MAX}
            </span>
          </div>

          {/* Transparent background toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={converter.transparentBg}
              onChange={e => converter.setTransparentBg(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`${ui.text.label} whitespace-nowrap`}>{t('transparentBg')}</span>
          </label>

          {/* Recognize text toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={converter.ocr}
              onChange={e => converter.setOcr(e.target.checked)}
              className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${ui.states.focus}`}
            />
            <span className={`${ui.text.label} whitespace-nowrap`}>{t('recognizeText')}</span>
          </label>

          {/* Merge paths toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={converter.mergePaths}
              onChange={e => converter.setMergePaths(e.target.checked)}
              className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${ui.states.focus}`}
            />
            <span className={`${ui.text.label} whitespace-nowrap`}>{t('mergePaths')}</span>
          </label>

          {/* Convert button — full width row */}
          <div className="w-full">
            <ConvertButton
              disabled={!file}
              loading={converter.isConverting}
              onClick={handleConvert}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
