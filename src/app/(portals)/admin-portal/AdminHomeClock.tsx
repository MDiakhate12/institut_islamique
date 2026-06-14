'use client'

import { useState, useEffect } from 'react'

export function AdminHomeClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

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
