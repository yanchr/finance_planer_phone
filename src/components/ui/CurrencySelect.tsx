import { CURRENCIES, type CurrencyOption } from '../../lib/currency'
import type { CurrencyCode } from '../../types'

interface Props {
  value: CurrencyCode
  onChange: (code: CurrencyCode) => void
  className?: string
}

export function CurrencySelect({ value, onChange, className = '' }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CurrencyCode)}
      className={`min-h-12 appearance-none rounded-2xl border border-line bg-surface-raised px-4 pr-8 text-[15px] font-semibold text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/20 ${className}`}
      aria-label="Currency"
    >
      {CURRENCIES.map((c: CurrencyOption) => (
        <option key={c.code} value={c.code}>
          {c.code}
        </option>
      ))}
    </select>
  )
}
