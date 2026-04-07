/**
 * Primary action button that triggers the image-to-SVG conversion.
 *
 * Displays a spinner and "Converting..." text while the API call is in progress,
 * and an arrow icon with "Convert to SVG" text when idle. The button is
 * disabled when no file is selected or a conversion is in progress.
 */

import { useTranslation } from 'react-i18next';
import { SpinnerIcon, ArrowRightIcon } from './icons';

interface ConvertButtonProps {
  /** Whether the button should be disabled (e.g., no file selected). */
  disabled: boolean;
  /** Whether a conversion is currently in progress. */
  loading: boolean;
  /** Called when the user clicks the button. */
  onClick: () => void;
}

export default function ConvertButton({ disabled, loading, onClick }: ConvertButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
          disabled || loading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
        }`}
      >
        {loading ? (
          <>
            <SpinnerIcon className="animate-spin h-4 w-4" />
            {t('converting')}
          </>
        ) : (
          <>
            <ArrowRightIcon className="w-4 h-4" />
            {t('convertToSvg')}
          </>
        )}
      </button>
    </div>
  );
}
