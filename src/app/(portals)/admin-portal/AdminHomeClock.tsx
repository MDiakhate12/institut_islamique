'use client'

import { useCurrentMinute } from '@/lib/use-current-minute'

export function AdminHomeClock() {
  const now = useCurrentMinute()

  if (!now) return null

  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  // Capitalize first letter
  const dateStr = date.charAt(0).toUpperCase() + date.slice(1)

  return (
    <p className="text-white/70 text-sm font-mono drop-shadow">
      {time} • {dateStr}
    </p>
  )
}
