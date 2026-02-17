import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useImageConverter, APP_NAME, APP_DOMAIN, QUALITY_MIN, QUALITY_MAX } from '@sudobility/svgr_lib';
import { useSvgrClient } from '../hooks/useSvgrClient';
import { trackButtonClick } from '../analytics';
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

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setImageDimensions(null);
    converter.reset();

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, [converter]);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    converter.reset();
  }, [previewUrl, converter]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    trackButtonClick('convert_to_svg', { file_type: file.type, file_size: file.size });

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      converter.convert(base64, file.name);
    };
    reader.readAsDataURL(file);
  }, [file, converter]);

  return (
    <main className="flex-1 flex flex-col">
      <SEO
        description={t('subtitle')}
        keywords="svg converter, raster to vector, png to svg, jpg to svg, webp to svg, image conversion, vector graphics, ai logo converter"
        canonical="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: APP_NAME,
          url: `https://${APP_DOMAIN}`,
          applicationCategory: "DesignApplication",
          operatingSystem: "Any",
          description: t('subtitle'),
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }}
      />
      {/* Header — hidden on mobile to save space */}
      <div className="hidden md:block text-center py-8 px-4">
        <p className="text-gray-500 text-sm">
          {t('subtitle')}
        </p>
        <p className="mt-1 text-gray-400 text-xs italic">
          {t('pronunciation')}
        </p>
        <p className="mt-3 text-gray-400 text-xs max-w-xl mx-auto">
          {t('description')}
        </p>
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

        <SvgPreviewPanel
          svg={converter.svgResult}
          filename={file?.name}
        />
      </div>

      {/* Error display */}
      {converter.error && (
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {converter.error}
          </div>
        </div>
      )}

      {/* Controls bar — always at bottom, sticky when scrolling */}
      <div className="mt-auto sticky bottom-0 z-10 border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Quality slider */}
          <div className="w-full md:w-auto md:flex-1 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
              {t('quality')}
            </label>
            <span className="text-xs text-gray-400">{t('qualityMin')}</span>
            <input
              type="range"
              min={QUALITY_MIN}
              max={QUALITY_MAX}
              value={converter.quality}
              onChange={(e) => converter.setQuality(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-gray-400">{t('qualityMax')}</span>
            <span className="text-sm text-gray-500 w-12 text-right">
              {converter.quality}/{QUALITY_MAX}
            </span>
          </div>

          {/* Transparent background toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={converter.transparentBg}
              onChange={(e) => converter.setTransparentBg(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
              {t('transparentBg')}
            </span>
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
