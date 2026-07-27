import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { useSortedCategories } from '../hooks/useSortedCategories'
import {
  incomesForMonth,
  lastNMonths,
  monthKey,
  monthLabel,
  recurringMonthlyCHF,
  todayISO,
  totalMonthlyRecurringCHF,
} from '../lib/calculations'
import { formatCHF, toCHF } from '../lib/currency'
import { createId } from '../lib/id'
import { getCategoryIcon } from '../lib/icons'
import type {
  Category,
  CurrencyCode,
  Income,
  IncomeFrequency,
  RecurringCost,
  RecurringFrequency,
  Transaction,
} from '../types'
import { Button } from '../components/ui/Button'
import { CategorySelect } from '../components/ui/CategorySelect'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { Field } from '../components/ui/Field'
import { OfflineBadge } from '../components/ui/OfflineBadge'

type Tab = 'income' | 'big' | 'recurring'

const TABS: { id: Tab; label: string }[] = [
  { id: 'income', label: 'Income' },
  { id: 'big', label: 'Big' },
  { id: 'recurring', label: 'Recurring' },
]

export function MoneyPage() {
  const categories = useSortedCategories()
  const transactions =
    useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const incomes = useLiveQuery(() => db.incomes.toArray(), []) ?? []
  const recurring =
    useLiveQuery(() => db.recurringCosts.toArray(), []) ?? []
  const { rates, usingCached, fetchedAt } = useExchangeRates()
  const [tab, setTab] = useState<Tab>('income')
  const [selectedMonth, setSelectedMonth] = useState(monthKey(todayISO()))

  const months = useMemo(() => {
    const keys = new Set(lastNMonths(12))
    for (const i of incomes) keys.add(monthKey(i.date))
    for (const t of transactions) {
      if (t.type === 'big_expense') keys.add(monthKey(t.date))
    }
    return [...keys].sort().reverse()
  }, [incomes, transactions])

  return (
    <div className="space-y-5 pt-2">
      <header className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Money
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Income, big spends & recurring
          </p>
        </div>
        <OfflineBadge usingCached={usingCached} fetchedAt={fetchedAt} />
      </header>

      <div className="animate-fade-up stagger-1 flex rounded-2xl bg-surface-sunken p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-surface-raised text-ink shadow-sm'
                : 'text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'recurring' && (
        <label className="animate-fade-up flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
            Month
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-h-12 rounded-2xl border border-line bg-surface-raised px-4 font-semibold outline-none focus:border-pine"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      )}

      {tab === 'income' && (
        <IncomeSection
          rates={rates}
          incomes={incomes}
          selectedMonth={selectedMonth}
        />
      )}
      {tab === 'big' && (
        <BigExpenseSection
          rates={rates}
          categories={categories}
          transactions={transactions.filter((t) => t.type === 'big_expense')}
          selectedMonth={selectedMonth}
        />
      )}
      {tab === 'recurring' && (
        <RecurringSection
          rates={rates}
          categories={categories}
          costs={recurring}
        />
      )}
    </div>
  )
}

function IncomeSection({
  rates,
  incomes,
  selectedMonth,
}: {
  rates: Record<string, number>
  incomes: Income[]
  selectedMonth: string
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('CHF')
  const [frequency, setFrequency] = useState<IncomeFrequency>('one_time')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  const monthPrefixedDate =
    monthKey(date) === selectedMonth ? date : `${selectedMonth}-01`

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!title.trim() || !num || num <= 0) {
      setError('Title and amount required')
      return
    }
    const entryDate =
      monthKey(date) === selectedMonth ? date : `${selectedMonth}-01`
    try {
      const { amountInCHF, exchangeRateUsed } = toCHF(num, currency, rates)
      await db.incomes.add({
        id: createId(),
        title: title.trim(),
        amount: num,
        originalCurrency: currency,
        amountInCHF,
        exchangeRateUsed,
        frequency,
        date: entryDate,
        createdAt: Date.now(),
      })
      setTitle('')
      setAmount('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const monthIncomes = useMemo(
    () =>
      incomesForMonth(incomes, selectedMonth).sort(
        (a, b) => b.createdAt - a.createdAt,
      ),
    [incomes, selectedMonth],
  )

  return (
    <div className="animate-fade-up space-y-4">
      <p className="text-sm text-ink-muted">
        Monthly income carries forward from its start date. One-time only
        counts in that month.
      </p>
      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-3xl border border-line bg-surface-raised p-4"
      >
        <Field
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Salary"
        />
        <div className="flex gap-2">
          <Field
            label="Amount"
            value={amount}
            onChange={setAmount}
            inputMode="decimal"
            placeholder="0.00"
            className="flex-1"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
              Currency
            </span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>
        </div>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
              Frequency
            </span>
            <select
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as IncomeFrequency)
              }
              className="min-h-12 rounded-2xl border border-line bg-surface-raised px-4 font-semibold outline-none focus:border-pine"
            >
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <Field
            label={frequency === 'monthly' ? 'From' : 'Date'}
            type="date"
            value={monthPrefixedDate}
            onChange={setDate}
            className="flex-1"
          />
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <Button type="submit" className="w-full">
          <Plus className="size-5" /> Add income
        </Button>
      </form>

      <ul className="space-y-2">
        {monthIncomes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
            No income for {monthLabel(selectedMonth)}.
          </p>
        )}
        {monthIncomes.map((inc) => (
          <li
            key={inc.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-3"
          >
            <div className="min-w-0 flex-1 text-left">
              <p className="font-semibold">{inc.title}</p>
              <p className="text-xs text-ink-muted capitalize">
                {inc.frequency.replace('_', ' ')} · {inc.date}
              </p>
            </div>
            <p className="font-display text-lg font-semibold text-pine">
              {formatCHF(inc.amountInCHF)}
            </p>
            <button
              type="button"
              className="rounded-xl p-2 text-ink-faint active:bg-coral-soft active:text-coral"
              onClick={() => void db.incomes.delete(inc.id)}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BigExpenseSection({
  rates,
  categories,
  transactions,
  selectedMonth,
}: {
  rates: Record<string, number>
  categories: Category[]
  transactions: Transaction[]
  selectedMonth: string
}) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('CHF')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const activeCategory = categoryId || categories[0]?.id || ''
  const monthPrefixedDate =
    monthKey(date) === selectedMonth ? date : `${selectedMonth}-01`

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) {
      setError('Enter amount')
      return
    }
    const entryDate =
      monthKey(date) === selectedMonth ? date : `${selectedMonth}-01`
    try {
      const { amountInCHF, exchangeRateUsed } = toCHF(num, currency, rates)
      await db.transactions.add({
        id: createId(),
        amount: num,
        originalCurrency: currency,
        amountInCHF,
        exchangeRateUsed,
        categoryId: activeCategory,
        date: entryDate,
        note: note.trim() || 'Big expense',
        type: 'big_expense',
        createdAt: Date.now(),
      })
      setAmount('')
      setNote('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const monthTx = useMemo(
    () =>
      transactions
        .filter((t) => monthKey(t.date) === selectedMonth)
        .sort((a, b) => b.createdAt - a.createdAt),
    [transactions, selectedMonth],
  )

  return (
    <div className="animate-fade-up space-y-4">
      <p className="text-sm text-ink-muted">
        One-offs for {monthLabel(selectedMonth)} only — excluded from daily
        safe-to-spend.
      </p>
      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-3xl border border-line bg-surface-raised p-4"
      >
        <div className="flex gap-2">
          <Field
            label="Amount"
            value={amount}
            onChange={setAmount}
            inputMode="decimal"
            className="flex-1"
            placeholder="0.00"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
              Currency
            </span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>
        </div>
        <CategorySelect
          categories={categories}
          value={activeCategory}
          onChange={setCategoryId}
        />
        <div className="flex gap-2">
          <Field
            label="Date"
            type="date"
            value={monthPrefixedDate}
            onChange={setDate}
            className="flex-1"
          />
          <Field
            label="Note"
            value={note}
            onChange={setNote}
            placeholder="Vacation…"
            className="flex-[1.4]"
          />
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <Button type="submit" className="w-full">
          <Plus className="size-5" /> Add big expense
        </Button>
      </form>

      <ul className="space-y-2">
        {monthTx.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
            No big expenses for {monthLabel(selectedMonth)}.
          </p>
        )}
        {monthTx.map((tx) => {
          const cat = categories.find((c) => c.id === tx.categoryId)
          const Icon = getCategoryIcon(cat?.icon ?? 'tag')
          return (
            <li
              key={tx.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-3"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-soft text-amber">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold">{tx.note || cat?.name}</p>
                <p className="text-xs text-ink-muted">
                  {tx.date} · {cat?.name}
                </p>
              </div>
              <p className="font-display text-lg font-semibold">
                {formatCHF(tx.amountInCHF)}
              </p>
              <button
                type="button"
                className="rounded-xl p-2 text-ink-faint active:bg-coral-soft active:text-coral"
                onClick={() => void db.transactions.delete(tx.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RecurringSection({
  rates,
  categories,
  costs,
}: {
  rates: Record<string, number>
  categories: Category[]
  costs: RecurringCost[]
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('CHF')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')

  const activeCategory = categoryId || categories[0]?.id || ''
  const monthlyTotal = totalMonthlyRecurringCHF(costs)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!title.trim() || !num || num <= 0) {
      setError('Title and amount required')
      return
    }
    try {
      const { amountInCHF, exchangeRateUsed } = toCHF(num, currency, rates)
      await db.recurringCosts.add({
        id: createId(),
        title: title.trim(),
        amount: num,
        originalCurrency: currency,
        amountInCHF,
        exchangeRateUsed,
        frequency,
        categoryId: activeCategory,
        createdAt: Date.now(),
      })
      setTitle('')
      setAmount('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div className="animate-fade-up space-y-4">
      <section className="rounded-3xl bg-ink px-5 py-4 text-white">
        <p className="text-[12px] font-semibold tracking-wider uppercase opacity-70">
          Monthly equivalent
        </p>
        <p className="font-display mt-1 text-3xl font-semibold">
          {formatCHF(monthlyTotal)}
        </p>
        <p className="mt-2 text-xs opacity-60">
          Stays every month until you remove it · does not affect daily
          safe-to-spend.
        </p>
      </section>

      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-3xl border border-line bg-surface-raised p-4"
      >
        <Field
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Rent"
        />
        <div className="flex gap-2">
          <Field
            label="Amount"
            value={amount}
            onChange={setAmount}
            inputMode="decimal"
            placeholder="0.00"
            className="flex-1"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
              Currency
            </span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
            Frequency
          </span>
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as RecurringFrequency)
            }
            className="min-h-12 rounded-2xl border border-line bg-surface-raised px-4 font-semibold outline-none focus:border-pine"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <CategorySelect
          categories={categories}
          value={activeCategory}
          onChange={setCategoryId}
        />
        {error && <p className="text-sm text-coral">{error}</p>}
        <Button type="submit" className="w-full">
          <Plus className="size-5" /> Add recurring
        </Button>
      </form>

      <ul className="space-y-2">
        {costs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
            No recurring costs yet.
          </p>
        )}
        {[...costs]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((cost) => {
            const cat = categories.find((c) => c.id === cost.categoryId)
            const Icon = getCategoryIcon(cat?.icon ?? 'tag')
            const monthly = recurringMonthlyCHF(cost)
            return (
              <li
                key={cost.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-3"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold">{cost.title}</p>
                  <p className="text-xs text-ink-muted capitalize">
                    {cost.frequency}
                    {cost.frequency === 'yearly' &&
                      ` · ${formatCHF(monthly)}/mo`}
                  </p>
                </div>
                <p className="font-display text-lg font-semibold">
                  {formatCHF(cost.amountInCHF)}
                </p>
                <button
                  type="button"
                  className="rounded-xl p-2 text-ink-faint active:bg-coral-soft active:text-coral"
                  onClick={() => void db.recurringCosts.delete(cost.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            )
          })}
      </ul>
    </div>
  )
}
