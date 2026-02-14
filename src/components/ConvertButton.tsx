import { useTranslation } from 'react-i18next';

interface ConvertButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function ConvertButton({
  disabled,
  loading,
  onClick,
}: ConvertButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
          disabled || loading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md hover:shadow-lg'
        }`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t('converting')}
          </>
        ) : (
          <>
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
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            {t('convertToSvg')}
          </>
        )}
      </button>
    </div>
  );
}
