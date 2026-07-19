import * as XLSX from 'xlsx'
import type { StudentListItem } from '@/modules/students/students.types'

export function exportStudentsToExcel(students: StudentListItem[]) {
  const rows = students.map(s => ({
    'Nom': s.lastName,
    'Prénom': s.firstName,
    'Genre': s.gender === 'male' ? 'Garçon' : 'Fille',
    'Date de naissance': s.birthDate
      ? new Date(s.birthDate).toLocaleDateString('fr-FR')
      : '',
    'Classe': s.enrollments.map(e => e.classCode || e.className).join(', '),
    'Statut': s.isActive ? 'Actif' : 'Inactif',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Élèves')
  XLSX.writeFile(wb, `eleves-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
