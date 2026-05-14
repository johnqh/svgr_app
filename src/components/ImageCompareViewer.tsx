import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ui } from '@sudobility/design';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import {
  getBaseName,
  getSvgDimensions,
  getSvgFileSizeKB,
  isValidImageType,
} from '@sudobility/svgr_lib';
import {
  useBalance,
  isConsumablesInitialized,
  getConsumablesInstance,
  notifyBalanceChange,
} from '@sudobility/consumables_client';
import { trackButtonClick, trackEvent, trackError } from '../analytics';
import { DownloadIcon, ImageUploadIcon } from './icons';

interface ImageCompareViewerProps {
  file: File | null;
  previewUrl: string | null;
  imageDimensions: { width: number; height: number } | null;
  svg: string | null;
  /** JPEG preview URL from job system (takes priority over svg rasterization). */
  jobPreviewUrl?: string | null;
  filename?: string;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}

type DragMode = 'split' | 'pan' | null;
type PreviewErrorCode = 'preview_generation_failed' | null;

const MAX_SCALE = 4;
const MIN_SCALE = 1;
const ZOOM_STEP = 0.2;
const MAX_PREVIEW_DIMENSION = 2400;

async function rasterizeSvgPreview(
  svg: string,
  imageDimensions: { width: number; height: number } | null
): Promise<string> {
  const { width: svgWidth, height: svgHeight } = getSvgDimensions(svg);
  const sourceWidth = svgWidth || imageDimensions?.width || 1;
  const sourceHeight = svgHeight || imageDimensions?.height || 1;
  const scale = Math.min(1, MAX_PREVIEW_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVG preview image failed to load'));
      image.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('PNG preview generation failed'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });

    return URL.createObjectURL(pngBlob);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export default function ImageCompareViewer({
  file,
  previewUrl,
  imageDimensions,
  svg,
  jobPreviewUrl,
  filename,
  onFileSelect,
  onClear,
}: ImageCompareViewerProps) {
  const { t } = useTranslation('conversion');
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { balance } = useBalance();
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragModeRef = useRef<DragMode>(null);
  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(
    null
  );
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [renderErrorUrl, setRenderErrorUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    svg: string | null;
    url: string | null;
    error: PreviewErrorCode;
  }>({
    svg: null,
    url: null,
    error: null,
  });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const comparisonSessionKey = `${previewUrl ?? ''}::${svg ?? ''}`;
  const [comparisonState, setComparisonState] = useState<{
    key: string;
    splitPercent: number;
    scale: number;
    offset: { x: number; y: number };
  }>({
    key: '',
    splitPercent: 50,
    scale: 1,
    offset: { x: 0, y: 0 },
  });

  const activePreview = previewState.svg === svg ? previewState : { svg, url: null, error: null };
  const svgPreviewUrl = activePreview.url;
  const previewError = activePreview.error;
  const renderError = svgPreviewUrl != null && renderErrorUrl === svgPreviewUrl;
  const activeComparisonState = useMemo(
    () =>
      comparisonState.key === comparisonSessionKey
        ? comparisonState
        : {
            key: comparisonSessionKey,
            splitPercent: 50,
            scale: 1,
            offset: { x: 0, y: 0 },
          },
    [comparisonSessionKey, comparisonState]
  );
  const splitPercent = activeComparisonState.splitPercent;
  const scale = activeComparisonState.scale;
  const offset = activeComparisonState.offset;

  const fileSizeKB = svg ? getSvgFileSizeKB(svg) : null;

  const fittedSize = useMemo(() => {
    if (!imageDimensions || stageSize.width === 0 || stageSize.height === 0) {
      return null;
    }

    const widthRatio = stageSize.width / imageDimensions.width;
    const heightRatio = stageSize.height / imageDimensions.height;
    const fitScale = Math.min(widthRatio, heightRatio);

    return {
      width: imageDimensions.width * fitScale,
      height: imageDimensions.height * fitScale,
    };
  }, [imageDimensions, stageSize.height, stageSize.width]);

  const clampOffset = useCallback(
    (nextX: number, nextY: number, nextScale = scale) => {
      if (!fittedSize) return { x: 0, y: 0 };

      const maxX = Math.max(0, (fittedSize.width * nextScale - fittedSize.width) / 2);
      const maxY = Math.max(0, (fittedSize.height * nextScale - fittedSize.height) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY)),
      };
    },
    [fittedSize, scale]
  );

  const effectiveOffset = useMemo(
    () => clampOffset(offset.x, offset.y, scale),
    [clampOffset, offset.x, offset.y, scale]
  );

  const mediaFrame = useMemo(() => {
    if (!fittedSize) return null;

    const width = fittedSize.width * scale;
    const height = fittedSize.height * scale;
    const left = stageSize.width / 2 - width / 2 + effectiveOffset.x;
    const top = stageSize.height / 2 - height / 2 + effectiveOffset.y;

    return {
      left,
      top,
      width,
      height,
      splitX: left + width * (splitPercent / 100),
    };
  }, [
    effectiveOffset.x,
    effectiveOffset.y,
    fittedSize,
    scale,
    splitPercent,
    stageSize.height,
    stageSize.width,
  ]);

  useEffect(() => {
    let cancelled = false;
    let nextUrl: string | null = null;

    // If we have a server-provided JPEG preview, use it directly
    if (jobPreviewUrl) {
      setPreviewState({ svg: svg ?? '', url: jobPreviewUrl, error: null });
      return;
    }

    if (!svg) {
      return;
    }

    rasterizeSvgPreview(svg, imageDimensions)
      .then(url => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        nextUrl = url;
        setPreviewState({ svg, url, error: null });
      })
      .catch(error => {
        trackError(
          error instanceof Error ? error.message : 'SVG preview generation failed',
          'svg_preview_error'
        );
        if (!cancelled) {
          setPreviewState({ svg, url: null, error: 'preview_generation_failed' });
        }
      });

    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [imageDimensions, svg, jobPreviewUrl]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const validateAndSelect = useCallback(
    (nextFile: File) => {
      setUploadError(null);
      if (!isValidImageType(nextFile.type)) {
        setUploadError(t('invalidFileType'));
        trackError(nextFile.type, 'invalid_file_type');
        return;
      }
      trackButtonClick('image_upload', { file_type: nextFile.type, file_size: nextFile.size });
      onFileSelect(nextFile);
    },
    [onFileSelect, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) validateAndSelect(droppedFile);
    },
    [validateAndSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleBrowseKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = e.target.files?.[0];
      if (nextFile) validateAndSelect(nextFile);
    },
    [validateAndSelect]
  );

  const clampSplit = useCallback(
    (clientX: number) => {
      const stage = stageRef.current;
      if (!stage || !mediaFrame) return;
      const rect = stage.getBoundingClientRect();
      const localX = clientX - rect.left;
      const ratio = (localX - mediaFrame.left) / mediaFrame.width;
      const next = Math.max(0, Math.min(100, ratio * 100));
      setComparisonState({
        ...activeComparisonState,
        splitPercent: next,
      });
    },
    [activeComparisonState, mediaFrame]
  );

  const updateScale = useCallback(
    (nextScale: number, anchorX?: number, anchorY?: number) => {
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));

      if (!fittedSize || stageSize.width === 0 || stageSize.height === 0) {
        setComparisonState({
          key: comparisonSessionKey,
          splitPercent,
          scale: clampedScale,
          offset: clampedScale === 1 ? { x: 0, y: 0 } : effectiveOffset,
        });
        return;
      }

      if (clampedScale === 1) {
        setComparisonState({
          key: comparisonSessionKey,
          splitPercent,
          scale: 1,
          offset: { x: 0, y: 0 },
        });
        return;
      }

      const focusX = anchorX ?? stageSize.width / 2;
      const focusY = anchorY ?? stageSize.height / 2;
      const relativeX = focusX - stageSize.width / 2 - effectiveOffset.x;
      const relativeY = focusY - stageSize.height / 2 - effectiveOffset.y;
      const scaleRatio = clampedScale / scale;
      const nextOffset = clampOffset(
        effectiveOffset.x - relativeX * (scaleRatio - 1),
        effectiveOffset.y - relativeY * (scaleRatio - 1),
        clampedScale
      );

      setComparisonState({
        key: comparisonSessionKey,
        splitPercent,
        scale: clampedScale,
        offset: nextOffset,
      });
    },
    [
      clampOffset,
      comparisonSessionKey,
      effectiveOffset,
      fittedSize,
      scale,
      splitPercent,
      stageSize.height,
      stageSize.width,
    ]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!previewUrl || !fittedSize) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const anchorX = e.clientX - rect.left;
      const anchorY = e.clientY - rect.top;
      const zoomDelta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      updateScale(scale + zoomDelta, anchorX, anchorY);
    },
    [fittedSize, previewUrl, scale, updateScale]
  );

  const handleResetZoom = useCallback(() => {
    setComparisonState({
      key: comparisonSessionKey,
      splitPercent,
      scale: 1,
      offset: { x: 0, y: 0 },
    });
  }, [comparisonSessionKey, splitPercent]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!previewUrl) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const anchorX = e.clientX - rect.left;
      const anchorY = e.clientY - rect.top;
      if (scale > 1) {
        handleResetZoom();
      } else {
        updateScale(2, anchorX, anchorY);
      }
    },
    [handleResetZoom, previewUrl, scale, updateScale]
  );

  const beginSplitDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!svgPreviewUrl || renderError) return;
      e.preventDefault();
      dragModeRef.current = 'split';
      e.currentTarget.setPointerCapture(e.pointerId);
      clampSplit(e.clientX);
    },
    [clampSplit, renderError, svgPreviewUrl]
  );

  const handleSplitPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      clampSplit(e.clientX);
    },
    [clampSplit]
  );

  const handleSplitPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const beginPanDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (scale <= 1 || !fittedSize) return;
      e.preventDefault();
      dragModeRef.current = 'pan';
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: effectiveOffset.x,
        offsetY: effectiveOffset.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [effectiveOffset.x, effectiveOffset.y, fittedSize, scale]
  );

  const handlePanPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      if (dragModeRef.current !== 'pan' || !panStartRef.current) return;

      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setComparisonState({
        key: comparisonSessionKey,
        splitPercent,
        scale,
        offset: clampOffset(panStartRef.current.offsetX + dx, panStartRef.current.offsetY + dy),
      });
    },
    [clampOffset, comparisonSessionKey, scale, splitPercent]
  );

  const handlePanPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    panStartRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleStagePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

      if (dragModeRef.current === 'split') {
        clampSplit(e.clientX);
        return;
      }

      if (dragModeRef.current === 'pan' && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setComparisonState({
          key: comparisonSessionKey,
          splitPercent,
          scale,
          offset: clampOffset(panStartRef.current.offsetX + dx, panStartRef.current.offsetY + dy),
        });
      }
    },
    [clampOffset, clampSplit, comparisonSessionKey, scale, splitPercent]
  );

  const handleStagePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragModeRef.current = null;
    panStartRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

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

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
    trackButtonClick('download_svg');
    if (!checkBalance()) return;

    const downloadName = `${getBaseName(filename)}.svg`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadName;
    anchor.click();
    URL.revokeObjectURL(url);
    consumeCredit(downloadName);
  }, [svg, filename, checkBalance, consumeCredit]);

  const handleDownloadPdf = useCallback(async () => {
    if (!svg) return;
    trackButtonClick('download_pdf');
    if (!checkBalance()) return;

    try {
      const { width, height } = getSvgDimensions(svg);
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      const orientation = width >= height ? 'landscape' : 'portrait';
      const doc = new jsPDF({ orientation, unit: 'px', format: [width, height] });
      await svg2pdf(svgElement, doc, { x: 0, y: 0, width, height });
      const downloadName = `${getBaseName(filename)}.pdf`;
      doc.save(downloadName);
      consumeCredit(downloadName);
    } catch (error) {
      console.error('[ImageCompareViewer] PDF generation failed:', error);
      trackError(
        error instanceof Error ? error.message : 'PDF generation failed',
        'pdf_generation_error'
      );
    }
  }, [svg, filename, checkBalance, consumeCredit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={stageRef}
        className={`relative min-h-[320px] flex-1 overflow-hidden rounded-2xl border ${ui.border.default} ${ui.background.surface}`}
        onWheel={handleWheel}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {previewUrl && file ? (
          <>
            <div
              className={`absolute inset-0 ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
              onPointerDown={beginPanDrag}
              onPointerMove={handlePanPointerMove}
              onPointerUp={handlePanPointerUp}
              onPointerCancel={handlePanPointerUp}
            >
              {fittedSize && (
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: `${fittedSize.width}px`,
                    height: `${fittedSize.height}px`,
                    transform: `translate(calc(-50% + ${effectiveOffset.x}px), calc(-50% + ${effectiveOffset.y}px)) scale(${scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={t('originalImage')}
                    className="absolute inset-0 h-full w-full object-contain"
                    draggable={false}
                  />

                  {svgPreviewUrl && !renderError && (
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ clipPath: `inset(0 0 0 ${splitPercent}%)` }}
                    >
                      <img
                        src={svgPreviewUrl}
                        alt={t('convertedSvg')}
                        className="absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                        onError={() => {
                          setRenderErrorUrl(svgPreviewUrl);
                          trackError(
                            'SVG preview image failed to render',
                            'svg_preview_render_error'
                          );
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {svgPreviewUrl && !renderError && mediaFrame && (
              <div
                className="absolute z-10 w-12 -translate-x-1/2 cursor-ew-resize touch-none"
                style={{
                  left: `${mediaFrame.splitX}px`,
                  top: `${mediaFrame.top}px`,
                  height: `${mediaFrame.height}px`,
                }}
                onPointerDown={e => {
                  e.stopPropagation();
                  beginSplitDrag(e);
                }}
                onPointerMove={handleSplitPointerMove}
                onPointerUp={handleSplitPointerUp}
                onPointerCancel={handleSplitPointerUp}
              >
                <div
                  className="absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.15)]"
                  style={{ left: 'calc(50% - 0.5px)' }}
                />
                <div
                  className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-slate-900/70 text-white shadow-lg backdrop-blur-sm"
                  style={{ left: '50%' }}
                >
                  <span className="text-lg leading-none">↔</span>
                </div>
              </div>
            )}

            {!svgPreviewUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-dashed border-slate-300 bg-white/75 px-5 py-2 text-sm font-medium text-slate-500 backdrop-blur-sm">
                  {t('svgPlaceholder')}
                </div>
              </div>
            )}

            {(previewError || renderError) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-dashed border-slate-300 bg-white/75 px-5 py-2 text-sm font-medium text-slate-500 backdrop-blur-sm">
                  {t('svgPlaceholder')}
                </div>
              </div>
            )}

            <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white shadow">
              {t('originalImage')}
            </div>

            {svgPreviewUrl && !renderError && (
              <div className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white shadow">
                {t('convertedSvg')}
              </div>
            )}

            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
              <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white shadow">
                {imageDimensions && `${imageDimensions.width}×${imageDimensions.height}`}
                {imageDimensions && file && ' · '}
                {(file.size / 1024).toFixed(1)} KB
              </div>
              {fileSizeKB && (
                <div className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white shadow">
                  SVG · {fileSizeKB} KB
                </div>
              )}
            </div>

            <div className="absolute right-4 top-16 z-20 flex flex-col gap-2 sm:right-4 sm:top-4 sm:flex-row sm:items-center">
              <div
                className="flex items-center gap-3 rounded-full bg-white/85 px-3 py-2 shadow backdrop-blur-sm"
                onPointerDown={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => updateScale(scale - ZOOM_STEP)}
                  aria-label={t('zoomOut', { defaultValue: 'Zoom out' })}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  −
                </button>
                <button
                  onClick={handleResetZoom}
                  aria-label={t('resetZoom', { defaultValue: 'Reset zoom' })}
                  className="min-w-[3.75rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  onClick={() => updateScale(scale + ZOOM_STEP)}
                  aria-label={t('zoomIn', { defaultValue: 'Zoom in' })}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  +
                </button>
              </div>

              {svg && (
                <>
                  <button
                    onClick={handleDownloadSvg}
                    aria-label={t('downloadSvg', 'Download SVG')}
                    className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow backdrop-blur-sm transition hover:bg-white"
                    onPointerDown={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                  >
                    <DownloadIcon className="h-4 w-4" />
                    SVG
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    aria-label={t('downloadPdf', 'Download PDF')}
                    className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow backdrop-blur-sm transition hover:bg-white"
                    onPointerDown={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                  >
                    <DownloadIcon className="h-4 w-4" />
                    PDF
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  trackButtonClick('clear_image');
                  onClear();
                }}
                aria-label={t('clearImage', 'Clear image')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-sm font-semibold leading-none text-white shadow transition hover:bg-black/75"
                onPointerDown={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
              >
                &#x2715;
              </button>
            </div>
          </>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={t('dropOrClick')}
            onClick={handleBrowseClick}
            onKeyDown={handleBrowseKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center ${ui.transition.default} ${
              isDraggingFile
                ? 'border-blue-400 bg-blue-50'
                : `border-gray-300 hover:border-gray-400 ${ui.background.subtle}`
            }`}
          >
            <ImageUploadIcon className={`mb-4 h-14 w-14 ${ui.text.muted}`} />
            <p className={`${ui.text.bodySmall} font-medium`}>{t('dropOrClick')}</p>
            <p className={`${ui.text.caption} mt-2 max-w-sm`}>{t('supportedFormats')}</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className={`mt-3 text-sm ${ui.text.error}`} role="alert">
          {uploadError}
        </p>
      )}

      {insufficientCredits && (
        <div
          className="mt-3 flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-2"
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
            className={`ml-2 text-xs font-medium ${ui.text.linkSubtle}`}
          >
            {t('credits.buyMore', 'Buy Credits')}
          </button>
        </div>
      )}

      <div className="mt-3 flex h-10 items-center justify-between gap-4">
        <div className={`${ui.text.label} min-w-0 truncate`}>{file?.name ?? ''}</div>
        {svgPreviewUrl && !renderError && (
          <div className={`text-xs ${ui.text.muted} whitespace-nowrap`}>
            {Math.round(splitPercent)}% ·{' '}
            {scale > 1
              ? t('panEnabled', { defaultValue: 'Drag to pan' })
              : t('wheelToZoom', { defaultValue: 'Scroll to zoom' })}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
