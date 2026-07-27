import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  children: ReactNode
}

const variants = {
  primary:
    'bg-pine text-white shadow-sm shadow-pine/20 active:bg-pine-deep hover:bg-pine-deep',
  secondary:
    'bg-surface-raised text-ink border border-line active:bg-surface-sunken',
  danger: 'bg-coral-soft text-coral active:opacity-80',
  ghost: 'bg-transparent text-ink-muted active:bg-surface-sunken',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
