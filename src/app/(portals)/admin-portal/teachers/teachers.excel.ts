import * as XLSX from 'xlsx'
import type { TeacherListItem } from '@/modules/teachers/teachers.types'

export function exportTeachersToExcel(teachers: TeacherListItem[]) {
  const rows = teachers.map(t => ({
    'Nom complet':       t.fullName ?? '—',
    'Email':             t.email,
    'Téléphone':         t.phone ?? '—',
    'Type':              t.teacherType === 'volunteer' ? 'Bénévole' : t.teacherType === 'paid' ? 'Payé' : '—',
    'Classes actives':   t.classCount,
    'Statut':            t.isPending ? 'En attente' : 'Actif',
    'Membre depuis':     new Date(t.createdAt).toLocaleDateString('fr-FR'),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Enseignants')

  const colWidths = [{ wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 16 }]
  ws['!cols'] = colWidths

  XLSX.writeFile(wb, `enseignants_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
