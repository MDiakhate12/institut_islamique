import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

/**
 * Numéros de téléphone — règle unique de l'appli (navigateur et serveur).
 *
 * - **Stockage** : format international E.164 (`+33612345678`), quel que soit le format saisi
 *   (`06 12 34 56 78`, `06.12.34.56.78`, `0033…`, `+33 6…`, ou `612345678` sans le 0 initial —
 *   Excel le supprime). Sans indicatif, le numéro est lu comme français.
 * - **Affichage** : `06 12 34 56 78` pour un numéro français, `+213 555 12 34 56` pour un numéro
 *   étranger (format national ambigu pour l'école).
 * - Un numéro qui n'existe pas (trop court, deux numéros collés…) est refusé à la saisie.
 */

const DEFAULT_COUNTRY = 'FR' as const

export const PHONE_INVALID_MESSAGE = "Numéro invalide — ex. 06 12 34 56 78, ou +213… pour l'étranger"

function parse(raw: string | null | undefined) {
  const value = raw?.trim()
  if (!value) return undefined
  const phone = parsePhoneNumberFromString(value, DEFAULT_COUNTRY)
  return phone?.isValid() ? phone : undefined
}

/** Vide → valide (champ facultatif) ; sinon le numéro doit exister. */
export function isValidPhone(raw: string | null | undefined): boolean {
  return !raw?.trim() || !!parse(raw)
}

/**
 * Valeur à enregistrer : E.164, `null` si vide. Un numéro invalide (anciennes données, import)
 * est conservé tel quel, nettoyé des espaces superflus — jamais perdu.
 */
export function toStoredPhone(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  return parse(value)?.number ?? value.replace(/\s+/g, ' ')
}

/** Affichage lisible ; un numéro non reconnu est affiché tel qu'il est enregistré. */
export function formatPhone(stored: string | null | undefined): string {
  if (!stored) return ''
  const phone = parse(stored)
  if (!phone) return stored
  return phone.country === DEFAULT_COUNTRY ? phone.formatNational() : phone.formatInternational()
}

/** Numéro pour un lien `https://wa.me/<numéro>` (chiffres de l'E.164, sans « + »), `null` si invalide. */
export function whatsappNumber(stored: string | null | undefined): string | null {
  return parse(stored)?.number.slice(1) ?? null
}

/**
 * Recherche par téléphone : « 0612 » doit trouver « 06 12 34 56 78 » comme « +33612345678 ».
 * Compare les chiffres sans le 0 initial ni l'indicatif français.
 */
export function phoneMatches(stored: string | null | undefined, query: string): boolean {
  const q = query.replace(/\D/g, '').replace(/^(?:0033|33|0)/, '')
  if (q.length < 2 || !stored) return false
  const digits = stored.replace(/\D/g, '').replace(/^(?:0033|33|0)/, '')
  return digits.includes(q)
}

/** Champ téléphone facultatif d'un schéma Zod : vide accepté, sinon numéro valide. */
export const optionalPhoneField = z.string().optional().refine(isValidPhone, { message: PHONE_INVALID_MESSAGE })
