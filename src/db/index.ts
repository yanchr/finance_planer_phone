import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  Category,
  ExchangeRateCache,
  Income,
  RecurringCost,
  Transaction,
} from '../types'
import { DEFAULT_CATEGORIES } from './defaults'

class FinanceDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  recurringCosts!: EntityTable<RecurringCost, 'id'>
  incomes!: EntityTable<Income, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  exchangeRates!: EntityTable<ExchangeRateCache, 'id'>

  constructor() {
    super('frankly-finance')
    this.version(1).stores({
      categories: 'id, name',
      transactions: 'id, date, type, categoryId, createdAt',
      recurringCosts: 'id, categoryId, frequency',
      incomes: 'id, frequency, date',
      settings: 'id',
      exchangeRates: 'id',
    })
  }
}

export const db = new FinanceDB()

export async function ensureSeedData(): Promise<void> {
  const categoryCount = await db.categories.count()
  if (categoryCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  } else {
    // Backfill sortOrder for older local DBs / imports
    const existing = await db.categories.toArray()
    const missingOrder = existing.some(
      (c) => typeof c.sortOrder !== 'number',
    )
    if (missingOrder) {
      await db.transaction('rw', db.categories, async () => {
        await Promise.all(
          existing.map((c, i) =>
            db.categories.update(c.id, {
              sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
            }),
          ),
        )
      })
    }
  }

  const settings = await db.settings.get('settings')
  if (!settings) {
    await db.settings.put({ id: 'settings', monthlyBudgetCHF: 3000 })
  }
}
