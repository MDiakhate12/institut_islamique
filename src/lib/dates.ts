/**
 * Dates calendaires au format ISO 'YYYY-MM-DD'.
 *
 * Deux pièges que ce module évite :
 * - `new Date().toISOString().slice(0, 10)` donne la date **UTC** : entre minuit et 1-2 h à Paris,
 *   c'est encore la veille (un appel fait à 0 h 30 était enregistré la veille).
 * - `new Date('YYYY-MM-DDT00:00:00')` (minuit **local**) relu avec `toISOString()` (UTC) décale
 *   d'un jour dans tout fuseau en avance sur UTC (« jour suivant » qui ne bougeait pas).
 *
 * Règle : « aujourd'hui » se calcule dans le fuseau de l'école (`schools.timezone`), et toute
 * arithmétique sur une date ISO se fait en UTC pur.
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/** Date du jour dans un fuseau IANA (ex. 'Europe/Paris'). Fuseau invalide ou absent → UTC. */
export function todayInTimeZone(timeZone: string | null | undefined, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

/**
 * Date du jour dans le fuseau du navigateur — uniquement pour des valeurs par défaut de
 * formulaires côté client (jamais pendant le rendu SSR : le serveur tourne en UTC).
 */
export function localTodayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Jour de la semaine (0 = dimanche) d'une date ISO, indépendant du fuseau. */
export function dayOfWeekISO(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

/** `schoolDays` vide = tous les jours sont des jours de classe. */
export function isSchoolDayISO(iso: string, schoolDays: string[]): boolean {
  return schoolDays.length === 0 || schoolDays.includes(DAY_NAMES[dayOfWeekISO(iso)])
}

/** Jour de classe le plus récent ≤ `iso` (au plus 7 jours en arrière). */
export function latestSchoolDayISO(iso: string, schoolDays: string[]): string {
  for (let i = 0; i < 7; i++) {
    const d = addDaysISO(iso, -i)
    if (isSchoolDayISO(d, schoolDays)) return d
  }
  return iso
}
