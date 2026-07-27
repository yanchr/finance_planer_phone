import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="app-grain relative mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="safe-top flex-1 px-4 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
