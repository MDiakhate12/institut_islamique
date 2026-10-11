'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useParentDirectory, useSetStudentGuardian } from '@/modules/parents/parents.hooks'
import { normalizeName } from '@/modules/parents/parents.grouping'
import { formatPhone, phoneMatches } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { GuardianSummary } from '@/modules/students/students.types'
import type { DirectoryParent, GuardianRole } from '@/modules/parents/parents.types'

const ROLE_LABELS: Record<GuardianRole, string> = { father: 'Père', mother: 'Mère', guardian: 'Tuteur légal', other: 'Autre' }
const ROLE_BADGE: Record<GuardianRole, string> = {
  father: 'bg-blue-50 text-blue-700 border-blue-200',
  mother: 'bg-pink-50 text-pink-700 border-pink-200',
  guardian: 'bg-muted text-muted-foreground border-border',
  other: 'bg-muted text-muted-foreground border-border',
}
const FIELD = 'h-10 rounded-md px-3 py-2 text-sm'
const MAX_SUGGESTIONS = 6

/**
 * Change (ou ajoute) le parent d'UN élève. L'admin saisit nom / téléphone / e-mail ; une liste de parents existants
 * se propose pendant la saisie — un clic sur une proposition sélectionne ce parent et enregistre tout de suite.
 * Il peut aussi ignorer la liste et enregistrer ce qu'il a saisi. Seule la fiche de cet élève est modifiée.
 */
export function StudentGuardianPicker({
  studentId,
  guardian,
  existingRelationships,
  onSaved,
  onCancel,
}: {
  studentId: string
  /** Fiche remplacée ; absent = ajout d'un tuteur. */
  guardian?: { id?: string; relationship: GuardianRole }
  /** Relations des autres tuteurs de l'élève (un seul père / une seule mère). */
  existingRelationships: string[]
  onSaved: (saved: GuardianSummary) => void
  onCancel: () => void
}) {
  const { data: directory } = useParentDirectory(true)
  const setGuardian = useSetStudentGuardian()

  const [relationship, setRelationship] = useState<GuardianRole>(
    guardian?.relationship ?? (
      !existingRelationships.includes('father') ? 'father' :
      !existingRelationships.includes('mother') ? 'mother' : 'guardian'
    ),
  )
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo(() => {
    const nameTokens = normalizeName(name)
    const phoneDigits = phone.replace(/\D/g, '')
    const mail = email.trim().toLowerCase()
    const typed = name.trim().length >= 2 || phoneDigits.length >= 3 || mail.length >= 3
    if (!typed || !directory) return []

    return directory
      .filter(p => !p.children.some(c => c.id === studentId)) // pas le parent déjà rattaché à cet élève
      .filter(p => {
        const words = normalizeName(`${p.name} ${p.nameVariants.join(' ')}`)
        const nameOk = nameTokens.length === 0 || nameTokens.every(t => words.some(w => w.startsWith(t)))
        const phoneOk = phoneDigits.length < 3 || p.phones.some(ph => phoneMatches(ph, phone))
        const mailOk = mail.length < 3 || p.emails.some(e => e.toLowerCase().includes(mail))
        return nameOk && phoneOk && mailOk
      })
      .sort((a, b) => Number(b.role === relationship) - Number(a.role === relationship) || a.name.localeCompare(b.name, 'fr'))
      .slice(0, MAX_SUGGESTIONS)
  }, [directory, name, phone, email, studentId, relationship])

  async function save(values: { name: string; phone: string; email: string; emergencyPhone?: string }) {
    setError(null)
    const result = await setGuardian.mutateAsync({
      studentId,
      input: { guardianId: guardian?.id, relationship, ...values },
    })
    if (!result.success) { setError(result.error); toast.error(result.error); return }
    toast.success(guardian?.id ? 'Parent changé' : 'Parent ajouté')
    onSaved(result.data)
  }

  function pick(p: DirectoryParent) {
    void save({
      name: p.name,
      phone: p.phones[0] ?? '',
      email: p.emails[0] ?? '',
      emergencyPhone: p.emergencyPhones[0] ?? '',
    })
  }

  return (
    <div className="border border-[#2d6a4f]/30 rounded-lg p-3 space-y-3 bg-emerald-50/30">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Relation</label>
          {guardian ? (
            <p className="h-10 flex items-center text-sm font-medium">{ROLE_LABELS[relationship]}</p>
          ) : (
            <select
              value={relationship}
              onChange={e => setRelationship(e.target.value as GuardianRole)}
              className="h-10 w-full border border-border rounded-md px-3 text-sm"
            >
              <option value="father" disabled={existingRelationships.includes('father')}>Père</option>
              <option value="mother" disabled={existingRelationships.includes('mother')}>Mère</option>
              <option value="guardian">Tuteur légal</option>
              <option value="other">Autre</option>
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Nom</label>
          <Input className={FIELD} value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" autoFocus autoComplete="off" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Téléphone</label>
          <Input className={FIELD} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0X XX XX XX XX" autoComplete="off" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">E-mail</label>
          <Input className={FIELD} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" autoComplete="off" />
        </div>
      </div>

      {suggestions.length > 0 && (
        <div role="listbox" aria-label="Parents existants" className="rounded-lg border border-border bg-white shadow-sm overflow-hidden">
          <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted/40">Parents existants — cliquez pour sélectionner</p>
          {suggestions.map(p => (
            <button
              key={p.key}
              type="button"
              role="option"
              aria-selected={false}
              disabled={setGuardian.isPending}
              onClick={() => pick(p)}
              className="w-full text-left px-3 py-2 border-t border-border/60 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none transition-colors disabled:opacity-60"
            >
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{p.name}</span>
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', ROLE_BADGE[p.role])}>{ROLE_LABELS[p.role]}</span>
                {p.children.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">{p.children.length} enfant{p.children.length > 1 ? 's' : ''}</span>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">
                {[p.phones[0] && formatPhone(p.phones[0]), p.emails[0]].filter(Boolean).join(' · ') || 'Aucune coordonnée'}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Seule la fiche de cet élève est modifiée.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
          <Button
            type="button"
            size="sm"
            disabled={setGuardian.isPending || !(name.trim() || phone.trim() || email.trim())}
            onClick={() => save({ name, phone, email })}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white"
          >
            {setGuardian.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
