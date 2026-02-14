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
        { original: base64, filename: file.name },
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
  }, [file, convertMutation]);

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900">SVGR</h1>
        <p className="mt-2 text-gray-500 text-sm">
          Convert raster images to scalable vector graphics
        </p>
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
