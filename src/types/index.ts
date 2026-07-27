export type CurrencyCode = 'CHF' | 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CAD' | 'AUD'

export type TransactionType = 'daily' | 'big_expense'

export type RecurringFrequency = 'monthly' | 'yearly'

export type IncomeFrequency = 'monthly' | 'one_time'

export interface Category {
  id: string
  name: string
  icon: string
  isCustom: boolean
  sortOrder: number
}

export interface Transaction {
  id: string
  amount: number
  originalCurrency: CurrencyCode
  amountInCHF: number
  exchangeRateUsed: number
  categoryId: string
  date: string // ISO date YYYY-MM-DD
  note: string
  type: TransactionType
  createdAt: number
}

export interface RecurringCost {
  id: string
  title: string
  amount: number
  originalCurrency: CurrencyCode
  amountInCHF: number
  exchangeRateUsed: number
  frequency: RecurringFrequency
  categoryId: string
  createdAt: number
}

export interface Income {
  id: string
  title: string
  amount: number
  originalCurrency: CurrencyCode
  amountInCHF: number
  exchangeRateUsed: number
  frequency: IncomeFrequency
  /** Start date for monthly; exact month for one_time */
  date: string
  createdAt: number
}

export interface AppSettings {
  id: 'settings'
  monthlyBudgetCHF: number
}

export interface ExchangeRateCache {
  id: 'rates'
  base: 'CHF'
  rates: Record<string, number>
  fetchedAt: number
  source: 'live' | 'cached'
}

export interface BackupPayload {
  version: 1
  exportedAt: string
  categories: Category[]
  transactions: Transaction[]
  recurringCosts: RecurringCost[]
  incomes: Income[]
  settings: AppSettings
  exchangeRates?: ExchangeRateCache
}
