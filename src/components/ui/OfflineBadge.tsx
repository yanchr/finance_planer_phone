import { WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  usingCached: boolean
  fetchedAt: number
}

export function OfflineBadge({ usingCached, fetchedAt }: Props) {
  if (!usingCached) return null

  const age =
    fetchedAt > 0
      ? formatDistanceToNow(fetchedAt, { addSuffix: true })
      : 'fallback rates'

  return (
    <div className="animate-fade-up inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-[12px] font-semibold text-amber">
      <WifiOff className="size-3.5" strokeWidth={2} />
      Cached rates · {age}
    </div>
  )
}
