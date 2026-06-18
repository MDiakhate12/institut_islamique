'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FormSection } from '@/modules/registrations/registrations.types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (section: Omit<FormSection, 'id'>) => void
  existing?: FormSection
}

export function AddSectionDialog({ open, onOpenChange, onAdd, existing }: Props) {
  const isEdit = !!existing
  const [title, setTitle]       = useState(existing?.title       ?? '')
  const [description, setDesc]  = useState(existing?.description ?? '')

  function handleSubmit() {
    if (!title.trim()) return
    onAdd({
      kind: 'section',
      title: title.trim(),
      description: description.trim() || undefined,
      isSystem: false,
      fields: existing?.fields ?? [],
    })
    if (!isEdit) { setTitle(''); setDesc('') }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la section' : 'Ajouter une nouvelle section'}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit
              ? 'Mettre à jour le titre et la description de cette section'
              : 'Créez une nouvelle section pour regrouper les champs associés'}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm">
              Titre de la section <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex. : Informations médicales"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">
              Description <span className="text-muted-foreground font-normal">(facultatif)</span>
            </Label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Brève description de cette section…"
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="bg-[#7a4f30] hover:bg-[#5c3820] text-white"
            >
              {isEdit ? 'Enregistrer les modifications' : 'Ajouter la section'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
