'use client'

import { useTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createStudentSchema, type CreateStudentInput, type GuardianInput } from '@/modules/students/students.schema'
import { createStudentAction, updateStudentAction, deleteStudentAction } from '@/modules/students/students.actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, X, Pencil, CheckCircle, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentListItem, GuardianSummary } from '@/modules/students/students.types'
import { guardianDisplayName } from '@/modules/students/students.types'
import { studentsKeys } from '@/modules/students/students.hooks'
import { AddClassDialog } from './AddClassDialog'

// ── Types locaux ──────────────────────────────────────────────────────────────

interface ClassRow {
  id: string
  classCode: string
  name: string
  teacherName: string | null
  paidT1: boolean
  paidT2: boolean
  paidT3: boolean
  isNew?: boolean
}

interface LocalGuardian {
  _tempId: string
  id?: string
  relationship: 'father' | 'mother' | 'guardian' | 'other'
  name: string
  phone: string
  email: string
  emergencyPhone: string
  linkedMemberId?: string | null
  linkedMemberName?: string | null
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  father:   'Père',
  mother:   'Mère',
  guardian: 'Tuteur',
  other:    'Autre',
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  father:   'bg-blue-600',
  mother:   'bg-pink-600',
  guardian: 'bg-[#7a4f30]',
  other:    'bg-gray-500',
}

function buildYearOptions(): string[] {
  const y = new Date().getFullYear()
  return [`${y - 1}-${y}`, `${y}-${y + 1}`, `${y + 1}-${y + 2}`]
}

function guardianToLocal(g: GuardianSummary): LocalGuardian {
  return {
    _tempId:          g.id,
    id:               g.id,
    relationship:     g.relationship as LocalGuardian['relationship'],
    name:             g.firstName ?? '',
    phone:            g.phone ?? '',
    email:            g.email ?? '',
    emergencyPhone:   g.emergencyPhone ?? '',
    linkedMemberId:   g.linkedMemberId,
    linkedMemberName: g.linkedMemberName,
  }
}

// ── Formulaire inline d'un tuteur ─────────────────────────────────────────────

interface GuardianFormProps {
  initial?: LocalGuardian
  onSave: (g: LocalGuardian) => void
  onCancel: () => void
}

function GuardianForm({ initial, onSave, onCancel }: GuardianFormProps) {
  const [form, setForm] = useState<Omit<LocalGuardian, '_tempId' | 'id' | 'linkedMemberId' | 'linkedMemberName'>>({
    relationship:   initial?.relationship   ?? 'father',
    name:           initial?.name           ?? '',
    phone:          initial?.phone          ?? '',
    email:          initial?.email          ?? '',
    emergencyPhone: initial?.emergencyPhone ?? '',
  })

  function save() {
    onSave({
      ...form,
      _tempId:          initial?._tempId ?? String(Date.now()),
      id:               initial?.id,
      linkedMemberId:   initial?.linkedMemberId,
      linkedMemberName: initial?.linkedMemberName,
    })
  }

  return (
    <div className="border border-[#c2440f]/30 rounded-lg p-3 space-y-3 bg-orange-50/30">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Relation *</label>
          <select
            value={form.relationship}
            onChange={e => setForm(f => ({ ...f, relationship: e.target.value as LocalGuardian['relationship'] }))}
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
          >
            <option value="father">Père</option>
            <option value="mother">Mère</option>
            <option value="guardian">Tuteur légal</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Nom <span className="text-muted-foreground font-normal">(optionnel)</span></label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nom complet du tuteur"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Téléphone <span className="text-muted-foreground font-normal">(pour l'OTP)</span></label>
          <Input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="0X XX XX XX XX"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Email <span className="text-muted-foreground font-normal">(optionnel)</span></label>
          <Input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="email@exemple.com"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium mb-1 block">Téléphone d'urgence <span className="text-muted-foreground font-normal">(optionnel)</span></label>
          <Input
            type="tel"
            value={form.emergencyPhone}
            onChange={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))}
            placeholder="0X XX XX XX XX"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Le nom sera automatiquement complété si ce tuteur crée un compte et associe l&apos;élève via son téléphone.
      </p>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button
          type="button"
          size="sm"
          onClick={save}
          className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
        >
          {initial ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </div>
  )
}

// ── Dialog principal ──────────────────────────────────────────────────────────

interface Props {
  student?: StudentListItem
  trigger?: React.ReactElement
  onSuccess?: () => void
}

export function StudentFormDialog({ student, trigger, onSuccess }: Props) {
  const [open, setOpen]         = useState(false)
  const [addClassOpen, setAddClassOpen] = useState(false)
  const isEditing = !!student
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete]    = useTransition()

  // Local class enrollment state
  const [localEnrollments, setLocalEnrollments] = useState<ClassRow[]>(() =>
    (student?.enrollments ?? []).map(e => ({
      id: e.classId, classCode: e.classCode, name: e.className,
      teacherName: e.teacherName, paidT1: e.paidT1, paidT2: e.paidT2, paidT3: e.paidT3,
    }))
  )
  const [removedClassIds, setRemovedClassIds] = useState<string[]>([])

  // Local guardians state
  const [localGuardians, setLocalGuardians] = useState<LocalGuardian[]>(() =>
    (student?.guardians ?? []).map(guardianToLocal)
  )
  const [deletedGuardianIds, setDeletedGuardianIds] = useState<string[]>([])
  const [guardianFormMode, setGuardianFormMode] = useState<'closed' | 'add' | string>('closed') // string = editing id (_tempId)

  const yearOptions = buildYearOptions()

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName:      student?.firstName    ?? '',
      lastName:       student?.lastName     ?? '',
      gender:         student?.gender       ?? 'male',
      isActive:       student?.isActive     ?? true,
      birthDate:      student?.birthDate    ?? '',
      notes:          student?.notes        ?? '',
      enrollmentYear: student?.enrollmentYear ?? yearOptions[1],
    },
  })

  const isActive = form.watch('isActive')

  function resetAndClose() {
    form.reset()
    setLocalEnrollments((student?.enrollments ?? []).map(e => ({
      id: e.classId, classCode: e.classCode, name: e.className,
      teacherName: e.teacherName, paidT1: e.paidT1, paidT2: e.paidT2, paidT3: e.paidT3,
    })))
    setRemovedClassIds([])
    setLocalGuardians((student?.guardians ?? []).map(guardianToLocal))
    setDeletedGuardianIds([])
    setGuardianFormMode('closed')
    setOpen(false)
  }

  // ── Guardians handlers ────────────────────────────────────────────────────

  function addGuardian(g: LocalGuardian) {
    setLocalGuardians(prev => [...prev, g])
    setGuardianFormMode('closed')
  }

  function updateGuardian(g: LocalGuardian) {
    setLocalGuardians(prev => prev.map(x => x._tempId === g._tempId ? g : x))
    setGuardianFormMode('closed')
  }

  function removeGuardian(g: LocalGuardian) {
    if (g.id) setDeletedGuardianIds(prev => [...prev, g.id!])
    setLocalGuardians(prev => prev.filter(x => x._tempId !== g._tempId))
  }

  // ── Class handlers ────────────────────────────────────────────────────────

  function toggleClassPayment(classId: string, field: 'paidT1' | 'paidT2' | 'paidT3') {
    setLocalEnrollments(prev => prev.map(e => e.id === classId ? { ...e, [field]: !e[field] } : e))
  }

  function removeClass(classId: string, isNew: boolean) {
    if (!isNew) setRemovedClassIds(prev => [...prev, classId])
    setLocalEnrollments(prev => prev.filter(e => e.id !== classId))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function onSubmit(data: CreateStudentInput) {
    startTransition(async () => {
      // Build guardians payload
      const guardiansPayload: GuardianInput[] = [
        // Deleted existing
        ...deletedGuardianIds.map(id => ({ id, relationship: 'guardian' as const, _delete: true })),
        // Existing (update) + new (insert)
        ...localGuardians.map(g => ({
          id:             g.id,
          relationship:   g.relationship,
          name:           g.name || undefined,
          phone:          g.phone || undefined,
          email:          g.email || undefined,
          emergencyPhone: g.emergencyPhone || undefined,
        })),
      ]

      const newClasses    = localEnrollments.filter(e => e.isNew)
      const classIdsToAdd = newClasses.map(e => e.id)
      const paymentUpdates = localEnrollments.map(e => ({
        classId: e.id, t1: e.paidT1, t2: e.paidT2, t3: e.paidT3,
      }))

      let result
      if (isEditing) {
        result = await updateStudentAction(student.id, {
          ...data,
          guardians:        guardiansPayload,
          classIdsToAdd,
          classIdsToRemove: removedClassIds,
          paymentUpdates,
        })
      } else {
        const firstEnrollment = localEnrollments[0]
        result = await createStudentAction({
          ...data,
          guardians:  guardiansPayload.filter(g => !g._delete),
          classIdsToAdd,
          paymentT1:  firstEnrollment?.paidT1 ?? false,
          paymentT2:  firstEnrollment?.paidT2 ?? false,
          paymentT3:  firstEnrollment?.paidT3 ?? false,
        })
      }

      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
      toast.success(isEditing ? 'Élève modifié avec succès' : 'Élève créé avec succès')
      resetAndClose()
      onSuccess?.()
    })
  }

  function handleDelete() {
    if (!student) return
    startDelete(async () => {
      const result = await deleteStudentAction(student.id)
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
      toast.success('Élève supprimé')
      resetAndClose()
      onSuccess?.()
    })
  }

  const excludedIds = localEnrollments.map(e => e.id)
  const editingGuardian = guardianFormMode !== 'closed' && guardianFormMode !== 'add'
    ? localGuardians.find(g => g._tempId === guardianFormMode)
    : undefined

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); else setOpen(true) }}>
        <DialogTrigger render={
          trigger ?? (
            <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
              <Plus className="h-4 w-4" />
              Créer un nouvel élève
            </Button>
          )
        } />

        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? "Modifier l'élève" : 'Ajouter un nouvel élève'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            {/* Prénom / Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Prénom *</label>
                <Input placeholder="Prénom" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nom de famille *</label>
                <Input placeholder="Nom" {...form.register('lastName')} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Genre + Année d'inscription */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Genre</label>
                <select
                  {...form.register('gender')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Année d&apos;inscription</label>
                <select
                  {...form.register('enrollmentYear')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Toggle inscrit */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border">
              <span className="text-sm text-muted-foreground">L&apos;élève est actuellement inscrit et actif</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-600">Inscrit</span>
                <button
                  type="button"
                  onClick={() => form.setValue('isActive', !isActive)}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors duration-200',
                    isActive ? 'bg-emerald-500' : 'bg-gray-300'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            </div>

            {/* ── Tuteurs ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Tuteurs</label>
                {guardianFormMode === 'closed' && (
                  <button
                    type="button"
                    onClick={() => setGuardianFormMode('add')}
                    className="text-sm text-[#c2440f] hover:underline font-medium"
                  >
                    + Ajouter un tuteur
                  </button>
                )}
              </div>

              {/* Liste des tuteurs existants */}
              {localGuardians.map(g => (
                <div key={g._tempId}>
                  {guardianFormMode === g._tempId ? (
                    <GuardianForm
                      initial={g}
                      onSave={updateGuardian}
                      onCancel={() => setGuardianFormMode('closed')}
                    />
                  ) : (
                    <div className={cn(
                      'border rounded-lg p-3 space-y-1',
                      g.linkedMemberId ? 'border-green-200 bg-green-50/30' : 'border-border'
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-xs font-bold text-white px-2 py-0.5 rounded',
                            RELATIONSHIP_COLORS[g.relationship]
                          )}>
                            {RELATIONSHIP_LABELS[g.relationship]}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {g.linkedMemberName || g.name || <span className="text-gray-400 italic font-normal">Nom non renseigné</span>}
                          </span>
                          {g.linkedMemberId && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle className="h-3 w-3" />
                              Compte lié
                            </span>
                          )}
                        </div>
                        {!g.linkedMemberId && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setGuardianFormMode(g._tempId)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGuardian(g)}
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        {g.phone && (
                          <span className="text-xs text-muted-foreground">📞 {g.phone}</span>
                        )}
                        {g.email && (
                          <span className="text-xs text-muted-foreground">✉ {g.email}</span>
                        )}
                        {g.linkedMemberId && !g.name && !g.linkedMemberName && (
                          <span className="text-xs text-muted-foreground italic">
                            Le nom sera complété à la prochaine connexion du parent
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Formulaire d'ajout */}
              {guardianFormMode === 'add' && (
                <GuardianForm
                  onSave={addGuardian}
                  onCancel={() => setGuardianFormMode('closed')}
                />
              )}

              {/* Empty state */}
              {localGuardians.length === 0 && guardianFormMode === 'closed' && (
                <div className="p-3 rounded-lg bg-muted/10 border border-border text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Aucun tuteur. Ajoutez-en un pour permettre la liaison du compte parent.
                </div>
              )}
            </div>

            {/* Classes inscrites */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Classes inscrites</label>
                <button
                  type="button"
                  onClick={() => setAddClassOpen(true)}
                  className="text-sm text-[#c2440f] hover:underline font-medium"
                >
                  + Ajouter une classe
                </button>
              </div>

              {localEnrollments.length === 0 ? (
                <div className="p-3 bg-muted/10 rounded-lg border border-border text-sm text-muted-foreground text-center">
                  Aucune classe. Cliquez sur &quot;Ajouter une classe&quot; pour inscrire cet élève.
                </div>
              ) : (
                <div className="space-y-3">
                  {localEnrollments.map(e => (
                    <div key={e.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-[#7a4f30] text-white px-2 py-0.5 rounded">
                            {e.classCode || '—'}
                          </span>
                          <span className="text-sm font-medium text-gray-700 truncate max-w-48">{e.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeClass(e.id, e.isNew ?? false)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Paiement :</span>
                        {(['paidT1', 'paidT2', 'paidT3'] as const).map((field, idx) => (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleClassPayment(e.id, field)}
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                              e[field]
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-white border-gray-300 text-gray-500 hover:border-[#c2440f] hover:text-[#c2440f]'
                            )}
                          >
                            T{idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date de naissance */}
            <div>
              <label className="text-sm font-medium mb-1 block">Date de naissance</label>
              <Input type="date" {...form.register('birthDate')} />
            </div>

            {/* Commentaire */}
            <div>
              <label className="text-sm font-medium mb-1 block">Commentaire</label>
              <textarea
                {...form.register('notes')}
                placeholder="Ajouter des notes sur l'élève..."
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 resize-none"
              />
            </div>

            {/* Boutons */}
            <div className={cn('flex items-center gap-2 pt-2', isEditing ? 'justify-between' : 'justify-end')}>
              {isEditing && (
                <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                  {isDeleting ? 'Suppression...' : "Supprimer l'élève"}
                </Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetAndClose}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-36"
                >
                  {isPending ? 'Enregistrement...' : isEditing ? 'Enregistrer' : "Créer l'élève"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddClassDialog
        open={addClassOpen}
        onOpenChange={setAddClassOpen}
        excludeClassIds={excludedIds}
        onAdd={cls => {
          setLocalEnrollments(prev => [
            ...prev,
            { id: cls.id, classCode: cls.classCode, name: cls.name, teacherName: cls.teacherName, paidT1: false, paidT2: false, paidT3: false, isNew: true },
          ])
        }}
      />
    </>
  )
}
