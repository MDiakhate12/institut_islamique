'use client'

import { useTransition, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { inviteTeacherSchema, updateTeacherSchema } from '@/modules/teachers/teachers.schema'
import type { InviteTeacherInput, UpdateTeacherInput } from '@/modules/teachers/teachers.schema'
import {
  inviteTeacherAction, updateTeacherAction, removeTeacherAction,
  uploadTeacherDocumentAction, removeTeacherDocumentAction,
} from '@/modules/teachers/teachers.actions'
import { teachersKeys } from '@/modules/teachers/teachers.hooks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Teacher } from '@/modules/teachers/teachers.types'

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024 // 2MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface TeacherFormProps {
  teacher?: Teacher
  trigger?: React.ReactElement
  onSuccess?: () => void
}

export function TeacherFormDialog({ teacher, trigger, onSuccess }: TeacherFormProps) {
  const [open, setOpen] = useState(false)
  const isEditing = !!teacher
  const queryClient = useQueryClient()

  // ── Tout l'état du formulaire ici (survit à la fermeture du dialog) ────────
  const [isPending, startTransition] = useTransition()
  const [isRemoving, startRemove]    = useTransition()
  const [isVolunteer, setIsVolunteer] = useState(
    teacher ? teacher.teacherType === 'volunteer' : true
  )
  const [isActive, setIsActive] = useState(teacher ? !teacher.isPending : true)
  const [teacherDoc, setTeacherDoc] = useState<{ url: string; name: string } | null>(
    teacher?.documentUrl ? { url: teacher.documentUrl, name: teacher.documentName ?? 'Document' } : null
  )
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const documentInputRef = useRef<HTMLInputElement>(null)

  async function handleDocumentChange(file: File | null) {
    if (!file || !teacher) return
    if (file.size > MAX_DOCUMENT_SIZE) {
      toast.error('Le fichier dépasse la taille maximale de 2 Mo')
      return
    }
    setIsUploadingDoc(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await uploadTeacherDocumentAction(teacher.id, {
        base64, mimeType: file.type, fileName: file.name,
      })
      if (!result.success) { toast.error(result.error); return }
      setTeacherDoc({ url: result.data.documentUrl, name: result.data.documentName })
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      toast.success('Document téléversé avec succès')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  function handleRemoveDocument() {
    if (!teacher) return
    startTransition(async () => {
      const result = await removeTeacherDocumentAction(teacher.id)
      if (!result.success) { toast.error(result.error); return }
      setTeacherDoc(null)
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      toast.success('Document supprimé')
    })
  }

  const createForm = useForm<InviteTeacherInput>({
    resolver: zodResolver(inviteTeacherSchema),
    defaultValues: {
      email:       '',
      fullName:    '',
      phone:       '',
      gender:      undefined,
      teacherType: 'volunteer',
    },
  })

  const editForm = useForm<UpdateTeacherInput>({
    resolver: zodResolver(updateTeacherSchema),
    defaultValues: {
      fullName:    teacher?.fullName ?? '',
      phone:       teacher?.phone   ?? '',
      gender:      (teacher?.gender as 'male' | 'female') ?? undefined,
      teacherType: teacher?.teacherType ?? 'volunteer',
      isActive:    teacher ? !teacher.isPending : true,
    },
  })

  const activeForm = isEditing ? editForm : createForm

  function onCreateSubmit(data: InviteTeacherInput) {
    startTransition(async () => {
      const result = await inviteTeacherAction({
        ...data,
        teacherType: isVolunteer ? 'volunteer' : 'paid',
      })
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      toast.success('Invitation envoyée avec succès')
      createForm.reset()
      setOpen(false)
      onSuccess?.()
    })
  }

  function onEditSubmit(data: UpdateTeacherInput) {
    if (!teacher) return
    startTransition(async () => {
      const result = await updateTeacherAction(teacher.id, {
        ...data,
        teacherType: isVolunteer ? 'volunteer' : 'paid',
        isActive,
      })
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      toast.success('Enseignant modifié avec succès')
      setOpen(false)
      onSuccess?.()
    })
  }

  function handleRemove() {
    if (!teacher) return
    startRemove(async () => {
      const result = await removeTeacherAction(teacher.id)
      if (!result.success) { toast.error(result.error); return }
      queryClient.invalidateQueries({ queryKey: teachersKeys.lists() })
      toast.success('Enseignant supprimé')
      setOpen(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={trigger ?? (
          <Button size="sm" className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
            <Plus className="h-4 w-4" />
            Créer un nouvel enseignant
          </Button>
        )}
      />
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Modifier l'enseignant" : 'Ajouter un nouvel enseignant'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Mettre à jour les informations de l'enseignant"
              : 'Ajouter un nouvel enseignant à votre école'}
          </p>
        </DialogHeader>

        <form
          onSubmit={
            isEditing
              ? editForm.handleSubmit(onEditSubmit)
              : createForm.handleSubmit(onCreateSubmit)
          }
          className="space-y-4 pt-1"
        >
          {/* Nom complet */}
          <div>
            <label className="text-sm font-medium mb-1 block">Nom complet</label>
            <Input
              placeholder="Entrez le nom complet"
              {...(isEditing ? editForm.register('fullName') : createForm.register('fullName'))}
            />
            {activeForm.formState.errors.fullName && (
              <p className="text-xs text-destructive mt-1">{activeForm.formState.errors.fullName.message}</p>
            )}
          </div>

          {/* Email + Téléphone */}
          <div className="grid grid-cols-2 gap-3">
            {isEditing ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input value={teacher.email} readOnly className="bg-muted/30 text-muted-foreground" />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input type="email" placeholder="Entrez l'email" {...createForm.register('email')} />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{createForm.formState.errors.email.message}</p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Téléphone</label>
              <Input
                placeholder="0X XX XX XX XX"
                {...(isEditing ? editForm.register('phone') : createForm.register('phone'))}
              />
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className="text-sm font-medium mb-1 block">Genre</label>
            <select
              {...(isEditing ? editForm.register('gender') : createForm.register('gender'))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#c2440f]/30"
            >
              <option value="">Sélectionner le genre</option>
              <option value="male">Masculin</option>
              <option value="female">Féminin</option>
            </select>
          </div>

          {/* Type d'enseignant toggle */}
          <div className="flex items-start justify-between py-2.5 px-3 rounded-lg bg-muted/20 border border-border">
            <div>
              <p className="text-sm font-medium">Type d&apos;enseignant</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isVolunteer ? 'Cet enseignant est bénévole' : 'Cet enseignant est rémunéré'}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-sm font-medium', isVolunteer ? 'text-[#c2440f]' : 'text-blue-600')}>
                {isVolunteer ? 'Bénévole' : 'Payé'}
              </span>
              <button
                type="button"
                onClick={() => setIsVolunteer(!isVolunteer)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors duration-200',
                  isVolunteer ? 'bg-[#c2440f]' : 'bg-gray-300'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                  isVolunteer ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
            </div>
          </div>

          {/* Statut d'inscription (edit uniquement) */}
          {isEditing && (
            <div className="flex items-start justify-between py-2.5 px-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-medium">Statut d&apos;inscription</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isActive
                    ? "L'enseignant est actuellement inscrit et actif"
                    : teacher?.isPending
                      ? "L'enseignant n'a pas encore activé son compte"
                      : "L'enseignant est actuellement inactif"}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-sm font-medium', isActive ? 'text-emerald-600' : 'text-gray-400')}>
                  {isActive ? 'Inscrit' : 'Inactif'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
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
          )}

          {/* Cours assignés (edit uniquement) */}
          {isEditing && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-medium">Cours assignés</p>
                <p className="text-xs text-muted-foreground mt-0.5">0 cours assigné(s)</p>
              </div>
              <Button type="button" variant="outline" size="sm">
                Gérer les cours
              </Button>
            </div>
          )}

          {/* Pièce jointe (edit uniquement — nécessite un enseignant déjà créé) */}
          {isEditing && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 border border-border">
              <div className="min-w-0">
                <p className="text-sm font-medium">Pièce jointe</p>
                {teacherDoc ? (
                  <a
                    href={teacherDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#c2440f] hover:underline mt-0.5 truncate"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{teacherDoc.name}</span>
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Aucun document - max 2 Mo</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {teacherDoc && (
                  <button
                    type="button"
                    title="Supprimer le document"
                    onClick={handleRemoveDocument}
                    className="p-1.5 rounded hover:bg-red-100 text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isUploadingDoc}
                  onClick={() => documentInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploadingDoc ? 'Envoi...' : teacherDoc ? 'Remplacer' : 'Upload'}
                </Button>
                <input
                  ref={documentInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={isUploadingDoc}
                  onChange={e => { handleDocumentChange(e.target.files?.[0] ?? null); e.target.value = '' }}
                />
              </div>
            </div>
          )}

          {/* Note (create uniquement) */}
          {!isEditing && (
            <p className="text-xs text-blue-600">
              <span className="font-medium">Remarque :</span>{' '}
              L&apos;ID enseignant sera automatiquement généré à partir de l&apos;adresse email.
            </p>
          )}

          {/* Boutons */}
          <div className={cn('flex items-center gap-2 pt-1', isEditing ? 'justify-between' : 'justify-end')}>
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isRemoving}
                onClick={handleRemove}
              >
                {isRemoving ? 'Suppression...' : "Supprimer l'enseignant"}
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white min-w-36"
              >
                {isPending
                  ? 'Enregistrement...'
                  : isEditing ? 'Enregistrer les modifications' : "Créer l'enseignant"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
