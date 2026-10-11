'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSaveParent } from '@/modules/parents/parents.hooks'
import { useStudents } from '@/modules/students/students.hooks'
import { formatPhone } from '@/lib/phone'
import { MAX_GUARDIANS_PER_STUDENT } from '@/lib/constants'
import type { DirectoryParent, GuardianRole } from '@/modules/parents/parents.types'
import { ROLE_LABELS } from './parents.excel'

const ROLES: GuardianRole[] = ['father', 'mother', 'guardian', 'other']

/**
 * Création / modification d'un parent — seul endroit de l'appli où l'on modifie un tuteur d'un élève existant.
 * Enregistrer met à jour la fiche de chacun de ses enfants (une fiche `guardians` par enfant).
 */
export function ParentFormDialog({
  parent,
  onClose,
}: {
  /** `null` = nouveau parent. */
  parent: DirectoryParent | null
  onClose: () => void
}) {
  const { data: allStudents } = useStudents()
  const save = useSaveParent()

  const [name, setName] = useState(parent?.name ?? '')
  const [relationship, setRelationship] = useState<GuardianRole>(parent?.role ?? 'father')
  const [email, setEmail] = useState(parent?.emails[0] ?? '')
  const [phone, setPhone] = useState(parent?.phones[0] ? formatPhone(parent.phones[0]) : '')
  const [emergencyPhone, setEmergencyPhone] = useState(parent?.emergencyPhones[0] ? formatPhone(parent.emergencyPhones[0]) : '')
  const [children, setChildren] = useState(parent?.children ?? [])
  const [error, setError] = useState<string | null>(null)

  const linkedAll = !!parent && parent.guardianIds.length > 0 && parent.children.every(c => c.linked)
  const linkedSome = !!parent && parent.children.some(c => c.linked)

  const addable = useMemo(() => {
    const taken = new Set(children.map(c => c.id))
    return (allStudents ?? [])
      .filter(s => !taken.has(s.id) && s.guardians.length < MAX_GUARDIANS_PER_STUDENT) // 2 tuteurs maximum
      .map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [allStudents, children])

  async function handleSave() {
    setError(null)
    const result = await save.mutateAsync({
      guardianIds: parent?.guardianIds ?? [],
      relationship, name, email, phone, emergencyPhone,
      studentIds: children.map(c => c.id),
    })
    if (result.success) onClose()
    else setError(result.error)
  }

  const label = 'text-xs font-medium text-muted-foreground'

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{parent ? 'Modifier le parent' : 'Ajouter un parent'}</DialogTitle>
        </DialogHeader>

        {linkedAll && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Ce parent a un compte lié : ses coordonnées viennent de son profil et ne se modifient pas ici.
          </p>
        )}
        {!linkedAll && linkedSome && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Les enfants marqués « compte lié » ne sont pas modifiés ni retirés.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <label className={label}>Nom complet *</label>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={linkedAll} />
          </div>
          <div className="space-y-1">
            <label className={label}>Relation</label>
            <select
              value={relationship}
              onChange={e => setRelationship(e.target.value as GuardianRole)}
              disabled={linkedAll}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className={label}>E-mail</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={linkedAll} />
          </div>
          <div className="space-y-1">
            <label className={label}>Téléphone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} disabled={linkedAll} />
          </div>
          <div className="space-y-1">
            <label className={label}>Téléphone d&apos;urgence</label>
            <Input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} disabled={linkedAll} />
          </div>

          <div className="col-span-2 space-y-2">
            <label className={label}>Enfants *</label>
            <div className="flex flex-wrap gap-1.5">
              {children.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs">
                  {c.name}
                  {c.linked
                    ? <span className="text-emerald-600">compte lié</span>
                    : (
                      <button
                        type="button"
                        aria-label={`Retirer ${c.name}`}
                        onClick={() => setChildren(prev => prev.filter(x => x.id !== c.id))}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                </span>
              ))}
              {children.length === 0 && <span className="text-xs italic text-muted-foreground">Aucun enfant</span>}
            </div>
            {/* Nouveau parent seulement : le parent d'un élève existant se change depuis la fiche de l'élève */}
            {!parent && <select
              value=""
              onChange={e => {
                const picked = addable.find(s => s.id === e.target.value)
                if (picked) setChildren(prev => [...prev, picked])
              }}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">+ Ajouter un enfant…</option>
              {addable.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={save.isPending || linkedAll}
            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
