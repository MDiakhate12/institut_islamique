'use client'

import { useSyncExternalStore } from 'react'

function subscribeEveryMinute(onChange: () => void) {
  const interval = setInterval(onChange, 60_000)
  return () => clearInterval(interval)
}
const getCurrentMinute = () => Math.floor(Date.now() / 60_000) * 60_000
const getServerMinute = () => null

/**
 * Heure courante arrondie à la minute, rafraîchie chaque minute. `null` pendant le rendu
 * serveur et l'hydratation : l'heure du serveur (UTC) ≠ celle du navigateur, l'afficher
 * côté serveur provoquait une erreur d'hydratation (React #418).
 */
export function useCurrentMinute(): Date | null {
  const minute = useSyncExternalStore(subscribeEveryMinute, getCurrentMinute, getServerMinute)
  return minute === null ? null : new Date(minute)
}
