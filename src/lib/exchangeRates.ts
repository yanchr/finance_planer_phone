import { db } from '../db'
import type { CurrencyCode, ExchangeRateCache } from '../types'
import { CURRENCIES } from './currency'

const FALLBACK_RATES: Record<string, number> = {
  EUR: 1.05,
  USD: 1.12,
  GBP: 0.88,
  JPY: 170,
  CAD: 1.55,
  AUD: 1.72,
}

export async function getCachedRates(): Promise<ExchangeRateCache | undefined> {
  return db.exchangeRates.get('rates')
}

export async function fetchAndCacheRates(): Promise<ExchangeRateCache> {
  const symbols = CURRENCIES.filter((c) => c.code !== 'CHF')
    .map((c) => c.code)
    .join(',')

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=CHF&to=${symbols}`,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      rates: Record<string, number>
      date: string
    }

    const cache: ExchangeRateCache = {
      id: 'rates',
      base: 'CHF',
      rates: data.rates,
      fetchedAt: Date.now(),
      source: 'live',
    }
    await db.exchangeRates.put(cache)
    return cache
  } catch {
    const existing = await getCachedRates()
    if (existing) {
      return { ...existing, source: 'cached' }
    }
    const fallback: ExchangeRateCache = {
      id: 'rates',
      base: 'CHF',
      rates: FALLBACK_RATES,
      fetchedAt: 0,
      source: 'cached',
    }
    await db.exchangeRates.put(fallback)
    return fallback
  }
}

export async function ensureRates(): Promise<ExchangeRateCache> {
  if (navigator.onLine) {
    return fetchAndCacheRates()
  }
  const cached = await getCachedRates()
  if (cached) return { ...cached, source: 'cached' }
  return fetchAndCacheRates()
}

export function hasRate(
  rates: Record<string, number>,
  currency: CurrencyCode,
): boolean {
  return currency === 'CHF' || Boolean(rates[currency])
}
