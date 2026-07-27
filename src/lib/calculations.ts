import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDaysInMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import type { Income, RecurringCost, Transaction } from '../types'

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function monthKey(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM')
}

export function daysRemainingInMonth(date = new Date()): number {
  const end = endOfMonth(date)
  const days = eachDayOfInterval({ start: date, end })
  return days.length
}

export function daysInMonth(date = new Date()): number {
  return getDaysInMonth(date)
}

/** Monthly CHF equivalent of a recurring cost */
export function recurringMonthlyCHF(cost: RecurringCost): number {
  return cost.frequency === 'yearly' ? cost.amountInCHF / 12 : cost.amountInCHF
}

/** Income for a given month in CHF */
export function incomeForMonth(incomes: Income[], month: string): number {
  return incomes.reduce((sum, inc) => {
    if (inc.frequency === 'monthly') {
      // Monthly income counts every month from its start date onward
      if (monthKey(inc.date) <= month) return sum + inc.amountInCHF
      return sum
    }
    // one_time — only the month of the entry
    if (monthKey(inc.date) === month) return sum + inc.amountInCHF
    return sum
  }, 0)
}

/** Incomes that apply to a given month (for list views) */
export function incomesForMonth(
  incomes: Income[],
  month: string,
): Income[] {
  return incomes.filter((inc) => {
    if (inc.frequency === 'monthly') return monthKey(inc.date) <= month
    return monthKey(inc.date) === month
  })
}

export function dailySpentToday(
  transactions: Transaction[],
  today = todayISO(),
): number {
  return transactions
    .filter((t) => t.type === 'daily' && t.date === today)
    .reduce((s, t) => s + t.amountInCHF, 0)
}

export function dailySpentInMonth(
  transactions: Transaction[],
  month: string,
): number {
  return transactions
    .filter((t) => t.type === 'daily' && monthKey(t.date) === month)
    .reduce((s, t) => s + t.amountInCHF, 0)
}

export function bigExpensesInMonth(
  transactions: Transaction[],
  month: string,
): number {
  return transactions
    .filter((t) => t.type === 'big_expense' && monthKey(t.date) === month)
    .reduce((s, t) => s + t.amountInCHF, 0)
}

/**
 * Safe-to-spend today:
 * (MonthlyBudget - SpentSoFarThisMonth) / DaysRemainingIncludingToday - SpentToday
 */
export function calcSafeToSpendToday(
  monthlyBudgetCHF: number,
  spentSoFarThisMonthCHF: number,
  spentTodayCHF: number,
  date = new Date(),
): number {
  const remainingDays = daysRemainingInMonth(date)
  if (remainingDays <= 0) return 0
  const remainingBudget = monthlyBudgetCHF - spentSoFarThisMonthCHF
  const dailyAllowance = remainingBudget / remainingDays
  return dailyAllowance - spentTodayCHF
}

export function calcNetFlow(
  totalIncomeCHF: number,
  standardExpensesCHF: number,
  monthlyRecurringCHF: number,
  bigExpensesCHF: number,
): number {
  return (
    totalIncomeCHF -
    (standardExpensesCHF + monthlyRecurringCHF + bigExpensesCHF)
  )
}

export function totalMonthlyRecurringCHF(costs: RecurringCost[]): number {
  return costs.reduce((s, c) => s + recurringMonthlyCHF(c), 0)
}

export function lastNMonths(n: number, from = new Date()): string[] {
  return Array.from({ length: n }, (_, i) =>
    format(subMonths(from, n - 1 - i), 'yyyy-MM'),
  )
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return format(new Date(y, m - 1, 1), 'MMM yyyy')
}

export function startEndOfMonthISO(month: string): {
  start: string
  end: string
} {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return {
    start: format(startOfMonth(d), 'yyyy-MM-dd'),
    end: format(endOfMonth(d), 'yyyy-MM-dd'),
  }
}
