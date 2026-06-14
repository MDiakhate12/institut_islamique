'use client'

import { useTransition, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createCatalogClassSchema, type CreateCatalogClassInput } from '@/modules/classes/classes.schema'
import { createCatalogClassAction, updateCatalogClassAction, deleteCatalogClassAction } from '@/modules/classes/classes.actions'
import { catalogKeys } from '@/modules/classes/classes.hooks'
import { SUBJECT_LABELS, getSubjectColor } from '@/modules/classes/classes.types'
import type { CatalogClassWithNext } from '@/modules/classes/classes.types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, ArrowRight, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SUBJECTS = [
  { code: 'QRN', label: 'QRN (Quran)' },
  { code: 'ARA', label: 'ARA (Arabe)' },
  { code: 'ISL', label: 'ISL (Études islamiques)' },
  { code: 'NUR', label: 'NUR (Nuraniyah)' },
]

const TEMPLATE_SECTIONS: Record<string, string> = {
  'Age-Range': '## Age Range\n\n',
  'Prerequisites': '## Prerequisites\n\nNone\n\n',
  'Trimestre 1': '## First Semester\n\n1. \n2. \n\n',
  'Trimestre 2': '## Second Semester\n\n1. \n2. \n\n',
  'Trimestre 3': '## Third Semester\n\n1. \n2. \n\n',
  'Objectifs': '## Objectives\n\n- \n- \n\n',
  'Assessment': '## Assessment\n\n',
  'Books': '## Books\n\n- \n\n',
  'Overview': '## Program Overview\n\n',
}

interface Props {
  catalogClass?: CatalogClassWithNext
  allClasses?: CatalogClassWithNext[]
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ClassCatalogFormDialog({ catalogClass, allClasses = [], trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const isEditing = !!catalogClass
  const qc = useQueryClient()

  // ── Tout l'état du formulaire ici (survit à la fermeture du dialog) ────────
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const curriculumRef = useRef<HTMLTextAreaElement>(null)

  const form = useForm<CreateCatalogClassInput>({
    resolver: zodResolver(createCatalogClassSchema),
    defaultValues: {
      subjectCode: catalogClass?.subjectCode ?? '',
      levelNumber: catalogClass?.levelNumber ?? '',
      name: catalogClass?.name ?? '',
      nextClassId: catalogClass?.nextClassId ?? null,
      curriculum: catalogClass?.curriculum ?? '',
    },
  })

  const watchedSubject = form.watch('subjectCode')
  const watchedLevel = form.watch('levelNumber')
  const watchedNextId = form.watch('nextClassId')
  const watchedName = form.watch('name')
  const watchedCurriculum = form.watch('curriculum')

  const nextClassOptions = allClasses.filter(c =>
    c.subjectCode === watchedSubject && c.id !== catalogClass?.id
  )
  const nextClassForPreview = watchedNextId
    ? allClasses.find(c => c.id === watchedNextId)
    : null

  function insertTemplate(key: string) {
    const el = curriculumRef.current
    if (!el) return
    const text = TEMPLATE_SECTIONS[key] ?? ''
    const start = el.selectionStart
    const current = form.getValues('curriculum') ?? ''
    form.setValue('curriculum', current.slice(0, start) + text + current.slice(el.selectionEnd))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length) }, 0)
  }

  function onSubmit(data: CreateCatalogClassInput) {
    startTransition(async () => {
      const result = isEditing
        ? await updateCatalogClassAction(catalogClass.id, data)
        : await createCatalogClassAction(data)

      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: catalogKeys.lists() })
      toast.success(isEditing ? 'Classe modifiée' : 'Classe créée')
      form.reset()
      setOpen(false)
      onSuccess?.()
    })
  }

  function handleDelete() {
    if (!catalogClass) return
    startDelete(async () => {
      const result = await deleteCatalogClassAction(catalogClass.id)
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: catalogKeys.lists() })
      toast.success('Classe supprimée')
      setOpen(false)
      onSuccess?.()
    })
  }

  const colors = getSubjectColor(watchedSubject)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger ?? (
          <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
            <Plus className="h-4 w-4" />
            Créer une nouvelle classe
          </Button>
        )}
      </DialogTrigger>

      {/* ── Dialog très large ── */}
      <DialogContent className="w-[95vw] max-w-5xl max-h-[95vh] overflow-y-auto p-0 [&>button]:top-4 [&>button]:right-4 [&>button]:text-white [&>button]:hover:text-white/80">

        {/* Header orange */}
        <div className="bg-gradient-to-r from-[#c2440f] to-[#a33a0d] px-7 py-5 rounded-t-lg sticky top-0 z-10">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-semibold">
              {isEditing ? 'Modifier les infos de la classe' : 'Ajouter une nouvelle classe au catalogue'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-7 py-6 space-y-7">

          {/* ── Section 1 : Identité ── */}
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">Identité de la classe</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ces trois champs identifient cette classe de manière unique dans le catalogue
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* Type de matière */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block leading-tight">
                  Type de matière
                  <span className="block font-normal">ex. Coran, Arabe, ISL</span>
                </label>
                <select
                  {...form.register('subjectCode')}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
                >
                  <option value="">Choisir une matière</option>
                  {SUBJECTS.map(s => (
                    <option key={s.code} value={s.code}>{s.label}</option>
                  ))}
                </select>
                {form.formState.errors.subjectCode && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.subjectCode.message}</p>
                )}
              </div>

              {/* Niveau */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block leading-tight">
                  Niveau / Numéro
                  <span className="block font-normal">Unique dans ce type de matière</span>
                </label>
                <Input placeholder="ex. 101" {...form.register('levelNumber')} />
              </div>

              {/* Nom */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block leading-tight">
                  Nom de la classe
                  <span className="block font-normal">Affiché aux parents et enseignants</span>
                </label>
                <Input placeholder="ex. Coran Niveau 1" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Preview badge */}
            {watchedSubject && (watchedLevel || watchedName) && (
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded', colors.bg, colors.text)}>
                  {watchedSubject}
                </span>
                {watchedLevel && <span className="text-xs font-mono text-muted-foreground">{watchedLevel}</span>}
                {watchedName && <span className="text-sm text-foreground font-medium">{watchedName}</span>}
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* ── Section 2 : Classe suivante ── */}
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">
                Classe suivante
                <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel)</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vers quelle classe les élèves devraient-ils passer après avoir terminé celle-ci ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Type de matière</label>
                <select
                  disabled
                  value={watchedSubject}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm text-muted-foreground bg-muted/20"
                >
                  <option value="">Aucun</option>
                  {SUBJECTS.map(s => <option key={s.code} value={s.code}>{SUBJECT_LABELS[s.code] ?? s.code}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Niveau / Numéro</label>
                <select
                  value={watchedNextId ?? ''}
                  onChange={e => form.setValue('nextClassId', e.target.value || null)}
                  disabled={!watchedSubject}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 disabled:opacity-50 disabled:bg-muted/20"
                >
                  <option value="">
                    {watchedSubject ? 'Aucune' : "Sélectionner le type d'abord"}
                  </option>
                  {nextClassOptions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.levelNumber} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {nextClassForPreview && (
              <div className="flex items-center gap-1.5 text-sm text-[#c2440f]">
                <ArrowRight className="h-4 w-4" />
                <span>
                  Les élèves passeront à <strong>{nextClassForPreview.code}</strong>
                  {' — '}{nextClassForPreview.name}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* ── Section 3 : Programme ── */}
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm">
                Programme
                <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel)</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Décrivez ce que les élèves apprendront dans cette classe
              </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-border rounded-t-md bg-muted/20 border-b-0">
              {/* Format buttons */}
              {['H1', 'H2', 'B', 'I'].map(b => (
                <button key={b} type="button"
                  className="h-7 w-7 text-xs font-bold border border-border rounded bg-white hover:bg-muted flex items-center justify-center shadow-sm"
                >{b}</button>
              ))}
              <div className="w-px h-5 bg-border mx-0.5 self-center" />
              {/* Template buttons */}
              {Object.keys(TEMPLATE_SECTIONS).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => insertTemplate(key)}
                  className="h-7 px-2.5 text-xs border border-border rounded bg-white hover:bg-muted text-muted-foreground shadow-sm"
                >
                  {key}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-0.5 self-center" />
              <button
                type="button"
                onClick={() => form.setValue('curriculum', Object.values(TEMPLATE_SECTIONS).join('\n'))}
                className="h-7 px-2.5 text-xs border border-[#c2440f]/40 rounded bg-[#c2440f]/5 hover:bg-[#c2440f]/10 text-[#c2440f] flex items-center gap-1 shadow-sm"
              >
                <ChevronRight className="h-3 w-3" />
                Start from Template
              </button>
            </div>

            <textarea
              {...form.register('curriculum')}
              ref={(el) => {
                form.register('curriculum').ref(el)
                  ; (curriculumRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
              }}
              rows={16}
              placeholder="Décrivez le programme de cette classe..."
              className="w-full border border-border rounded-b-md px-4 py-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30 -mt-px"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use the toolbar buttons to format text. Click template buttons to quickly insert common sections.
            </p>
          </div>

          {/* ── Boutons ── */}
          <div className={cn(
            'flex items-center gap-2 pt-2 pb-1 border-t border-border sticky bottom-0 bg-white',
            isEditing ? 'justify-between' : 'justify-end'
          )}>
            {isEditing && (
              <Button type="button" variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? 'Suppression...' : 'Supprimer la classe'}
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isPending}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-44">
                {isPending
                  ? 'Enregistrement...'
                  : isEditing ? 'Enregistrer les modifications' : 'Ajouter la classe'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
