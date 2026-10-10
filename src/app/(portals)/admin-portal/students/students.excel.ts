import { localTodayISO } from '@/lib/dates'
import { formatPhone } from '@/lib/phone'
import * as XLSX from 'xlsx'
import type { GuardianSummary, StudentListItem } from '@/modules/students/students.types'
import { calcAge, guardianDisplayName } from '@/modules/students/students.types'

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Père',
  mother: 'Mère',
  guardian: 'Tuteur légal',
  other: 'Autre',
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
}

function findGuardian(s: StudentListItem, relationship: 'father' | 'mother'): GuardianSummary | undefined {
  return s.guardians.find(g => g.relationship === relationship)
}

function paymentStatus(s: StudentListItem, paid: boolean): string {
  if (s.paymentAnnual) return 'Payé (annuel)'
  return paid ? 'Payé' : 'Non payé'
}

/**
 * Export Excel de la liste des élèves : **toutes** les colonnes du tableau (affichées ou non)
 * + tuteurs, paiements, présences et réponses au formulaire d'inscription.
 * Les lignes sont celles affichées (filtres et tri appliqués).
 */
export function exportStudentsToExcel(students: StudentListItem[]) {
  // Une colonne par question personnalisée du formulaire d'inscription, dans l'ordre de première apparition
  const customLabels = Array.from(new Set(students.flatMap(s => s.regCustomFields.map(f => f.label))))

  const rows = students.map(s => {
    const father = findGuardian(s, 'father')
    const mother = findGuardian(s, 'mother')
    const others = s.guardians.filter(g => g.relationship !== 'father' && g.relationship !== 'mother')
    const age = calcAge(s.birthDate)

    const row: Record<string, string | number> = {
      'ID élève':                   s.studentCustomId ?? '',
      'Nom':                        s.lastName,
      'Prénom':                     s.firstName,
      'Genre':                      s.gender === 'male' ? 'Garçon' : s.gender === 'female' ? 'Fille' : '',
      'Date de naissance':          formatDate(s.birthDate),
      'Âge':                        age === '—' ? '' : age,
      'Classe(s)':                  s.enrollments.map(e => e.className ? `${e.classCode} — ${e.className}` : e.classCode).join(', '),
      'Enseignant(s)':              Array.from(new Set(s.enrollments.map(e => e.teacherName).filter(Boolean))).join(', '),
      'Enseignant(e) précédent(e)': s.previousTeacher ?? '',
      'Statut':                     s.isActive ? 'Actif' : 'Inactif',
      "Année d'inscription":        s.enrollmentYear ?? '',
      "Date d'inscription":         formatDate(s.createdAt),
      'Niveau scolaire':            s.schoolGrade ?? '',
      'Nom du père':                father ? guardianDisplayName(father) : s.regFatherName ?? '',
      'Tél. du père':               formatPhone(father?.phone ?? s.regPhone),
      'Email du père':              father?.email ?? s.regEmail ?? '',
      'Nom de la mère':             mother ? guardianDisplayName(mother) : s.regMotherName ?? '',
      'Tél. de la mère':            formatPhone(mother?.phone),
      'Email de la mère':           mother?.email ?? '',
      'Autres tuteurs':             others
        .map(g => [
          `${guardianDisplayName(g)} (${RELATIONSHIP_LABELS[g.relationship] ?? g.relationship})`,
          formatPhone(g.phone), g.email,
        ].filter(Boolean).join(' — '))
        .join(' ; '),
      'Paiement T1':                paymentStatus(s, s.paymentT1),
      'Paiement T2':                paymentStatus(s, s.paymentT2),
      'Paiement T3':                paymentStatus(s, s.paymentT3),
      'Présences':                  s.attendancePresent,
      'Retards':                    s.attendanceLate,
      'Absences':                   s.attendanceAbsent,
      'Absences excusées':          s.attendanceExcused,
      'Dernière présence':          formatDate(s.lastAttendanceDate),
      'Parrainage':                 s.regSponsorship ?? '',
      'Notes':                      s.notes ?? '',
    }
    for (const label of customLabels) {
      row[label] = s.regCustomFields.find(f => f.label === label)?.value ?? ''
    }
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  // Largeur des colonnes : d'après l'en-tête et le contenu, bornée pour rester lisible
  const headers = Object.keys(rows[0] ?? {})
  ws['!cols'] = headers.map(h => ({
    wch: Math.min(40, Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)) + 2),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Élèves')
  XLSX.writeFile(wb, `eleves-${localTodayISO()}.xlsx`)
}
