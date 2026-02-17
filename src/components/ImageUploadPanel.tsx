import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidImageType } from '@sudobility/svgr_lib';
import { trackButtonClick } from '../analytics';

interface ImageUploadPanelProps {
  file: File | null;
  previewUrl: string | null;
  imageDimensions: { width: number; height: number } | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}

export default function ImageUploadPanel({
  file,
  previewUrl,
  imageDimensions,
  onFileSelect,
  onClear,
}: ImageUploadPanelProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (f: File) => {
      setError(null);
      if (!isValidImageType(f.type)) {
        setError(t('invalidFileType'));
        return;
      }
      trackButtonClick('image_upload', { file_type: f.type, file_size: f.size });
      onFileSelect(f);
    },
    [onFileSelect, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) validateAndSelect(f);
    },
    [validateAndSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) validateAndSelect(f);
    },
    [validateAndSelect],
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {t('originalImage')}
      </h3>

      {/* Image area — fixed 4:3 aspect ratio, matches SvgPreviewPanel */}
      {previewUrl && file ? (
        <div className="relative aspect-[4/3] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
          {/* Info badge overlay */}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded-md px-2 py-1 shadow">
            <span className="text-xs text-white font-medium">
              {imageDimensions && `${imageDimensions.width}x${imageDimensions.height}`}
              {imageDimensions && file && ' · '}
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          {/* Close button overlay */}
          <button
            onClick={() => {
              trackButtonClick('clear_image');
              onClear();
            }}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <span className="text-white text-sm font-semibold leading-none">✕</span>
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`aspect-[4/3] flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-600 font-medium">
            {t('dropOrClick')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {t('supportedFormats')}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* Bottom bar — fixed height, matches SvgPreviewPanel */}
      <div className="h-10 flex items-center mt-2">
        {file && (
          <span className="text-sm font-medium text-gray-700 truncate">
            {file.name}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
