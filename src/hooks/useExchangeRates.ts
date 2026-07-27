import { useCallback, useEffect, useState } from 'react'
import type { ExchangeRateCache } from '../types'
import { ensureRates, fetchAndCacheRates } from '../lib/exchangeRates'

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRateCache | null>(null)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(navigator.onLine)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await ensureRates()
      setRates(result)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      void fetchAndCacheRates().then(setRates)
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const usingCached =
    !online || rates?.source === 'cached' || (rates?.fetchedAt === 0)

  return {
    rates: rates?.rates ?? {},
    fetchedAt: rates?.fetchedAt ?? 0,
    loading,
    online,
    usingCached,
    refresh,
  }
}
