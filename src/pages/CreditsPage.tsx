/**
 * Credit store page where users can view their balance and purchase credits.
 *
 * Delegates rendering to `CreditStorePage` from `@sudobility/consumables_pages`,
 * wiring up authentication state, balance, product packages, and purchase
 * handlers. Unauthenticated users see a prompt to log in.
 */

import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useBalance,
  useConsumableProducts,
  usePurchaseCredits,
} from '@sudobility/consumables_client';
import { CreditStorePage } from '@sudobility/consumables_pages';
import { useAuthStatus } from '@sudobility/auth-components';
import { CONSUMABLES_OFFERING_ID } from '../config/consumables';
import { trackButtonClick, trackError, trackPageView } from '../analytics';
import SEOHead from '../components/SEOHead';

export default function CreditsPage() {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStatus();
  const isAuthenticated = !!user;

  const { balance, isLoading: balanceLoading } = useBalance();
  const { packages, isLoading: productsLoading } = useConsumableProducts(CONSUMABLES_OFFERING_ID);
  const { purchase, isPurchasing, error } = usePurchaseCredits();

  useEffect(() => {
    trackPageView('/credits', 'Credits');
  }, []);

  useEffect(() => {
    if (error) {
      trackError(error.message, 'credits_purchase_error');
    }
  }, [error]);

  const handlePurchase = useCallback(
    async (packageId: string) => {
      trackButtonClick('purchase_credits', { packageId });
      await purchase(packageId, CONSUMABLES_OFFERING_ID);
    },
    [purchase]
  );

  const handleLoginClick = useCallback(() => {
    trackButtonClick('credits_login');
    navigate(`/${lang || 'en'}/login`);
  }, [navigate, lang]);

  return (
    <>
      <SEOHead
        title={t('seo.credits.title')}
        description={t('seo.credits.description')}
        keywords={t('seo.credits.keywords', { returnObjects: true }) as string[]}
      />
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
          title: t('credits.title', 'Buy Credits'),
          currentBalanceLabel: t('credits.currentBalance', 'Current Balance'),
          creditsUnit: t('credits.unit', 'credits'),
          purchaseButton: t('credits.buy', 'Buy'),
          purchasingButton: t('credits.processing', 'Processing...'),
          noProducts: t('credits.noProducts', 'No packages available'),
          errorTitle: t('credits.error', 'Error'),
          loginRequired: t('credits.loginRequired', 'Log in to purchase credits'),
        }}
        formatters={{
          formatCredits: count => `${count} ${t('credits.unit', 'credits')}`,
        }}
        className="py-8 px-4"
      />
    </>
  );
}
