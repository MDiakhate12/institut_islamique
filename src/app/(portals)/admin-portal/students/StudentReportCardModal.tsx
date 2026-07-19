'use client'

import { useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStudentReportCard } from '@/modules/students/students.hooks'
import { Loader2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentListItem } from '@/modules/students/students.types'
import type { StudentExamResult } from '@/modules/students/students.types'

const TRIMESTER_LABEL: Record<number, string> = { 1: 'Trimestre 1', 2: 'Trimestre 2', 3: 'Trimestre 3' }

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  student: StudentListItem
}

export function StudentReportCardModal({ open, onOpenChange, student }: Props) {
  const { data, isLoading } = useStudentReportCard(student.id, open)
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = printRef.current
    if (!content) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Bulletin — ${student.firstName} ${student.lastName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
          .report { max-width: 700px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #7a4f30, #c2440f); color: white; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
          .header-title { font-size: 22px; font-weight: 700; }
          .header-sub { font-size: 13px; margin-top: 4px; opacity: 0.9; }
          .logo { width: 52px; height: 52px; border-radius: 50%; background: #c2440f; border: 2px solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: white; }
          .student-info { background: #fdf6f0; padding: 16px 32px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e0db; }
          .student-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
          .student-meta { font-size: 12px; color: #666; text-align: right; line-height: 1.6; }
          .section { padding: 20px 32px; border-bottom: 1px solid #f0ebe6; }
          .section-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }
          .class-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .class-table th { background: #f9f5f2; padding: 8px 12px; text-align: left; font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e0db; }
          .class-table td { padding: 8px 12px; border-bottom: 1px solid #f0ebe6; }
          .att-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .att-card { border: 2px solid; border-radius: 8px; padding: 12px; text-align: center; }
          .att-card.present { border-color: #16a34a; }
          .att-card.late { border-color: #d97706; }
          .att-card.absent { border-color: #dc2626; }
          .att-card.excused { border-color: #2563eb; }
          .att-num { font-size: 26px; font-weight: 700; }
          .att-card.present .att-num { color: #16a34a; }
          .att-card.late .att-num { color: #d97706; }
          .att-card.absent .att-num { color: #dc2626; }
          .att-card.excused .att-num { color: #2563eb; }
          .att-label { font-size: 11px; color: #666; margin-top: 2px; }
          .perf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .perf-card { border: 1px solid #e5e0db; border-radius: 8px; padding: 12px; text-align: center; }
          .perf-num { font-size: 22px; font-weight: 700; }
          .perf-num.stars { color: #c2440f; }
          .perf-num.graded { color: #16a34a; }
          .perf-num.trophy { color: #999; font-size: 16px; }
          .perf-label { font-size: 11px; color: #666; margin-top: 2px; }
          .exam-card { border: 1px solid #e5e0db; border-radius: 8px; margin-bottom: 12px; overflow: hidden; border-left: 4px solid #7a4f30; }
          .exam-header { background: #fdf6f0; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
          .exam-class { font-weight: 600; color: #333; }
          .exam-trimester { color: #666; font-size: 11px; }
          .exam-score { text-align: center; padding: 16px; border-bottom: 1px solid #f0ebe6; }
          .exam-score-num { font-size: 40px; font-weight: 700; color: #7a4f30; }
          .exam-score-label { font-size: 11px; color: #999; }
          .criteria-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; padding: 0 16px; }
          .criteria-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f5f0ec; }
          .criteria-row:last-child { border-bottom: none; }
          .criteria-name { font-size: 12px; color: #444; }
          .criteria-stars { display: flex; align-items: center; gap: 4px; }
          .star { font-size: 13px; }
          .star.filled { color: #c2440f; }
          .star.empty { color: #ddd; }
          .criteria-score { font-size: 11px; color: #999; margin-left: 4px; }
          .text-section { padding: 10px 16px; font-size: 12px; }
          .text-label { font-weight: 600; color: #555; margin-bottom: 4px; }
          .text-content { color: #333; line-height: 1.5; }
          .signature-bar { background: #f0fdf4; padding: 10px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #16a34a; border-top: 1px solid #dcfce7; }
          .signature-bar.unsigned { background: #fef2f2; color: #dc2626; border-top-color: #fecaca; }
          .payment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .pay-btn { padding: 10px; border-radius: 6px; text-align: center; font-size: 12px; font-weight: 600; }
          .pay-btn.paid { background: #16a34a; color: white; }
          .pay-btn.unpaid { background: #dc2626; color: white; }
          .footer { padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #999; border-top: 1px solid #f0ebe6; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0; size: A4; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 400)
  }

  const father = student.guardians.find(g => g.relationship === 'father' || g.isPrimary)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-6 py-3 border-b sticky top-0 bg-white z-10">
          <DialogTitle className="text-base font-semibold">
            Bulletin de notes — {student.firstName} {student.lastName}
          </DialogTitle>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#c2440f] hover:bg-[#a33a0d] text-white rounded-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div ref={printRef} className="report bg-white">

            {/* ── En-tête ── */}
            <div className="header" style={{ background: 'linear-gradient(135deg, #7a4f30, #c2440f)', color: 'white', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700 }}>Student Report Card</div>
                <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
                  {data?.schoolName} • {student.enrollmentYear ?? '—'}
                </div>
              </div>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#c2440f', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: 'white' }}>
                Q
              </div>
            </div>

            {/* ── Info élève ── */}
            <div style={{ background: '#fdf6f0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e0db' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{student.firstName} {student.lastName}</div>
              <div style={{ fontSize: 12, color: '#666', textAlign: 'right', lineHeight: '1.6' }}>
                <div>{student.enrollmentYear ?? '—'}</div>
                {father?.phone && <div>Tél : {father.phone}</div>}
              </div>
            </div>

            {/* ── Classes ── */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0ebe6' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Classes</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9f5f2' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e0db' }}>Classe</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e0db' }}>Enseignant</th>
                  </tr>
                </thead>
                <tbody>
                  {student.enrollments.length > 0 ? student.enrollments.map(e => (
                    <tr key={e.enrollmentId}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0ebe6' }}>
                        <span style={{ fontWeight: 700, color: '#7a4f30' }}>{e.classCode}</span>
                        {e.className && <span style={{ color: '#444' }}> — {e.className}</span>}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0ebe6', color: '#555' }}>
                        {e.teacherName ?? '—'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} style={{ padding: '8px 12px', color: '#999', fontStyle: 'italic' }}>Aucune classe inscrite</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Présences ── */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0ebe6' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Présences</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <AttCard value={student.attendancePresent}  label="Présent"   color="#16a34a" />
                <AttCard value={student.attendanceLate}     label="En retard" color="#d97706" />
                <AttCard value={student.attendanceAbsent}   label="Absent"    color="#dc2626" />
                <AttCard value={student.attendanceExcused}  label="Excusé"    color="#2563eb" />
              </div>
            </div>

            {/* ── Performance académique ── */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0ebe6' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Performance académique</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <PerfCard value={data?.totalStars ?? 0}        label="Total Étoiles"       color="#c2440f" />
                <PerfCard value={data?.gradedSubmissions ?? 0} label="Soumissions notées"  color="#16a34a" />
                <PerfCard value={null}                         label="Niveau Trophée"       color="#999" />
              </div>
            </div>

            {/* ── Notes d'examens ── */}
            {data && data.examResults.length > 0 && (
              <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0ebe6' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Notes d&apos;examens</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.examResults.map(exam => (
                    <ExamCard key={exam.id} exam={exam} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Statut des paiements ── */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0ebe6' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Statut des paiements</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Trimestre 1', paid: student.paymentT1 },
                  { label: 'Trimestre 2', paid: student.paymentT2 },
                  { label: 'Trimestre 3', paid: student.paymentT3 },
                ].map(({ label, paid }) => (
                  <div
                    key={label}
                    style={{
                      padding: '10px',
                      borderRadius: 6,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      background: paid ? '#16a34a' : '#dc2626',
                      color: 'white',
                    }}
                  >
                    {label} : {paid ? 'Payé' : 'Non payé'}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pied de page ── */}
            <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#999' }}>
              <span>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>Page 1 of 1</span>
              <span style={{ opacity: 0 }}>—</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AttCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function PerfCard({ value, label, color }: { value: number | null; label: string; color: string }) {
  return (
    <div style={{ border: '1px solid #e5e0db', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>
        {value !== null ? value : '—'}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function StarRow({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f0ec' }}>
      <span style={{ fontSize: 12, color: '#444' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ fontSize: 13, color: i < v ? '#c2440f' : '#ddd' }}>★</span>
        ))}
        <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>{v}/5</span>
      </span>
    </div>
  )
}

function ExamCard({ exam }: { exam: StudentExamResult }) {
  const criteria: Array<[string, number | null]> = [
    ['Soin / Investissement', exam.eagerness],
    ['Participation', exam.participation],
    ['Respect (Enseignant)', exam.respectTeachers],
    ['Respect (Autres)', exam.respectOthers],
    ['Présence', exam.attendance],
    ['Apporte ses livres', exam.bringBooks],
  ]

  // Split into 2 columns
  const left  = criteria.filter((_, i) => i % 2 === 0)
  const right  = criteria.filter((_, i) => i % 2 === 1)

  return (
    <div style={{ border: '1px solid #e5e0db', borderRadius: 8, overflow: 'hidden', borderLeft: '4px solid #7a4f30' }}>
      {/* Card header */}
      <div style={{ background: '#fdf6f0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>
          <span style={{ color: '#7a4f30', fontWeight: 700 }}>{exam.classCode}</span>
          {exam.className && <span> — {exam.className}</span>}
        </div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {TRIMESTER_LABEL[exam.trimester]} {exam.academicYear ?? ''}
        </div>
      </div>

      {/* Score */}
      {exam.score !== null && (
        <div style={{ textAlign: 'center', padding: '16px', borderBottom: '1px solid #f0ebe6' }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: '#7a4f30', lineHeight: 1 }}>{exam.score}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Points d&apos;examen</div>
        </div>
      )}

      {/* Criteria grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '0 16px' }}>
        <div style={{ borderRight: '1px solid #f5f0ec', paddingRight: 12 }}>
          {left.map(([label, val]) => <StarRow key={label} label={label} value={val} />)}
        </div>
        <div style={{ paddingLeft: 12 }}>
          {right.map(([label, val]) => <StarRow key={label} label={label} value={val} />)}
        </div>
      </div>

      {/* Covered content */}
      {exam.coveredContent && (
        <div style={{ padding: '10px 16px', fontSize: 12, borderTop: '1px solid #f5f0ec' }}>
          <div style={{ fontWeight: 600, color: '#555', marginBottom: 4 }}>Contenu abordé :</div>
          <div style={{ color: '#333', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{exam.coveredContent}</div>
        </div>
      )}

      {/* Teacher feedback */}
      {exam.generalComments && (
        <div style={{ padding: '10px 16px', fontSize: 12, borderTop: '1px solid #f5f0ec' }}>
          <div style={{ fontWeight: 600, color: '#555', marginBottom: 4 }}>Commentaire enseignant :</div>
          <div style={{ color: '#333', lineHeight: 1.5 }}>{exam.generalComments}</div>
        </div>
      )}

      {/* Signature */}
      <div style={{
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 600,
        borderTop: '1px solid',
        background: exam.parentSignature ? '#f0fdf4' : '#fef2f2',
        color: exam.parentSignature ? '#16a34a' : '#dc2626',
        borderTopColor: exam.parentSignature ? '#dcfce7' : '#fecaca',
      }}>
        Signature parent : {exam.parentSignature ? 'Signé ✓' : 'En attente'}
      </div>
    </div>
  )
}
