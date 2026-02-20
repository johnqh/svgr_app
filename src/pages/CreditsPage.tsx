import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useBalance,
  useConsumableProducts,
  usePurchaseCredits,
} from "@sudobility/consumables_client";
import { CreditStorePage } from "@sudobility/consumables_pages";
import { useAuthStatus } from "@sudobility/auth-components";
import { CONSUMABLES_OFFERING_ID } from "../config/consumables";

export default function CreditsPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStatus();
  const isAuthenticated = !!user;

  const { balance, isLoading: balanceLoading } = useBalance();
  const { packages, isLoading: productsLoading } =
    useConsumableProducts(CONSUMABLES_OFFERING_ID);
  const { purchase, isPurchasing, error } = usePurchaseCredits();

  const handlePurchase = useCallback(
    async (packageId: string) => {
      await purchase(packageId, CONSUMABLES_OFFERING_ID);
    },
    [purchase],
  );

  const handleLoginClick = useCallback(() => {
    navigate(`/${lang || "en"}/login`);
  }, [navigate, lang]);

  return (
    <CreditStorePage
      isAuthenticated={isAuthenticated}
      balance={balance}
      packages={packages}
      isLoading={balanceLoading || productsLoading}
      isPurchasing={isPurchasing}
      error={error?.message ?? null}
      onPurchase={handlePurchase}
      onLoginClick={handleLoginClick}
      labels={{
        title: t("credits.title", "Buy Credits"),
        currentBalanceLabel: t("credits.currentBalance", "Current Balance"),
        creditsUnit: t("credits.unit", "credits"),
        purchaseButton: t("credits.buy", "Buy"),
        purchasingButton: t("credits.processing", "Processing..."),
        noProducts: t("credits.noProducts", "No packages available"),
        errorTitle: t("credits.error", "Error"),
        loginRequired: t(
          "credits.loginRequired",
          "Log in to purchase credits",
        ),
      }}
      formatters={{
        formatCredits: (count) =>
          `${count} ${t("credits.unit", "credits")}`,
      }}
      className="py-8 px-4"
    />
  );
}
