import { useState, useCallback } from 'react';
import { useConvert } from '@sudobility/svgr_client';
import { useSvgrClient } from '../hooks/useSvgrClient';
import ImageUploadPanel from '../components/ImageUploadPanel';
import ConvertButton from '../components/ConvertButton';
import SvgPreviewPanel from '../components/SvgPreviewPanel';

export default function ConvertPage() {
  const client = useSvgrClient();
  const convertMutation = useConvert(client);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [svgResult, setSvgResult] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [quality, setQuality] = useState(5);
  const [transparentBg, setTransparentBg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setSvgResult(null);
    setImageDimensions(null);
    setError(null);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, []);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setSvgResult(null);
    setImageDimensions(null);
    setError(null);
  }, [previewUrl]);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      convertMutation.mutate(
        { original: base64, filename: file.name, quality, transparentBg },
        {
          onSuccess: (response) => {
            if (response.success && response.data) {
              setSvgResult(response.data.svg);
            } else {
              setError(
                (response as { error?: string }).error || 'Conversion failed',
              );
            }
          },
          onError: (err) => {
            setError(
              err instanceof Error ? err.message : 'Conversion failed',
            );
          },
        },
      );
    };
    reader.readAsDataURL(file);
  }, [file, convertMutation, quality, transparentBg]);

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900">SVGR</h1>
        <p className="mt-2 text-gray-500 text-sm">
          Convert raster images to scalable vector graphics
        </p>
      </div>

      {/* Quality slider */}
      <div className="max-w-md mx-auto w-full px-4 pb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            Quality
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-500 w-16 text-right">
            {quality} / 10
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          <span>Smaller file</span>
          <span>Higher fidelity</span>
        </div>
      </div>

      {/* Transparent background toggle */}
      <div className="max-w-md mx-auto w-full px-4 pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={(e) => setTransparentBg(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-600">
            Transparent background
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
          loading={convertMutation.isPending}
          onClick={handleConvert}
        />

        <SvgPreviewPanel
          svg={svgResult}
          filename={file?.name}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}
    </main>
  );
}
