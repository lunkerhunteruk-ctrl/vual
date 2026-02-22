'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import {
  getDefaultCurrency,
  getCurrencyConfig,
  getCurrencySymbol,
  formatPrice,
  getCurrencyOptions,
  CurrencyCode,
  CurrencyConfig,
} from '@/lib/utils/currency';

export interface UseCurrencyResult {
  /** Current locale */
  locale: string;
  /** Default currency code for the current locale */
  defaultCurrency: CurrencyCode;
  /** Currency configuration for the default currency */
  currencyConfig: CurrencyConfig;
  /** Currency symbol for the default currency */
  symbol: string;
  /** Format a price with the default currency */
  format: (amount: number, fromSmallestUnit?: boolean) => string;
  /** Format a price with a specific currency */
  formatWithCurrency: (amount: number, currency: CurrencyCode | string, fromSmallestUnit?: boolean) => string;
  /** Get currency options for select dropdowns */
  options: Array<{ value: string; label: string }>;
}

/**
 * Hook for locale-aware currency handling
 */
export function useCurrency(): UseCurrencyResult {
  const locale = useLocale();

  return useMemo(() => {
    const defaultCurrency = getDefaultCurrency(locale);
    const currencyConfig = getCurrencyConfig(defaultCurrency);
    const symbol = getCurrencySymbol(defaultCurrency);

    return {
      locale,
      defaultCurrency,
      currencyConfig,
      symbol,
      format: (amount: number, fromSmallestUnit: boolean = true) =>
        formatPrice(amount, defaultCurrency, locale, fromSmallestUnit),
      formatWithCurrency: (amount: number, currency: CurrencyCode | string, fromSmallestUnit: boolean = true) =>
        formatPrice(amount, currency, locale, fromSmallestUnit),
      options: getCurrencyOptions(),
    };
  }, [locale]);
}

export default useCurrency;
