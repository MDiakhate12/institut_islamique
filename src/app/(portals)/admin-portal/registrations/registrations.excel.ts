import * as XLSX from 'xlsx'
import type { RegistrationWithDetails } from '@/modules/registrations/registrations.types'

export function exportRegistrationsToExcel(registrations: RegistrationWithDetails[]) {
  const rows = registrations.map(r => ({
    'ID': r.studentCustomId ?? '',
    'Élève': `${r.studentFirstName ?? ''} ${r.studentLastName ?? ''}`.trim(),
    'Type': r.formType === 'new_student' ? 'Nouvel élève' : 'Réinscription',
    'Statut': r.status === 'pending' ? 'En attente' : r.status === 'approved' ? 'Approuvé' : 'Rejeté',
    'Date de soumission': new Date(r.submittedAt).toLocaleDateString('fr-FR'),
    'Parents': r.parents.map(p => p.name).join(', '),
    'E-mail': r.parents.map(p => p.email).filter(Boolean).join(', '),
    'Téléphone': r.parents.map(p => p.phone).filter(Boolean).join(', '),
    'Niveau': r.grade ?? '',
    'Classes': r.classes.map(c => c.fullCode).join(', '),
    'Fréquence de paiement': r.paymentFrequency ?? '',
    'Aide financière': r.financialAid ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions')
  XLSX.writeFile(wb, `inscriptions-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
