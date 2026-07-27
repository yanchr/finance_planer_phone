import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2 } from 'lucide-react'
import { db } from '../db'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { useSortedCategories } from '../hooks/useSortedCategories'
import {
  calcSafeToSpendToday,
  dailySpentInMonth,
  dailySpentToday,
  daysRemainingInMonth,
  monthKey,
  todayISO,
} from '../lib/calculations'
import { formatAmount, formatCHF, toCHF } from '../lib/currency'
import { createId } from '../lib/id'
import { getCategoryIcon } from '../lib/icons'
import type { CurrencyCode, Transaction } from '../types'
import { Button } from '../components/ui/Button'
import { CategorySelect } from '../components/ui/CategorySelect'
import { CurrencySelect } from '../components/ui/CurrencySelect'
import { Field } from '../components/ui/Field'
import { OfflineBadge } from '../components/ui/OfflineBadge'

export function DashboardPage() {
  const categories = useSortedCategories()
  const settings = useLiveQuery(() => db.settings.get('settings'), [])
  const transactions =
    useLiveQuery(() => db.transactions.orderBy('createdAt').reverse().toArray(), []) ??
    []

  const { rates, usingCached, fetchedAt } = useExchangeRates()

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('CHF')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const activeCategory = categoryId || categories[0]?.id || ''

  const today = todayISO()
  const thisMonth = monthKey(today)

  const spentToday = useMemo(
    () => dailySpentToday(transactions, today),
    [transactions, today],
  )
  const spentMonth = useMemo(
    () => dailySpentInMonth(transactions, thisMonth),
    [transactions, thisMonth],
  )
  const budget = settings?.monthlyBudgetCHF ?? 3000
  const daysLeft = daysRemainingInMonth()
  const safeToSpend = calcSafeToSpendToday(budget, spentMonth, spentToday)
  const withinBudget = safeToSpend >= 0

  const monthTx = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'daily' && monthKey(t.date) === thisMonth)
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date)
          return b.createdAt - a.createdAt
        }),
    [transactions, thisMonth],
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!activeCategory) {
      setError('Pick a category')
      return
    }
    try {
      setSaving(true)
      const { amountInCHF, exchangeRateUsed } = toCHF(num, currency, rates)
      await db.transactions.add({
        id: createId(),
        amount: num,
        originalCurrency: currency,
        amountInCHF,
        exchangeRateUsed,
        categoryId: activeCategory,
        date,
        note: note.trim(),
        type: 'daily',
        createdAt: Date.now(),
      })
      setAmount('')
      setNote('')
      setDate(todayISO())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pt-2">
      <header className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight text-ink">
            Frankly
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">Log today&apos;s spend</p>
        </div>
        <OfflineBadge usingCached={usingCached} fetchedAt={fetchedAt} />
      </header>

      <section
        className={`animate-fade-up stagger-1 relative overflow-hidden rounded-3xl p-5 ${
          withinBudget ? 'bg-pine text-white' : 'bg-coral text-white'
        }`}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 left-10 size-28 rounded-full bg-black/10" />
        <p className="text-[12px] font-semibold tracking-wider uppercase opacity-80">
          Safe to spend today
        </p>
        <p className="font-display mt-1 text-4xl font-semibold tracking-tight">
          {formatCHF(safeToSpend)}
        </p>
        <p className="mt-1 text-sm opacity-80">
          {daysLeft} day{daysLeft === 1 ? '' : 's'} left in the month
        </p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="opacity-70">Spent today</p>
            <p className="font-semibold">{formatCHF(spentToday)}</p>
          </div>
          <div>
            <p className="opacity-70">Month so far</p>
            <p className="font-semibold">{formatCHF(spentMonth)}</p>
          </div>
          <div>
            <p className="opacity-70">Budget</p>
            <p className="font-semibold">{formatCHF(budget, true)}</p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleAdd}
        className="animate-fade-up stagger-2 space-y-3 rounded-3xl border border-line bg-surface-raised p-4 shadow-sm shadow-ink/5"
      >
        <div className="flex gap-2">
          <Field
            label="Amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={setAmount}
            className="flex-1"
            autoComplete="off"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
              Currency
            </span>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </label>
        </div>

        <div>
          <p className="mb-1.5 text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
            Category
          </p>
          <CategorySelect
            categories={categories}
            value={activeCategory}
            onChange={setCategoryId}
          />
        </div>

        <div className="flex gap-2">
          <Field
            label="Date"
            type="date"
            value={date}
            onChange={setDate}
            className="flex-1"
          />
          <Field
            label="Note"
            type="text"
            placeholder="Optional"
            value={note}
            onChange={setNote}
            className="flex-[1.4]"
          />
        </div>

        {error && <p className="text-sm font-medium text-coral">{error}</p>}

        <Button type="submit" disabled={saving} className="w-full">
          <Plus className="size-5" />
          Add expense
        </Button>
      </form>

      <section className="animate-fade-up stagger-3">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
          This month
        </h2>
        {monthTx.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
            No expenses yet — add your first one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {monthTx.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId)
              const Icon = getCategoryIcon(cat?.icon ?? 'tag')
              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pine-soft text-pine">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold text-ink">
                      {cat?.name ?? 'Unknown'}
                      <span className="ml-1.5 font-normal text-ink-faint">
                        · {tx.date.slice(8)}
                      </span>
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatAmount(tx.amount, tx.originalCurrency)}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </p>
                  </div>
                  <EditableCHFAmount transaction={tx} />
                  <button
                    type="button"
                    aria-label="Delete"
                    className="shrink-0 rounded-xl p-2 text-ink-faint active:bg-coral-soft active:text-coral"
                    onClick={() => void db.transactions.delete(tx.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function EditableCHFAmount({ transaction }: { transaction: Transaction }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEdit() {
    setValue(String(Math.round(transaction.amountInCHF * 100) / 100))
    setEditing(true)
  }

  async function commit() {
    const num = parseFloat(value.replace(',', '.'))
    if (!num || num <= 0) {
      setEditing(false)
      return
    }
    const amountInCHF = num
    const amount =
      transaction.originalCurrency === 'CHF'
        ? amountInCHF
        : amountInCHF * transaction.exchangeRateUsed

    await db.transactions.update(transaction.id, {
      amountInCHF,
      amount,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          }
          if (e.key === 'Escape') setEditing(false)
        }}
        className="font-display w-[6.5rem] rounded-xl border border-pine bg-white px-2 py-1 text-right text-lg font-semibold text-ink outline-none ring-2 ring-pine/20"
        aria-label="Edit amount in CHF"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="font-display shrink-0 rounded-lg px-1 text-lg font-semibold text-ink active:bg-pine-soft"
      title="Tap to edit"
    >
      {formatCHF(transaction.amountInCHF)}
    </button>
  )
}
