import { isValidPhone } from '@/lib/phone'
import type {
  GuardianRow, GuardianRole, ConnectedAccount, DirectoryParent, DirectoryChild,
} from './parents.types'

/**
 * Regroupe les fiches `guardians` (une par élève) en parents distincts. Fonction pure, rien n'est écrit en base.
 *
 * Règles, de la plus forte à la plus faible :
 *  1. même compte lié (`linked_member_id`) → même parent ;
 *  2. même e-mail OU même téléphone (9 derniers chiffres) ET noms compatibles → même parent ;
 *  3. même nom complet (≥ 2 mots) sans contact en commun → même parent seulement si AUCUN contact ne le
 *     contredit (l'un des deux n'a ni e-mail ni téléphone) — « à vérifier ». Deux fiches de même nom avec
 *     des contacts différents sont des homonymes : jamais fusionnées ;
 *  4. deux tuteurs d'un même élève ne sont jamais fusionnés (un enfant a un père ET une mère) ;
 *  5. un contact partagé entre noms différents (couple) ne fusionne pas : signalé « partagé avec ».
 * Le rôle (père/mère) ne bloque pas la fusion : une même personne saisie « mère » ici et « père » là est
 * regroupée, et l'incohérence est signalée.
 */

export function normalizeName(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function normalizeEmail(raw: string | null | undefined): string | null {
  const v = raw?.trim().toLowerCase()
  return v && v.includes('@') ? v : null
}

/** Clé de téléphone : 9 derniers chiffres (compatible +33…, 0033…, 0…). `null` si ce n'est pas un numéro. */
function phoneKey(raw: string | null | undefined): string | null {
  const v = raw?.trim()
  if (!v || v.includes('@')) return null
  const digits = v.replace(/\D/g, '')
  return digits.length >= 9 ? digits.slice(-9) : null
}

/** Noms compatibles : mêmes mots (ordre libre) ou l'un contenu dans l'autre ; un nom vide ne bloque pas. */
function namesCompatible(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return true
  const [small, large] = a.length <= b.length ? [a, b] : [b, a]
  const set = new Set(large)
  return small.every(t => set.has(t))
}

function nameKey(tokens: string[]): string | null {
  return tokens.length >= 2 ? [...tokens].sort().join(' ') : null
}

type Row = GuardianRow & { tokens: string[]; emailKey: string | null; phoneKey: string | null }

function mostFrequent<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: T | undefined
  let bestCount = 0
  for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c }
  return best
}

function distinctByFrequency(values: string[], keyOf: (v: string) => string): string[] {
  const groups = new Map<string, { value: string; count: number }>()
  for (const v of values) {
    const k = keyOf(v)
    const g = groups.get(k)
    if (g) g.count++
    else groups.set(k, { value: v, count: 1 })
  }
  return [...groups.values()].sort((a, b) => b.count - a.count).map(g => g.value)
}

export function buildParentDirectory(
  guardianRows: GuardianRow[],
  accounts: ConnectedAccount[],
): DirectoryParent[] {
  const rows: Row[] = guardianRows.map(g => ({
    ...g,
    tokens: normalizeName(`${g.firstName ?? ''} ${g.lastName}`),
    emailKey: normalizeEmail(g.email),
    phoneKey: phoneKey(g.phone),
  }))

  // ── Union-find avec garde-fou « un seul tuteur par élève » ───────────────────
  const parent = rows.map((_, i) => i)
  const studentsOf = rows.map(r => new Set([r.studentId]))
  const contactsOf = rows.map(r => new Set([r.emailKey, r.phoneKey].filter((x): x is string => !!x)
    .map(x => (x === r.phoneKey ? `p:${x}` : `e:${x}`))))
  const maybe = new Set<number>()

  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] }
    return i
  }
  const tryUnion = (a: number, b: number): boolean => {
    const ra = find(a), rb = find(b)
    if (ra === rb) return true
    for (const s of studentsOf[ra]) if (studentsOf[rb].has(s)) return false
    parent[rb] = ra
    studentsOf[rb].forEach(s => studentsOf[ra].add(s))
    contactsOf[rb].forEach(c => contactsOf[ra].add(c))
    return true
  }
  const bucketBy = (keyOf: (r: Row) => string | null) => {
    const m = new Map<string, number[]>()
    rows.forEach((r, i) => {
      const k = keyOf(r)
      if (k) m.set(k, [...(m.get(k) ?? []), i])
    })
    return m
  }

  // 1. même compte lié
  for (const idxs of bucketBy(r => r.linkedMemberId).values())
    for (let i = 1; i < idxs.length; i++) tryUnion(idxs[0], idxs[i])

  // 2. même e-mail / même téléphone, noms compatibles
  const emailBuckets = bucketBy(r => r.emailKey)
  const phoneBuckets = bucketBy(r => r.phoneKey)
  for (const buckets of [emailBuckets, phoneBuckets])
    for (const idxs of buckets.values())
      for (let i = 0; i < idxs.length; i++)
        for (let j = i + 1; j < idxs.length; j++)
          if (namesCompatible(rows[idxs[i]].tokens, rows[idxs[j]].tokens)) tryUnion(idxs[i], idxs[j])

  // 3. même nom complet, aucun contact contradictoire
  const nameBuckets = new Map<string, number[]>()
  rows.forEach((r, i) => {
    const k = nameKey(r.tokens)
    if (k) nameBuckets.set(k, [...(nameBuckets.get(k) ?? []), i])
  })
  for (const idxs of nameBuckets.values()) {
    for (let i = 0; i < idxs.length; i++)
      for (let j = i + 1; j < idxs.length; j++) {
        const ra = find(idxs[i]), rb = find(idxs[j])
        if (ra === rb) continue
        const ca = contactsOf[ra], cb = contactsOf[rb]
        const conflict = ca.size > 0 && cb.size > 0 && ![...ca].some(c => cb.has(c))
        if (conflict) continue // homonymes
        if (tryUnion(ra, rb)) { maybe.add(idxs[i]); maybe.add(idxs[j]) }
      }
  }

  // ── Groupes ─────────────────────────────────────────────────────────────────
  const groups = new Map<number, number[]>()
  rows.forEach((_, i) => {
    const r = find(i)
    groups.set(r, [...(groups.get(r) ?? []), i])
  })

  type Draft = { id: number; members: Row[]; parent: DirectoryParent }
  const drafts: Draft[] = []

  for (const [root, idxs] of groups) {
    const members = idxs.map(i => rows[i])
    const names = members.map(m => `${m.firstName ?? ''} ${m.lastName}`.trim()).filter(Boolean)
    const orderedNames = distinctByFrequency(names, n => normalizeName(n).sort().join(' '))
    const roleCounts: Partial<Record<GuardianRole, number>> = {}
    for (const m of members) roleCounts[m.relationship] = (roleCounts[m.relationship] ?? 0) + 1
    const specific = members.map(m => m.relationship).filter(r => r === 'father' || r === 'mother')
    const role = mostFrequent(specific) ?? mostFrequent(members.map(m => m.relationship)) ?? 'guardian'

    const phoneFieldEmails = distinctByFrequency(
      members.map(m => m.phone?.trim() ?? '').filter(v => v.includes('@')), v => v.toLowerCase())
    const invalidPhones = distinctByFrequency(
      members.map(m => m.phone?.trim() ?? '').filter(v => v && !v.includes('@') && !isValidPhone(v)), v => v)
    const phones = distinctByFrequency(
      members.map(m => m.phone?.trim() ?? '').filter(v => v && !v.includes('@') && isValidPhone(v)),
      v => phoneKey(v) ?? v)

    const children = new Map<string, DirectoryChild>()
    for (const m of members) children.set(m.studentId, { id: m.studentId, name: m.studentName, linked: !!m.linkedMemberId })
    const linked = new Set(members.map(m => m.linkedMemberId).filter((x): x is string => !!x))

    drafts.push({
      id: root,
      members,
      parent: {
        key: `g-${members.map(m => m.id).sort()[0]}`,
        name: orderedNames[0] ?? '—',
        nameVariants: orderedNames.slice(1),
        role,
        roleCounts,
        emails: distinctByFrequency(members.map(m => m.email?.trim() ?? '').filter(v => v.includes('@')), v => v.toLowerCase()),
        phones,
        emergencyPhones: distinctByFrequency(members.map(m => m.emergencyPhone?.trim() ?? '').filter(Boolean), v => phoneKey(v) ?? v),
        phoneFieldEmails,
        invalidPhones,
        children: [...children.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        guardianIds: members.map(m => m.id),
        connectedNames: [],
        isConnected: linked.size > 0,
        accountOnly: false,
        maybeSame: idxs.some(i => maybe.has(i)),
        sharedWith: [],
        mergedCount: members.length,
        firstSeen: members.reduce((min, m) => (m.createdAt < min ? m.createdAt : min), members[0].createdAt).toISOString(),
      },
    })
  }

  // ── Contact partagé entre parents distincts (couple, famille) ───────────────
  const groupOf = (rowIndex: number) => find(rowIndex)
  const draftById = new Map(drafts.map(d => [d.id, d]))
  for (const buckets of [emailBuckets, phoneBuckets])
    for (const idxs of buckets.values()) {
      const gids = [...new Set(idxs.map(groupOf))]
      if (gids.length < 2) continue
      for (const gid of gids) {
        const d = draftById.get(gid)!
        for (const other of gids) {
          if (other === gid) continue
          const name = draftById.get(other)!.parent.name
          if (!d.parent.sharedWith.includes(name)) d.parent.sharedWith.push(name)
        }
      }
    }

  // ── Comptes connectés ───────────────────────────────────────────────────────
  const byLinkedMember = new Map<string, Draft>()
  for (const d of drafts)
    for (const m of d.members) if (m.linkedMemberId) byLinkedMember.set(m.linkedMemberId, d)

  const accountOnlyParents: DirectoryParent[] = []
  for (const acc of accounts) {
    const accTokens = normalizeName(acc.fullName)
    const accEmail = normalizeEmail(acc.email)
    const accPhone = phoneKey(acc.phone)
    const label = acc.fullName ?? acc.email ?? 'Parent connecté'

    let matched: Draft[] = []
    const direct = byLinkedMember.get(acc.schoolMemberId)
    if (direct) matched = [direct]
    else {
      matched = drafts.filter(d =>
        d.parent.children.some(c => acc.studentIds.includes(c.id)) &&
        d.members.some(m =>
          (accEmail && m.emailKey === accEmail) ||
          (accPhone && m.phoneKey === accPhone) ||
          (accTokens.length >= 2 && nameKey(m.tokens) === nameKey(accTokens))),
      )
    }
    if (matched.length === 0) {
      const kids = new Map<string, DirectoryChild>()
      for (const d of drafts)
        for (const c of d.parent.children) if (acc.studentIds.includes(c.id)) kids.set(c.id, c)
      accountOnlyParents.push({
        key: `a-${acc.schoolMemberId}`,
        name: label,
        nameVariants: [],
        role: 'guardian',
        roleCounts: {},
        emails: accEmail ? [accEmail] : [],
        phones: acc.phone && isValidPhone(acc.phone) ? [acc.phone] : [],
        emergencyPhones: [],
        phoneFieldEmails: [],
        invalidPhones: [],
        children: [...kids.values()],
        guardianIds: [],
        connectedNames: [label],
        isConnected: true,
        accountOnly: true,
        maybeSame: false,
        sharedWith: [],
        mergedCount: 0,
        firstSeen: '',
      })
      continue
    }
    for (const d of matched) {
      d.parent.isConnected = true
      if (!d.parent.connectedNames.includes(label)) d.parent.connectedNames.push(label)
    }
  }

  return [...drafts.map(d => d.parent), ...accountOnlyParents]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
}
