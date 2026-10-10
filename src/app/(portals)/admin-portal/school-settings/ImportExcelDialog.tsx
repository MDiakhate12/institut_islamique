'use client'

import { useState, useRef } from 'react'
import { isValidPhone } from '@/lib/phone'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Upload, CheckCircle, XCircle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { importStudentsAction } from '@/modules/students/students.actions'
import { importTeachersAction } from '@/modules/teachers/teachers.actions'

// ── Types ──────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'result'

interface PreviewRow {
  index: number
  data: Record<string, string>
  error?: string
}

interface ImportResult {
  created: number
  errors: { row: number; message: string }[]
}

// ── Config per type ────────────────────────────────────────────────────────────

const STUDENT_HEADERS = ['Prénom', 'Nom', 'Genre (Garçon/Fille)', 'Date de naissance', 'Téléphone parent', 'Nom parent 1', 'Nom parent 2', 'Email 1', 'Email 2']
const STUDENT_EXAMPLE = ['Mohammed', 'Dupont', 'Garçon', '15/03/2015', '0612345678', 'Ali Dupont', 'Fatima Dupont', 'ali@email.com', '']
const STUDENT_REQUIRED = ['Prénom', 'Nom', 'Genre (Garçon/Fille)']

const TEACHER_HEADERS = ['Nom complet', 'Email', 'Type (Bénévole/Payé)', 'Téléphone']
const TEACHER_EXAMPLE = ['Ibrahim Martin', 'ibrahim@email.com', 'Bénévole', '0698765432']
const TEACHER_REQUIRED = ['Nom complet', 'Email', 'Type (Bénévole/Payé)']

function downloadTemplate(type: 'students' | 'teachers') {
  const headers = type === 'students' ? STUDENT_HEADERS : TEACHER_HEADERS
  const example = type === 'students' ? STUDENT_EXAMPLE : TEACHER_EXAMPLE
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map(() => ({ wch: 26 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Import')
  XLSX.writeFile(wb, type === 'students' ? 'modele-eleves.xlsx' : 'modele-enseignants.xlsx')
}

// Excel stocke un téléphone tapé (0612345678) ou une date (15/03/2015) comme un NOMBRE,
// pas comme du texte : on convertit chaque cellule numérique en texte avant la lecture,
// sinon les `.trim()` plantent (le bouton « Importer » semblait ne rien faire).
// Les dates sont converties d'après le format de la cellule → 'AAAA-MM-JJ', sans ambiguïté.
function parseRows(ws: XLSX.WorkSheet): Record<string, string>[] {
  for (const [addr, cell] of Object.entries(ws) as [string, XLSX.CellObject][]) {
    if (addr.startsWith('!') || cell.t !== 'n') continue
    if (cell.z && XLSX.SSF.is_date(cell.z)) {
      const d = XLSX.SSF.parse_date_code(cell.v as number)
      cell.v = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    } else {
      cell.v = String(cell.v)
    }
    cell.t = 's'
    delete cell.w
  }
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '', raw: false })
}

/** 'JJ/MM/AAAA', 'JJ-MM-AAAA', 'JJ.MM.AA' ou 'AAAA-MM-JJ' → 'AAAA-MM-JJ'. '' si vide, null si invalide. */
function normalizeBirthDate(raw: string | undefined): string | null {
  const value = raw?.trim() ?? ''
  if (!value) return ''
  let y: number, m: number, d: number
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const fr  = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  } else if (fr) {
    [d, m, y] = [Number(fr[1]), Number(fr[2]), Number(fr[3])]
    if (fr[3].length === 2) y += y > new Date().getFullYear() % 100 ? 1900 : 2000
  } else {
    return null
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  if (date > new Date()) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Un numéro français tapé dans Excel perd son 0 initial (612345678) : on le remet. */
function normalizePhone(raw: string | undefined): string {
  const value = raw?.trim() ?? ''
  return /^[1-9]\d{8}$/.test(value) ? `0${value}` : value
}

function validateStudentRow(row: Record<string, string>): string | null {
  const firstName = row['Prénom']?.trim()
  const lastName = row['Nom']?.trim()
  const genre = row['Genre (Garçon/Fille)']?.trim().toLowerCase()
  if (!firstName) return 'Prénom manquant'
  if (!lastName) return 'Nom manquant'
  if (!genre) return 'Genre manquant'
  if (!['garçon', 'garcon', 'g', 'fille', 'f'].some(v => genre.startsWith(v))) {
    return `Genre invalide "${row['Genre (Garçon/Fille)']}". Utilisez Garçon ou Fille`
  }
  if (normalizeBirthDate(row['Date de naissance']) === null) {
    return `Date de naissance invalide "${row['Date de naissance']}". Format attendu : JJ/MM/AAAA`
  }
  if (!isValidPhone(normalizePhone(row['Téléphone parent']))) {
    return `Téléphone invalide "${row['Téléphone parent']}". Ex. 06 12 34 56 78, ou +213… pour l'étranger`
  }
  return null
}

function validateTeacherRow(row: Record<string, string>): string | null {
  const fullName = row['Nom complet']?.trim()
  const email = row['Email']?.trim()
  const type = row['Type (Bénévole/Payé)']?.trim().toLowerCase()
  if (!fullName) return 'Nom complet manquant'
  if (!email || !email.includes('@')) return 'Email invalide ou manquant'
  if (!type) return 'Type manquant'
  if (!['bénévole', 'benevole', 'b', 'payé', 'paye', 'p'].some(v => type.startsWith(v))) {
    return `Type invalide "${row['Type (Bénévole/Payé)']}". Utilisez Bénévole ou Payé`
  }
  if (!isValidPhone(normalizePhone(row['Téléphone']))) {
    return `Téléphone invalide "${row['Téléphone']}". Ex. 06 12 34 56 78, ou +213… pour l'étranger`
  }
  return null
}

// ── Dialog component ───────────────────────────────────────────────────────────

interface ImportExcelDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  type: 'students' | 'teachers'
}

export function ImportExcelDialog({ open, onOpenChange, type }: ImportExcelDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isStudents = type === 'students'
  const title = isStudents ? "Import d'élèves" : "Import d'enseignants"
  const headers = isStudents ? STUDENT_HEADERS : TEACHER_HEADERS
  const validate = isStudents ? validateStudentRow : validateTeacherRow

  function reset() {
    setStep('upload')
    setFileName('')
    setPreviewRows([])
    setTotalRows(0)
    setAllRows([])
    setResult(null)
    setLoading(false)
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Format invalide. Utilisez un fichier .xlsx ou .xls')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'binary', cellNF: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = parseRows(ws)
      if (rows.length === 0) {
        toast.error('Le fichier est vide ou ne contient pas de données')
        return
      }
      setAllRows(rows)
      setTotalRows(rows.length)
      setPreviewRows(
        rows.slice(0, 10).map((row, i) => ({
          index: i + 2,
          data: row,
          error: validate(row) ?? undefined,
        }))
      )
      setStep('preview')
    }
    reader.readAsBinaryString(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  async function runImport() {
    setLoading(true)
    try {
      let res
      if (isStudents) {
        const mapped = allRows.map(r => ({
          firstName:    r['Prénom']?.trim() || '',
          lastName:     r['Nom']?.trim()    || '',
          gender:       r['Genre (Garçon/Fille)']?.trim() || '',
          // Date invalide : on transmet la valeur brute pour que le serveur rejette la ligne
          // (comme l'aperçu), au lieu d'importer l'élève sans date
          birthDate:    normalizeBirthDate(r['Date de naissance']) ?? r['Date de naissance'],
          parentPhone:  normalizePhone(r['Téléphone parent']),
          parentName1:  r['Nom parent 1']?.trim()         || '',
          parentName2:  r['Nom parent 2']?.trim()         || '',
          email1:       r['Email 1']?.trim()              || '',
          email2:       r['Email 2']?.trim()              || '',
        }))
        res = await importStudentsAction(mapped)
      } else {
        const mapped = allRows.map(r => ({
          fullName:    r['Nom complet']?.trim()             || '',
          email:       r['Email']?.trim()                   || '',
          teacherType: r['Type (Bénévole/Payé)']?.trim()   || '',
          phone:       normalizePhone(r['Téléphone']),
        }))
        res = await importTeachersAction(mapped)
      }
      if (!res.success) { toast.error(res.error); return }
      setResult(res.data)
      setStep('result')
    } catch (e) {
      console.error('[ImportExcelDialog]', e)
      toast.error("L'import a échoué. Vérifiez le fichier et réessayez.")
    } finally {
      setLoading(false)
    }
  }

  const validCount = allRows.filter(r => !validate(r)).length
  const invalidCount = allRows.length - validCount

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#2d6a4f]" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Colonnes requises : <span className="font-medium text-foreground">
                {(isStudents ? STUDENT_REQUIRED : TEACHER_REQUIRED).join(', ')}
              </span>
            </p>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => downloadTemplate(type)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#16a34a]" />
              Télécharger le modèle Excel
            </Button>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
                dragging ? 'border-[#2d6a4f] bg-orange-50' : 'border-border hover:border-[#2d6a4f]/50 hover:bg-muted/30'
              )}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Glissez votre fichier ici ou cliquez pour choisir</p>
              <p className="text-xs text-muted-foreground mt-1">Formats acceptés : .xlsx, .xls</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Fichier : <span className="font-medium text-foreground">{fileName}</span></span>
              <span className="text-muted-foreground">—</span>
              <span className="text-green-600 font-medium">{validCount} valide{validCount > 1 ? 's' : ''}</span>
              {invalidCount > 0 && (
                <span className="text-red-500 font-medium">{invalidCount} ignoré{invalidCount > 1 ? 's' : ''}</span>
              )}
              {totalRows > 10 && (
                <span className="text-muted-foreground text-xs">(aperçu : 10 premières lignes sur {totalRows})</span>
              )}
            </div>

            <div className="overflow-auto border rounded-lg flex-1">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                    {headers.map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(row => (
                    <tr key={row.index} className={cn('border-t', row.error ? 'bg-red-50' : '')}>
                      <td className="px-2 py-1.5 text-muted-foreground">{row.index}</td>
                      {headers.map(h => (
                        <td key={h} className="px-2 py-1.5 max-w-[140px] truncate">{row.data[h] || '—'}</td>
                      ))}
                      <td className="px-2 py-1.5">
                        {row.error
                          ? <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3 shrink-0" />{row.error}</span>
                          : <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3 shrink-0" />OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour
              </Button>
              <Button
                size="sm"
                disabled={validCount === 0 || loading}
                onClick={runImport}
                className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {loading ? 'Import en cours...' : `Importer ${validCount} ligne${validCount > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Result ── */}
        {step === 'result' && result && (
          <div className="space-y-4 py-2">
            {result.created > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-800">
                  {result.created} {isStudents ? `élève${result.created > 1 ? 's' : ''}` : `enseignant${result.created > 1 ? 's' : ''}`} importé{result.created > 1 ? 's' : ''} avec succès
                </p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <XCircle className="h-4 w-4" />
                  {result.errors.length} ligne{result.errors.length > 1 ? 's' : ''} ignorée{result.errors.length > 1 ? 's' : ''}
                </div>
                <div className="border rounded-lg divide-y max-h-40 overflow-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex gap-3 px-3 py-2 text-xs">
                      <span className="text-muted-foreground shrink-0">Ligne {e.row}</span>
                      <span className="text-red-600">{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.created === 0 && result.errors.length === 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">Aucune ligne importée.</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              {result.errors.length > 0 && (
                <Button variant="outline" size="sm" onClick={reset}>
                  Nouvel import
                </Button>
              )}
              <Button size="sm" onClick={() => handleClose(false)} className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white">
                Fermer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
