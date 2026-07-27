import { db } from '../db'
import type { BackupPayload } from '../types'

export async function exportBackup(): Promise<Blob> {
  const [categories, transactions, recurringCosts, incomes, settings, exchangeRates] =
    await Promise.all([
      db.categories.toArray(),
      db.transactions.toArray(),
      db.recurringCosts.toArray(),
      db.incomes.toArray(),
      db.settings.get('settings'),
      db.exchangeRates.get('rates'),
    ])

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    transactions,
    recurringCosts,
    incomes,
    settings: settings ?? { id: 'settings', monthlyBudgetCHF: 3000 },
    exchangeRates,
  }

  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const data = JSON.parse(text) as BackupPayload

  if (!data.version || !Array.isArray(data.transactions)) {
    throw new Error('Invalid backup file')
  }

  await db.transaction(
    'rw',
    [
      db.categories,
      db.transactions,
      db.recurringCosts,
      db.incomes,
      db.settings,
      db.exchangeRates,
    ],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.transactions.clear(),
        db.recurringCosts.clear(),
        db.incomes.clear(),
      ])

      if (data.categories?.length) {
        await db.categories.bulkAdd(
          data.categories.map((cat, i) => ({
            ...cat,
            sortOrder:
              typeof cat.sortOrder === 'number' ? cat.sortOrder : i,
          })),
        )
      }
      if (data.transactions?.length)
        await db.transactions.bulkAdd(data.transactions)
      if (data.recurringCosts?.length)
        await db.recurringCosts.bulkAdd(data.recurringCosts)
      if (data.incomes?.length) await db.incomes.bulkAdd(data.incomes)
      if (data.settings) await db.settings.put(data.settings)
      if (data.exchangeRates) await db.exchangeRates.put(data.exchangeRates)
    },
  )
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
