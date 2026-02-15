import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStatus } from '@sudobility/auth-components';
import { useImageConverter, APP_NAME, APP_DOMAIN, QUALITY_MIN, QUALITY_MAX } from '@sudobility/svgr_lib';
import { useSvgrClient } from '../hooks/useSvgrClient';
import SEO from '../components/seo/SEO';
import ImageUploadPanel from '../components/ImageUploadPanel';
import ConvertButton from '../components/ConvertButton';
import SvgPreviewPanel from '../components/SvgPreviewPanel';

export default function ConvertPage() {
  const { t } = useTranslation();
  const { user } = useAuthStatus();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
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
      {/* Header */}
      <div className="text-center py-8 px-4">
        <p className="text-gray-500 text-sm">
          {t('subtitle')}
        </p>
        <p className="mt-1 text-gray-400 text-xs italic">
          {t('pronunciation')}
        </p>
        <p className="mt-3 text-gray-400 text-xs max-w-xl mx-auto">
          {t('description')}
        </p>
        {!user && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate(`/${lang || 'en'}/login`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              {t('loginForFree')}
              <span className="bg-white text-orange-600 text-xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">
                {t('free', 'FREE')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Quality slider */}
      <div className="max-w-md mx-auto w-full px-4 pb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            {t('quality')}
          </label>
          <input
            type="range"
            min={QUALITY_MIN}
            max={QUALITY_MAX}
            value={converter.quality}
            onChange={(e) => converter.setQuality(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 w-16 text-right">
            {converter.quality} / {QUALITY_MAX}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          <span>{t('qualityMin')}</span>
          <span>{t('qualityMax')}</span>
        </div>
      </div>

      {/* Transparent background toggle */}
      <div className="max-w-md mx-auto w-full px-4 pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={converter.transparentBg}
            onChange={(e) => converter.setTransparentBg(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-600">
            {t('transparentBg')}
          </span>
        </label>
      </div>

      {/* Three-column layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 pb-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch min-h-[400px]">
        <ImageUploadPanel
          file={file}
          previewUrl={previewUrl}
          imageDimensions={imageDimensions}
          onFileSelect={handleFileSelect}
          onClear={handleClear}
        />

        <ConvertButton
          disabled={!file}
          loading={converter.isConverting}
          onClick={handleConvert}
        />

        <SvgPreviewPanel
          svg={converter.svgResult}
          filename={file?.name}
        />
      </div>

      {/* Error display */}
      {converter.error && (
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {converter.error}
          </div>
        </div>
      )}
    </main>
  );
}
