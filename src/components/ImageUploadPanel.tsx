import { useCallback, useRef, useState } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (f: File) => {
      setError(null);
      if (!f.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPG, WEBP, BMP, GIF)');
        return;
      }
      onFileSelect(f);
    },
    [onFileSelect],
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
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Original Image
      </h3>

      {previewUrl && file ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-gray-600 truncate">
              <span className="font-medium">{file.name}</span>
              <span className="text-gray-400 ml-2">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              {imageDimensions && (
                <span className="text-gray-400 ml-2">
                  {imageDimensions.width} x {imageDimensions.height}px
                </span>
              )}
            </div>
            <button
              onClick={onClear}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
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
            Drop an image here or click to upload
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PNG, JPG, WEBP, BMP, GIF
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

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
