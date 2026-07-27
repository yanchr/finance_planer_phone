import type { InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  onChange: (value: string) => void
}

export function Field({
  label,
  value,
  onChange,
  className = '',
  ...props
}: Props) {
  return (
    <label className={`flex flex-col gap-1.5 text-left ${className}`}>
      {label && (
        <span className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">
          {label}
        </span>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-2xl border border-line bg-surface-raised px-4 text-[16px] text-ink outline-none placeholder:text-ink-faint focus:border-pine focus:ring-2 focus:ring-pine/20"
        {...props}
      />
    </label>
  )
}
