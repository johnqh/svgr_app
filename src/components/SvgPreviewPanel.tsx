import { useCallback } from 'react';

interface SvgPreviewPanelProps {
  svg: string | null;
  dimensions: { width: number; height: number } | null;
  filename?: string;
}

export default function SvgPreviewPanel({
  svg,
  dimensions,
  filename,
}: SvgPreviewPanelProps) {
  const handleDownload = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename
      ? filename.replace(/\.[^.]+$/, '.svg')
      : 'converted.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [svg, filename]);

  const svgDataUri = svg
    ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
    : null;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Converted SVG
      </h3>

      {svgDataUri ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <img
              src={svgDataUri}
              alt="Converted SVG"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            {dimensions && (
              <span className="text-sm text-gray-500">
                {dimensions.width} x {dimensions.height}px
              </span>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download SVG
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">
            Converted SVG will appear here
          </p>
        </div>
      )}
    </div>
  );
}
