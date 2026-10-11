import { localTodayISO } from '@/lib/dates'
import { formatPhone } from '@/lib/phone'
import * as XLSX from 'xlsx'
import type { RegistrationWithDetails } from '@/modules/registrations/registrations.types'

export function exportRegistrationsToExcel(registrations: RegistrationWithDetails[]) {
  const rows = registrations.map(r => {
    const father = r.parents.find(p => p.relationship === 'father')
    const mother = r.parents.find(p => p.relationship === 'mother')
    const others = r.parents.filter(p => p.relationship !== 'father' && p.relationship !== 'mother')
    return {
      'ID': r.studentCustomId ?? '',
      'Élève': `${r.studentFirstName ?? ''} ${r.studentLastName ?? ''}`.trim(),
      'Type': r.formType === 'new_student' ? 'Nouvel élève' : 'Réinscription',
      'Statut': r.status === 'pending' ? 'En attente' : r.status === 'approved' ? 'Approuvé' : 'Rejeté',
      'Date de soumission': new Date(r.submittedAt).toLocaleDateString('fr-FR'),
      // Mêmes colonnes tuteurs que l'export du tableau Élèves
      'Nom du père': father?.name ?? '',
      'Tél. du père': formatPhone(father?.phone),
      'Email du père': father?.email ?? '',
      'Nom de la mère': mother?.name ?? '',
      'Tél. de la mère': formatPhone(mother?.phone),
      'Email de la mère': mother?.email ?? '',
      'Autres tuteurs': others.map(g => [`${g.name} (${g.relationship === 'guardian' ? 'Tuteur légal' : 'Autre'})`, formatPhone(g.phone), g.email].filter(Boolean).join(' — ')).join(' ; '),
      'Niveau': r.grade ?? '',
      'Classes': r.classes.map(c => c.fullCode).join(', '),
      'Fréquence de paiement': r.paymentFrequency ?? '',
      'Aide financière': r.financialAid ?? '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions')
  XLSX.writeFile(wb, `inscriptions-${localTodayISO()}.xlsx`)
}
