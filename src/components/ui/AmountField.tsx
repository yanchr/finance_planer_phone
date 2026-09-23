interface Props {
  label?: string
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

export function toggleAmountSign(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '-'
  if (trimmed === '-' || trimmed === '-.') return ''
  if (trimmed.startsWith('-')) return trimmed.slice(1)
  return `-${trimmed}`
}

export function isAmountNegative(value: string): boolean {
  return value.trimStart().startsWith('-')
}

export function AmountField({
  label = 'Amount',
  value,
  onChange,
  className = '',
  placeholder = '0.00',
}: Props) {
  const negative = isAmountNegative(value)

  return (
    <label className={`flex flex-col gap-1.5 text-left ${className}`}>
      {label && (
        <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
          {label}
        </span>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={negative ? 'Make positive' : 'Make negative'}
          aria-pressed={negative}
          onClick={() => onChange(toggleAmountSign(value))}
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border text-xl font-semibold tabular-nums transition ${
            negative
              ? 'border-coral bg-coral-soft text-coral'
              : 'border-line bg-surface-raised text-ink-muted active:bg-surface-sunken'
          }`}
        >
          {negative ? '−' : '+'}
        </button>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-line bg-surface-raised px-4 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-pine focus:ring-2 focus:ring-pine/20"
        />
      </div>
    </label>
  )
}
