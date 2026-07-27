import type { Category } from '../../types'
import { getCategoryIcon } from '../../lib/icons'

interface Props {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function CategorySelect({
  categories,
  value,
  onChange,
  className = '',
}: Props) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon)
        const selected = cat.id === value
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl px-3.5 py-2.5 transition ${
              selected
                ? 'bg-pine text-white shadow-sm shadow-pine/25'
                : 'bg-surface-raised text-ink-muted border border-line'
            }`}
          >
            <Icon className="size-5" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold whitespace-nowrap">
              {cat.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
