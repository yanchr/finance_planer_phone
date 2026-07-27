import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PieChart,
  Settings,
  Wallet,
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Today' },
  { to: '/money', icon: Wallet, label: 'Money' },
  { to: '/analytics', icon: PieChart, label: 'Stats' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface-raised/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5 pb-1">
        {links.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
                  isActive ? 'text-pine' : 'text-ink-faint'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl transition ${
                      isActive ? 'bg-pine-soft' : ''
                    }`}
                  >
                    <Icon
                      className="size-5"
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
