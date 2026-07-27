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
import { formatCHF } from '../lib/currency'
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
    const byCat = new Map<string, Map<string, number>>()
    for (const tx of dailyTx) {
      const m = monthKey(tx.date)
      if (!byCat.has(tx.categoryId)) byCat.set(tx.categoryId, new Map())
      const monthMap = byCat.get(tx.categoryId)!
      monthMap.set(m, (monthMap.get(m) ?? 0) + tx.amountInCHF)
    }
    return [...byCat.entries()]
      .map(([categoryId, monthMap]) => {
        const values = [...monthMap.values()]
        const avg =
          values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : 0
        const cat = categories.find((c) => c.id === categoryId)
        return {
          categoryId,
          name: cat?.name ?? 'Unknown',
          icon: cat?.icon ?? 'tag',
          avg,
          months: values.length,
        }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [dailyTx, categories])

  const monthTotal = categoryBreakdown.reduce((s, c) => s + c.amount, 0)

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
                return (
                  <li
                    key={row.categoryId}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        background: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <Icon className="size-4 text-ink-muted" />
                    <span className="flex-1 font-medium">{row.name}</span>
                    <span className="text-ink-muted">
                      {row.pct.toFixed(0)}%
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatCHF(row.amount)}
                    </span>
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
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-ink-muted uppercase">
          Category averages
        </h2>
        {categoryAverages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
            Not enough history yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {categoryAverages.map((row) => {
              const Icon = getCategoryIcon(row.icon)
              return (
                <li
                  key={row.categoryId}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-3"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-pine-soft text-pine">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-ink-muted">
                      Avg over {row.months} month{row.months === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="font-display text-lg font-semibold">
                    {formatCHF(row.avg)}
                  </p>
                </li>
              )
            })}
          </ul>
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
