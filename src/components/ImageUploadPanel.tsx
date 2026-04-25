/**
 * Image upload panel with drag-and-drop and file picker support.
 *
 * Displays either a drop zone (no image selected) or a preview of the
 * selected image with dimension/size metadata and a clear button.
 *
 * Validates file types against `isValidImageType` from `@sudobility/svgr_lib`
 * and shows an error message for unsupported formats.
 */

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidImageType } from '@sudobility/svgr_lib';
import { ui } from '@sudobility/design';
import { trackButtonClick, trackError } from '../analytics';
import { ImageUploadIcon } from './icons';

interface ImageUploadPanelProps {
  /** The currently selected image file, or null if none selected. */
  file: File | null;
  /** Object URL for the image preview, or null. */
  previewUrl: string | null;
  /** Natural dimensions of the selected image, or null while loading. */
  imageDimensions: { width: number; height: number } | null;
  /** Called when the user selects a valid image file. */
  onFileSelect: (file: File) => void;
  /** Called when the user clears the current selection. */
  onClear: () => void;
}

export default function ImageUploadPanel({
  file,
  previewUrl,
  imageDimensions,
  onFileSelect,
  onClear,
}: ImageUploadPanelProps) {
  const { t } = useTranslation('conversion');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (f: File) => {
      setError(null);
      if (!isValidImageType(f.type)) {
        setError(t('invalidFileType'));
        trackError(f.type, 'invalid_file_type');
        return;
      }
      trackButtonClick('image_upload', { file_type: f.type, file_size: f.size });
      onFileSelect(f);
    },
    [onFileSelect, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) validateAndSelect(f);
    },
    [validateAndSelect]
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

  /** Opens the file picker when the drop zone receives a keyboard Enter or Space. */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) validateAndSelect(f);
    },
    [validateAndSelect]
  );

  return (
    <div className="flex flex-col">
      <h3 className={`${ui.text.uppercase} mb-3`}>{t('originalImage')}</h3>

      {/* Image area -- fixed 4:3 aspect ratio, matches SvgPreviewPanel */}
      {previewUrl && file ? (
        <div
          className={`relative aspect-[4/3] flex items-center justify-center ${ui.background.subtle} rounded-lg border ${ui.border.default} overflow-hidden`}
        >
          <img
            src={previewUrl}
            alt={t('originalImage')}
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
            aria-label={t('clearImage', 'Clear image')}
            className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full ${ui.transition.default}`}
          >
            <span className="text-white text-sm font-semibold leading-none">&#x2715;</span>
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={t('dropOrClick')}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`aspect-[4/3] flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer ${ui.transition.default} ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : `border-gray-300 hover:border-gray-400 ${ui.background.subtle}`
          }`}
        >
          <ImageUploadIcon className={`w-12 h-12 ${ui.text.muted} mb-3`} />
          <p className={`${ui.text.bodySmall} font-medium`}>{t('dropOrClick')}</p>
          <p className={`${ui.text.caption} mt-1`}>{t('supportedFormats')}</p>
        </div>
      )}

      {error && (
        <p className={`mt-2 text-sm ${ui.text.error}`} role="alert">
          {error}
        </p>
      )}

      {/* Bottom bar -- fixed height, matches SvgPreviewPanel */}
      <div className="h-10 flex items-center mt-2">
        {file && <span className={`${ui.text.label} truncate`}>{file.name}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
