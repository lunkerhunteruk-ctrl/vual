/**
 * Currency utility functions for locale-aware price formatting
 */

export type CurrencyCode = 'USD' | 'JPY' | 'EUR' | 'GBP' | 'KRW' | 'CNY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  locale: string;
  // JPY and KRW don't have decimal places
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', label: 'USD', flag: '🇺🇸', locale: 'en-US', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', label: 'JPY', flag: '🇯🇵', locale: 'ja-JP', decimals: 0 },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR', flag: '🇪🇺', locale: 'de-DE', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP', flag: '🇬🇧', locale: 'en-GB', decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', label: 'KRW', flag: '🇰🇷', locale: 'ko-KR', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', label: 'CNY', flag: '🇨🇳', locale: 'zh-CN', decimals: 2 },
};

// Map app locale to default currency
export const LOCALE_TO_CURRENCY: Record<string, CurrencyCode> = {
  'en': 'USD',
  'en-US': 'USD',
  'en-GB': 'GBP',
  'ja': 'JPY',
  'ja-JP': 'JPY',
  'de': 'EUR',
  'de-DE': 'EUR',
  'fr': 'EUR',
  'fr-FR': 'EUR',
  'it': 'EUR',
  'it-IT': 'EUR',
  'es': 'EUR',
  'es-ES': 'EUR',
  'ko': 'KRW',
  'ko-KR': 'KRW',
  'zh': 'CNY',
  'zh-CN': 'CNY',
};

/**
 * Get the default currency for a given locale
 */
export function getDefaultCurrency(locale: string): CurrencyCode {
  return LOCALE_TO_CURRENCY[locale] || LOCALE_TO_CURRENCY[locale.split('-')[0]] || 'USD';
}

/**
 * Get currency configuration for a given currency code
 */
export function getCurrencyConfig(code: CurrencyCode | string): CurrencyConfig {
  const upperCode = code.toUpperCase() as CurrencyCode;
  return CURRENCIES[upperCode] || CURRENCIES.USD;
}

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(code: CurrencyCode | string): string {
  return getCurrencyConfig(code).symbol;
}

/**
 * Format a price with the appropriate currency
 * @param amount - The amount to format (in the smallest unit for the currency, e.g., cents for USD)
 * @param currencyCode - The currency code (e.g., 'USD', 'JPY')
 * @param locale - The locale to use for formatting (defaults to currency's native locale)
 * @param fromSmallestUnit - If true, treats amount as smallest unit (cents/yen), if false treats as whole units
 */
export function formatPrice(
  amount: number,
  currencyCode: CurrencyCode | string = 'USD',
  locale?: string,
  fromSmallestUnit: boolean = true
): string {
  const config = getCurrencyConfig(currencyCode);
  const displayLocale = locale || config.locale;

  // Convert from smallest unit to display amount if needed
  const displayAmount = fromSmallestUnit && config.decimals > 0
    ? amount / Math.pow(10, config.decimals)
    : amount;

  return new Intl.NumberFormat(displayLocale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(displayAmount);
}

/**
 * Format a price for display without currency symbol (just the number)
 */
export function formatPriceNumber(
  amount: number,
  currencyCode: CurrencyCode | string = 'USD',
  locale?: string,
  fromSmallestUnit: boolean = true
): string {
  const config = getCurrencyConfig(currencyCode);
  const displayLocale = locale || config.locale;

  const displayAmount = fromSmallestUnit && config.decimals > 0
    ? amount / Math.pow(10, config.decimals)
    : amount;

  return new Intl.NumberFormat(displayLocale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(displayAmount);
}

/**
 * Convert price to smallest unit for storage/Stripe (e.g., dollars to cents)
 */
export function toSmallestUnit(amount: number, currencyCode: CurrencyCode | string = 'USD'): number {
  const config = getCurrencyConfig(currencyCode);
  return Math.round(amount * Math.pow(10, config.decimals));
}

/**
 * Convert price from smallest unit for display (e.g., cents to dollars)
 */
export function fromSmallestUnit(amount: number, currencyCode: CurrencyCode | string = 'USD'): number {
  const config = getCurrencyConfig(currencyCode);
  return amount / Math.pow(10, config.decimals);
}

/**
 * Japan consumption tax rate (10%)
 */
export const JP_TAX_RATE = 0.1;

/**
 * Calculate tax-inclusive price from a base price.
 * If tax is already included, returns the price as-is.
 * Rounds to nearest integer for zero-decimal currencies (JPY, KRW).
 */
export function getTaxInclusivePrice(
  basePrice: number,
  taxIncluded: boolean,
  currencyCode: CurrencyCode | string = 'JPY',
  taxRate: number = JP_TAX_RATE
): number {
  if (taxIncluded) return basePrice;
  const config = getCurrencyConfig(currencyCode);
  const withTax = basePrice * (1 + taxRate);
  return config.decimals === 0 ? Math.round(withTax) : withTax;
}

/**
 * Format price for display with tax-inclusive label.
 * Appends "（税込）" for Japanese locale.
 */
export function formatPriceWithTax(
  amount: number,
  currencyCode: CurrencyCode | string = 'JPY',
  locale?: string,
  fromSmallestUnit: boolean = false
): string {
  const formatted = formatPrice(amount, currencyCode, locale, fromSmallestUnit);
  const displayLocale = locale || getCurrencyConfig(currencyCode).locale;
  return displayLocale.startsWith('ja') ? `${formatted}（税込）` : formatted;
}

/**
 * Get currency options for select dropdowns
 */
export function getCurrencyOptions(): Array<{ value: string; label: string }> {
  return Object.values(CURRENCIES).map(c => ({
    value: c.code.toLowerCase(),
    label: `${c.flag} ${c.code}`,
  }));
}
