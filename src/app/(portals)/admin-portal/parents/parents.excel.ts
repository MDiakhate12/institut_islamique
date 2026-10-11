import { localTodayISO } from '@/lib/dates'
import { formatPhone } from '@/lib/phone'
import * as XLSX from 'xlsx'
import type { DirectoryParent, GuardianRole } from '@/modules/parents/parents.types'

export const ROLE_LABELS: Record<GuardianRole, string> = {
  father: 'Père', mother: 'Mère', guardian: 'Tuteur légal', other: 'Autre',
}

/** « père ×2, mère ×1 » quand les fiches d'un même parent ne s'accordent pas sur son rôle, sinon ''. */
export function roleConflictLabel(p: DirectoryParent): string {
  const entries = (Object.entries(p.roleCounts) as [GuardianRole, number][])
    .filter(([role]) => role === 'father' || role === 'mother')
  if (entries.length < 2) return ''
  return entries.map(([role, n]) => `${ROLE_LABELS[role].toLowerCase()} ×${n}`).join(', ')
}

export function exportParentsToExcel(parents: DirectoryParent[]) {
  const rows = parents.map(p => ({
    'Parent': p.name,
    'Autres graphies': p.nameVariants.join(' ; '),
    'Rôle': ROLE_LABELS[p.role],
    'Enfants': p.children.map(c => c.name).join(', '),
    'Nombre d\'enfants': p.children.length,
    'Compte portail': p.isConnected ? 'Connecté' : 'Non connecté',
    'E-mails': p.emails.join(', '),
    'Téléphones': p.phones.map(formatPhone).join(', '),
    'Téléphone d\'urgence': p.emergencyPhones.map(formatPhone).join(', '),
    'E-mail saisi dans le champ téléphone': p.phoneFieldEmails.join(', '),
    'Numéros invalides': p.invalidPhones.join(', '),
    'Rôle incohérent': roleConflictLabel(p),
    'Fusion à vérifier': p.maybeSame ? 'Oui' : '',
    'Contact partagé avec': p.sharedWith.join(', '),
    'Fiches fusionnées': p.mergedCount,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Parents')
  XLSX.writeFile(wb, `parents-${localTodayISO()}.xlsx`)
}
