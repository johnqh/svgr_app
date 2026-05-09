/**
 * Main conversion page using the classic two-panel layout:
 * original image on the left, converted SVG on the right.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppLinks,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@sudobility/components';
import {
  useImageConverter,
  scaleImageWeb,
  QUALITY_MIN,
  QUALITY_MAX,
  IMAGE_TYPES,
} from '@sudobility/svgr_lib';
import type { ImageType } from '@sudobility/svgr_lib';
import { ui, colors } from '@sudobility/design';
import { useSvgrClient } from '../hooks/useSvgrClient';
import { trackButtonClick, trackEvent, trackError, trackPageView } from '../analytics';
import { SEOHead, buildHowToSchema } from '@sudobility/seo_lib';
import ConvertButton from '../components/ConvertButton';
import ImageUploadPanel from '../components/ImageUploadPanel';
import SvgPreviewPanel from '../components/SvgPreviewPanel';
import { ChevronDownIcon } from '../components/icons';

function getImageTypeLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  type: ImageType
) {
  const key = `imageType${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const fallback = type
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return t(key, { defaultValue: fallback });
}

export default function ConvertPage() {
  const { t } = useTranslation('conversion');
  const { t: tContent } = useTranslation('content');
  const { t: tHowTo } = useTranslation('howto');
  const client = useSvgrClient();
  const converter = useImageConverter(client, scaleImageWeb);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  useEffect(() => {
    trackPageView('/convert', 'Convert');
  }, []);

  const previewUrlRef = useRef<string | null>(null);

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
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      setFile(f);
      const url = URL.createObjectURL(f);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setImageDimensions(null);
      setSettingsExpanded(true);
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
    setSettingsExpanded(false);

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

  const seoTitle = tContent('seo.home.title');
  const seoDescription = tContent('seo.home.description');
  const rawKeywords = tContent('seo.home.keywords', { returnObjects: true });
  const seoKeywords = Array.isArray(rawKeywords) ? rawKeywords : undefined;

  const rawSteps = tHowTo('home.steps', { returnObjects: true });
  const howToSchema = Array.isArray(rawSteps)
    ? buildHowToSchema(
        tHowTo('home.name'),
        tHowTo('home.description'),
        rawSteps as { name: string; text: string }[]
      )
    : undefined;

  return (
    <main className="flex-1 flex flex-col">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        structuredData={howToSchema}
      />

      <div className="hidden md:block text-center py-8 px-4">
        <p className={ui.text.caption}>{tContent('subtitle')}</p>
        <p className={`mt-1 ${ui.text.muted} text-xs italic`}>{tContent('pronunciation')}</p>
        <p className={`mt-3 ${ui.text.muted} text-xs max-w-xl mx-auto`}>
          {tContent('description')}
        </p>
      </div>

      <div className="flex-1 min-h-0 w-full">
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ImageUploadPanel
              file={file}
              previewUrl={previewUrl}
              imageDimensions={imageDimensions}
              onFileSelect={handleFileSelect}
              onClear={handleClear}
            />
            <SvgPreviewPanel svg={converter.svgResult} filename={file?.name} />
          </div>
        </div>
      </div>

      {converter.error && (
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div
            className={`${colors.component.alert.error.base} ${colors.component.alert.error.dark} border border-red-200 rounded-lg p-3 text-sm`}
          >
            {converter.error}
          </div>
        </div>
      )}

      <div
        className={`mt-auto sticky bottom-0 z-10 border-t ${ui.border.default} ${ui.background.subtle} px-4 py-3`}
      >
        <div className="max-w-6xl mx-auto space-y-3">
          <button
            type="button"
            onClick={() => setSettingsExpanded(prev => !prev)}
            className={`flex items-center gap-2 ${ui.text.label} cursor-pointer`}
          >
            <span>{t('settings', { defaultValue: 'Settings' })}</span>
            <ChevronDownIcon
              className={`w-3 h-3 transition-transform duration-[250ms] ${settingsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-[250ms] ease-in-out"
            style={{ gridTemplateRows: settingsExpanded ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden min-h-0">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-3">
                <section
                  className={`rounded-lg border ${ui.border.default} ${ui.background.surface} p-4 space-y-4`}
                >
                  <div className={`${ui.text.label}`}>
                    {t('inputSettings', { defaultValue: 'Input' })}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex min-w-[260px] flex-1 items-center gap-2">
                      <span className={`${ui.text.label} whitespace-nowrap`}>{t('imageType')}</span>
                      <Select
                        value={converter.imageType}
                        onValueChange={value => converter.setImageType(value as ImageType)}
                      >
                        <SelectTrigger className="w-full md:max-w-sm">
                          <SelectValue placeholder={t('imageTypeAuto')} />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {getImageTypeLabel(t, type as ImageType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {converter.supportsOcr && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={converter.ocr}
                          onChange={e => converter.setOcr(e.target.checked)}
                          className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${ui.states.focus}`}
                        />
                        <span className={`${ui.text.label} whitespace-nowrap`}>
                          {t('recognizeText')}
                        </span>
                      </label>
                    )}

                    {converter.supportsTransparentBg && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={converter.transparentBg}
                          onChange={e => converter.setTransparentBg(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`${ui.text.label} whitespace-nowrap`}>
                          {t('transparentBg')}
                        </span>
                      </label>
                    )}
                  </div>
                </section>

                <section
                  className={`rounded-lg border ${ui.border.default} ${ui.background.surface} p-4 space-y-4`}
                >
                  <div className={`${ui.text.label}`}>
                    {t('outputSettings', { defaultValue: 'Output' })}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex min-w-[320px] flex-1 items-center gap-3">
                      <label
                        htmlFor="quality-slider"
                        className={`${ui.text.label} whitespace-nowrap`}
                      >
                        {t('quality')}
                      </label>
                      <span className={`text-xs ${ui.text.muted}`}>{t('qualityMin')}</span>
                      <input
                        id="quality-slider"
                        type="range"
                        min={QUALITY_MIN}
                        max={QUALITY_MAX}
                        step="any"
                        value={sliderValue ?? converter.quality}
                        onChange={e => setSliderValue(Number(e.target.value))}
                        onMouseUp={e => {
                          converter.setQuality(
                            Math.round(Number((e.target as HTMLInputElement).value))
                          );
                          setSliderValue(null);
                        }}
                        onTouchEnd={e => {
                          converter.setQuality(
                            Math.round(Number((e.target as HTMLInputElement).value))
                          );
                          setSliderValue(null);
                        }}
                        aria-label={t('quality')}
                        aria-valuemin={QUALITY_MIN}
                        aria-valuemax={QUALITY_MAX}
                        aria-valuenow={converter.quality}
                        className="flex-1"
                      />
                      <span className={`text-xs ${ui.text.muted}`}>{t('qualityMax')}</span>
                      <span className={`text-sm ${ui.text.muted} w-12 text-right`}>
                        {Math.round(sliderValue ?? converter.quality)}/{QUALITY_MAX}
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={converter.mergePaths}
                        onChange={e => converter.setMergePaths(e.target.checked)}
                        className={`w-4 h-4 rounded border-gray-300 text-blue-600 ${ui.states.focus}`}
                      />
                      <span className={`${ui.text.label} whitespace-nowrap`}>
                        {t('mergePaths')}
                      </span>
                    </label>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <ConvertButton
            disabled={!file}
            loading={converter.isConverting}
            onClick={handleConvert}
          />
        </div>
      </div>

      <AppLinks
        label={tContent('appLinks.label')}
        links={[
          { href: 'https://whisperly.dev', logo: '/logos/whisperly.png', alt: 'Whisperly' },
          { href: 'https://signic.email', logo: '/logos/signic.png', alt: 'Signic Email' },
          { href: 'https://shapeshyft.ai', logo: '/logos/shapeshyft.png', alt: 'ShapeShyft' },
          { href: 'https://genuivo.dev', logo: '/logos/genuivo.png', alt: 'Genuivo' },
          { href: 'https://sudojo.com', logo: '/logos/sudojo.png', alt: 'Sudojo' },
          { href: 'https://heavymath.com', logo: '/logos/heavymath.png', alt: 'HeavyMath' },
        ]}
      />
    </main>
  );
}
