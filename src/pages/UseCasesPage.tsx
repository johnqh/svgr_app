import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import SEO from "../components/seo/SEO";

const AI_DESIGNER_KEYS = [
  "looka",
  "brandmark",
  "hatchful",
  "logoai",
  "designsai",
  "tailorbrands",
  "turbologo",
  "logocom",
] as const;

export default function UseCasesPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const currentLang = lang || "en";

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <SEO
        title={t("useCases.title")}
        description={t("useCases.subtitle")}
        canonical="/use-cases"
      />

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-theme-text-primary mb-4">
          {t("useCases.title")}
        </h1>
        <p className="text-lg text-theme-text-secondary max-w-2xl mx-auto">
          {t("useCases.subtitle")}
        </p>
      </div>

      {/* Use Case 1: AI Logos */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-theme-text-primary mb-4">
          {t("useCases.aiLogos.title")}
        </h2>
        <p className="text-theme-text-secondary mb-8 text-lg">
          {t("useCases.aiLogos.description")}
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Problem */}
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">
              {t("useCases.aiLogos.problem")}
            </h3>
            <p className="text-theme-text-secondary">
              {t("useCases.aiLogos.problemDescription")}
            </p>
          </div>

          {/* Solution */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-3">
              {t("useCases.aiLogos.solution")}
            </h3>
            <p className="text-theme-text-secondary">
              {t("useCases.aiLogos.solutionDescription")}
            </p>
          </div>
        </div>

        {/* AI Logo Designers List */}
        <h3 className="text-2xl font-bold text-theme-text-primary mb-6">
          {t("useCases.aiLogos.designersTitle")}
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {AI_DESIGNER_KEYS.map((key) => (
            <a
              key={key}
              href={t(`useCases.aiLogos.designers.${key}.url`)}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-theme-bg-secondary rounded-xl p-5 border border-theme-border hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
            >
              <h4 className="font-semibold text-theme-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                {t(`useCases.aiLogos.designers.${key}.name`)}
                <span className="ml-1 text-xs text-theme-text-tertiary">
                  &#8599;
                </span>
              </h4>
              <p className="text-sm text-theme-text-secondary">
                {t(`useCases.aiLogos.designers.${key}.description`)}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Use Case 2: Legacy Assets */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-theme-text-primary mb-4">
          {t("useCases.legacyAssets.title")}
        </h2>
        <p className="text-theme-text-secondary mb-8 text-lg">
          {t("useCases.legacyAssets.description")}
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6 border border-red-200 dark:border-red-800">
            <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">
              {t("useCases.legacyAssets.problem")}
            </h3>
            <p className="text-theme-text-secondary">
              {t("useCases.legacyAssets.problemDescription")}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-3">
              {t("useCases.legacyAssets.solution")}
            </h3>
            <p className="text-theme-text-secondary">
              {t("useCases.legacyAssets.solutionDescription")}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-12 bg-theme-bg-secondary rounded-2xl border border-theme-border">
        <h2 className="text-3xl font-bold text-theme-text-primary mb-4">
          {t("useCases.cta.title")}
        </h2>
        <p className="text-lg text-theme-text-secondary mb-8">
          {t("useCases.cta.subtitle")}
        </p>
        <button
          onClick={() => navigate(`/${currentLang}`)}
          className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t("useCases.cta.button")}
        </button>
      </section>
    </div>
  );
}
