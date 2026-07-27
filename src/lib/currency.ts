import type { CurrencyCode } from '../types'

export interface CurrencyOption {
  code: CurrencyCode
  label: string
  symbol: string
}

/** CHF default, EUR second, then alphabetical */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
]

export function getCurrency(code: CurrencyCode): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

export function formatCHF(amount: number, compact = false): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatAmount(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount)
}

/**
 * Convert amount in `from` currency to CHF.
 * `rates` are relative to CHF base: 1 CHF = rates[currency] units of that currency.
 * So amountInCHF = amount / rates[from] when from !== CHF.
 */
export function toCHF(
  amount: number,
  from: CurrencyCode,
  rates: Record<string, number>,
): { amountInCHF: number; exchangeRateUsed: number } {
  if (from === 'CHF') {
    return { amountInCHF: amount, exchangeRateUsed: 1 }
  }
  const rate = rates[from]
  if (!rate || rate <= 0) {
    throw new Error(`Missing exchange rate for ${from}`)
  }
  return {
    amountInCHF: amount / rate,
    exchangeRateUsed: rate,
  }
}
