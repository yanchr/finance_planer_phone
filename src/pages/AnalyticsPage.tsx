import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db'
import { useSortedCategories } from '../hooks/useSortedCategories'
import {
  bigExpensesInMonth,
  calcNetFlow,
  dailySpentInMonth,
  incomeForMonth,
  lastNMonths,
  monthKey,
  monthLabel,
  todayISO,
  totalMonthlyRecurringCHF,
} from '../lib/calculations'
import { formatAmount, formatCHF } from '../lib/currency'
import { getCategoryIcon } from '../lib/icons'

const PIE_COLORS = [
  '#0d7a5f',
  '#1a8a6e',
  '#c4892a',
  '#c45c4a',
  '#3d6b8a',
  '#6b5b8a',
  '#5a7a4a',
  '#8a6b4a',
]

export function AnalyticsPage() {
  const categories = useSortedCategories()
  const transactions =
    useLiveQuery(() => db.transactions.toArray(), []) ?? []
  const incomes = useLiveQuery(() => db.incomes.toArray(), []) ?? []
  const recurring =
    useLiveQuery(() => db.recurringCosts.toArray(), []) ?? []

  const months = useMemo(() => {
    const keys = new Set<string>()
    for (const t of transactions) keys.add(monthKey(t.date))
    for (const i of incomes) keys.add(monthKey(i.date))
    for (const m of lastNMonths(12)) keys.add(m)
    return [...keys].sort().reverse()
  }, [transactions, incomes])

  const [selectedMonth, setSelectedMonth] = useState(monthKey(todayISO()))
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const [selectedAvgCategoryId, setSelectedAvgCategoryId] = useState<
    string | null
  >(null)

  const dailyTx = transactions.filter((t) => t.type === 'daily')
  const monthlyRecurring = totalMonthlyRecurringCHF(recurring)
  const standard = dailySpentInMonth(transactions, selectedMonth)
  const big = bigExpensesInMonth(transactions, selectedMonth)
  const totalIncome = incomeForMonth(incomes, selectedMonth)
  const net = calcNetFlow(totalIncome, standard, monthlyRecurring, big)

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of dailyTx) {
      if (monthKey(tx.date) !== selectedMonth) continue
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amountInCHF)
    }
    const total = [...map.values()].reduce((a, b) => a + b, 0)
    return [...map.entries()]
      .map(([categoryId, amount]) => {
        const cat = categories.find((c) => c.id === categoryId)
        return {
          categoryId,
          name: cat?.name ?? 'Unknown',
          icon: cat?.icon ?? 'tag',
          amount,
          pct: total > 0 ? (amount / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [dailyTx, selectedMonth, categories])

  const spendTrend = useMemo(() => {
    return lastNMonths(6).map((m) => {
      const total = dailyTx
        .filter((t) => monthKey(t.date) === m)
        .reduce((s, t) => s + t.amountInCHF, 0)
      return { month: monthLabel(m), total: Math.round(total * 100) / 100 }
    })
  }, [dailyTx])

  const netFlowTrend = useMemo(() => {
    return lastNMonths(6).map((m) => {
      const income = incomeForMonth(incomes, m)
      const daily = dailySpentInMonth(transactions, m)
      const bigExp = bigExpensesInMonth(transactions, m)
      const value = calcNetFlow(income, daily, monthlyRecurring, bigExp)
      return { month: monthLabel(m), net: Math.round(value * 100) / 100 }
    })
  }, [incomes, transactions, monthlyRecurring])

  const categoryAverages = useMemo(() => {
    const currentMonth = monthKey(todayISO())
    const activeMonths = new Set<string>()
    const byCat = new Map<string, Map<string, number>>()

    for (const tx of dailyTx) {
      const m = monthKey(tx.date)
      if (m >= currentMonth) continue
      activeMonths.add(m)
      if (!byCat.has(tx.categoryId)) byCat.set(tx.categoryId, new Map())
      const monthMap = byCat.get(tx.categoryId)!
      monthMap.set(m, (monthMap.get(m) ?? 0) + tx.amountInCHF)
    }

    const monthKeys = [...activeMonths].sort()
    if (monthKeys.length === 0) return []

    return [...byCat.entries()]
      .map(([categoryId, monthMap]) => {
        const values = monthKeys.map((m) => monthMap.get(m) ?? 0)
        const avg = values.reduce((a, b) => a + b, 0) / monthKeys.length
        const cat = categories.find((c) => c.id === categoryId)
        return {
          categoryId,
          name: cat?.name ?? 'Unknown',
          icon: cat?.icon ?? 'tag',
          avg,
          months: monthKeys.length,
          monthKeys,
        }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [dailyTx, categories])

  const monthTotal = categoryBreakdown.reduce((s, c) => s + c.amount, 0)
  const averageSpendTotal = categoryAverages.reduce((s, c) => s + c.avg, 0)

  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return []
    return dailyTx
      .filter(
        (t) =>
          t.categoryId === selectedCategoryId &&
          monthKey(t.date) === selectedMonth,
      )
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return b.createdAt - a.createdAt
      })
  }, [dailyTx, selectedCategoryId, selectedMonth])

  const selectedAvgCategory = categoryAverages.find(
    (c) => c.categoryId === selectedAvgCategoryId,
  )

  const avgCategoryTransactions = useMemo(() => {
    if (!selectedAvgCategory) return []
    const months = new Set(selectedAvgCategory.monthKeys)
    return dailyTx
      .filter(
        (t) =>
          t.categoryId === selectedAvgCategory.categoryId &&
          months.has(monthKey(t.date)),
      )
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return b.createdAt - a.createdAt
      })
  }, [dailyTx, selectedAvgCategory])

  function periodLabel(monthKeys: string[]): string {
    if (monthKeys.length === 0) return ''
    if (monthKeys.length === 1) return monthLabel(monthKeys[0])
    return `${monthLabel(monthKeys[0])} – ${monthLabel(monthKeys[monthKeys.length - 1])}`
  }

  return (
    <div className="space-y-5 pt-2">
      <header className="animate-fade-up">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Stats
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Cash flow & spending · CHF
        </p>
      </header>

      <label className="animate-fade-up stagger-1 flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
          Month
        </span>
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value)
            setSelectedCategoryId(null)
          }}
          className="min-h-12 rounded-2xl border border-line bg-surface-raised px-4 font-semibold outline-none focus:border-pine"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </label>

      <section className="animate-fade-up stagger-1 rounded-3xl border border-line bg-surface-raised p-5 shadow-sm shadow-ink/5">
        <p className="text-[12px] font-semibold tracking-wider text-ink-muted uppercase">
          Money flow · {monthLabel(selectedMonth)}
        </p>
        <p
          className={`font-display mt-1 text-4xl font-semibold tracking-tight ${
            net >= 0 ? 'text-pine' : 'text-coral'
          }`}
        >
          {formatCHF(net)}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <FlowStat label="Income" value={totalIncome} positive />
          <FlowStat label="Daily spends" value={standard} />
          <FlowStat label="Recurring / mo" value={monthlyRecurring} />
          <FlowStat label="Big expenses" value={big} />
        </dl>
      </section>

      <section className="animate-fade-up stagger-2 rounded-3xl border border-line bg-surface-raised p-4">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
          Net flow trend
        </h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={netFlowTrend} barSize={22}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#8a9aa3' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value) =>
                  formatCHF(typeof value === 'number' ? value : Number(value))
                }
                cursor={{ fill: '#e8eeec' }}
              />
              <Bar dataKey="net" radius={[8, 8, 4, 4]}>
                {netFlowTrend.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.net >= 0 ? '#0d7a5f' : '#c45c4a'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="animate-fade-up stagger-2 rounded-3xl border border-line bg-surface-raised p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
            Category breakdown
          </h2>
          <p className="font-display text-lg font-semibold">
            {formatCHF(monthTotal)}
          </p>
        </div>
        {categoryBreakdown.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-faint">
            No daily spends this month.
          </p>
        ) : (
          <>
            <div className="mx-auto h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {categoryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatCHF(
                        typeof value === 'number' ? value : Number(value),
                      )
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-2">
              {categoryBreakdown.map((row, i) => {
                const Icon = getCategoryIcon(row.icon)
                const selected = row.categoryId === selectedCategoryId
                return (
                  <li key={row.categoryId} className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategoryId((id) =>
                          id === row.categoryId ? null : row.categoryId,
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition ${
                        selected
                          ? 'bg-pine-soft text-pine ring-1 ring-pine/25'
                          : 'active:bg-surface-sunken'
                      }`}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <Icon className="size-4 shrink-0 text-ink-muted" />
                      <span className="flex-1 font-medium text-ink">
                        {row.name}
                      </span>
                      <span className="text-ink-muted">
                        {row.pct.toFixed(0)}%
                      </span>
                      <span className="font-semibold tabular-nums text-ink">
                        {formatCHF(row.amount)}
                      </span>
                    </button>

                    {selected && (
                      <div className="rounded-2xl border border-line bg-surface-sunken/60 px-3 py-3">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <h3 className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
                            {row.name} · {monthLabel(selectedMonth)}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryId(null)}
                            className="text-xs font-semibold text-ink-muted active:text-ink"
                          >
                            Clear
                          </button>
                        </div>
                        {categoryTransactions.length === 0 ? (
                          <p className="py-3 text-center text-sm text-ink-faint">
                            No items in this category.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {categoryTransactions.map((tx) => (
                              <li
                                key={tx.id}
                                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-2.5"
                              >
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="truncate font-semibold text-ink">
                                    {tx.note || (
                                      <span className="font-normal text-ink-faint">
                                        Untitled
                                      </span>
                                    )}
                                    <span className="ml-1.5 font-normal text-ink-faint">
                                      · {tx.date.slice(8)}
                                    </span>
                                  </p>
                                  <p className="truncate text-xs text-ink-muted">
                                    {formatAmount(
                                      tx.amount,
                                      tx.originalCurrency,
                                    )}
                                  </p>
                                </div>
                                <p className="font-display shrink-0 text-base font-semibold">
                                  {formatCHF(tx.amountInCHF)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="animate-fade-up stagger-3 rounded-3xl border border-line bg-surface-raised p-4">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
          Daily spend trend
        </h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendTrend} barSize={22}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#8a9aa3' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value) =>
                  formatCHF(typeof value === 'number' ? value : Number(value))
                }
                cursor={{ fill: '#e8eeec' }}
              />
              <Bar dataKey="total" fill="#0d7a5f" radius={[8, 8, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="animate-fade-up stagger-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
            Category averages
          </h2>
          {categoryAverages.length > 0 && (
            <p className="font-display text-lg font-semibold">
              {formatCHF(averageSpendTotal)}
            </p>
          )}
        </div>
        {categoryAverages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
            Not enough history yet.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {categoryAverages.map((row) => {
                const Icon = getCategoryIcon(row.icon)
                const selected = row.categoryId === selectedAvgCategoryId
                return (
                  <li key={row.categoryId} className="space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAvgCategoryId((id) =>
                          id === row.categoryId ? null : row.categoryId,
                        )
                      }
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        selected
                          ? 'border-pine bg-pine-soft ring-1 ring-pine/25'
                          : 'border-line bg-surface-raised active:bg-surface-sunken'
                      }`}
                    >
                      <span
                        className={`flex size-10 items-center justify-center rounded-xl ${
                          selected
                            ? 'bg-pine text-white'
                            : 'bg-pine-soft text-pine'
                        }`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{row.name}</p>
                        <p className="text-xs text-ink-muted">
                          Avg over {row.months} month
                          {row.months === 1 ? '' : 's'}
                        </p>
                      </div>
                      <p className="font-display text-lg font-semibold text-ink">
                        {formatCHF(row.avg)}
                      </p>
                    </button>

                    {selected && (
                      <div className="rounded-3xl border border-line bg-surface-raised p-4">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <h3 className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
                            {row.name} · {periodLabel(row.monthKeys)}
                          </h3>
                          <button
                            type="button"
                            onClick={() => setSelectedAvgCategoryId(null)}
                            className="text-xs font-semibold text-ink-muted active:text-ink"
                          >
                            Clear
                          </button>
                        </div>
                        {avgCategoryTransactions.length === 0 ? (
                          <p className="py-4 text-center text-sm text-ink-faint">
                            No items in this period.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {avgCategoryTransactions.map((tx) => (
                              <li
                                key={tx.id}
                                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-sunken px-3 py-2.5"
                              >
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="truncate font-semibold text-ink">
                                    {tx.note || (
                                      <span className="font-normal text-ink-faint">
                                        Untitled
                                      </span>
                                    )}
                                    <span className="ml-1.5 font-normal text-ink-faint">
                                      · {tx.date.slice(5)}
                                    </span>
                                  </p>
                                  <p className="truncate text-xs text-ink-muted">
                                    {formatAmount(
                                      tx.amount,
                                      tx.originalCurrency,
                                    )}
                                  </p>
                                </div>
                                <p className="font-display shrink-0 text-base font-semibold">
                                  {formatCHF(tx.amountInCHF)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

function FlowStat({
  label,
  value,
  positive,
}: {
  label: string
  value: number
  positive?: boolean
}) {
  return (
    <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
      <dt className="text-[11px] font-semibold text-ink-muted uppercase">
        {label}
      </dt>
      <dd
        className={`font-display mt-0.5 text-lg font-semibold ${
          positive ? 'text-pine' : 'text-ink'
        }`}
      >
        {formatCHF(value)}
      </dd>
    </div>
  )
}
