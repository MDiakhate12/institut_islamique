'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from './RichTextEditor'
import { cn } from '@/lib/utils'
import type { InfoBlock, InfoBlockStyle } from '@/modules/registrations/registrations.types'

const STYLES: { value: InfoBlockStyle; label: string; icon: string; bg: string; border: string; text: string }[] = [
  { value: 'info',    label: 'INFORMATION', icon: 'ℹ️', bg: 'bg-[#7a4f30]/10', border: 'border-[#7a4f30]/30', text: 'text-[#7a4f30]' },
  { value: 'warning', label: 'AVERTISSEMENT', icon: '⚠️', bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-700'  },
  { value: 'success', label: 'SUCCÈS',       icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  { value: 'error',   label: 'ERREUR',       icon: '❌', bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-700'    },
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (block: Omit<InfoBlock, 'id'>) => void
  existing?: InfoBlock // if editing
}

export function AddInfoBlockDialog({ open, onOpenChange, onAdd, existing }: Props) {
  const isEdit = !!existing
  const [title,   setTitle]   = useState(existing?.title   ?? '')
  const [style,   setStyle]   = useState<InfoBlockStyle>(existing?.style ?? 'info')
  const [content, setContent] = useState(existing?.content ?? '')

  function handleReset() {
    setTitle(existing?.title ?? '')
    setStyle(existing?.style ?? 'info')
    setContent(existing?.content ?? '')
  }

  function handleSubmit() {
    if (!content.trim()) return
    onAdd({ kind: 'info_block', style, title: title || undefined, content })
    if (!isEdit) {
      setTitle(''); setStyle('info'); setContent('')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le bloc d\'information' : 'Ajouter un bloc d\'information'}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit
              ? 'Modifiez le contenu de ce bloc informatif.'
              : 'Ajoutez une section informative à votre formulaire (frais, politiques, avis, etc.)'}
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm">Titre <span className="text-muted-foreground font-normal">(facultatif)</span></Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex. : Informations sur les frais"
              className="h-9"
            />
          </div>

          {/* Style selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Style d'affichage</Label>
              <button type="button" className="text-xs text-[#c2440f] hover:underline">Thème de couleur</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                    style === s.value
                      ? `${s.border} ${s.bg}`
                      : 'border-border bg-white hover:border-muted-foreground/30'
                  )}
                >
                  <span className="text-xl leading-none">{s.icon}</span>
                  <span className={cn('text-[9px] font-bold tracking-wide leading-none', style === s.value ? s.text : 'text-muted-foreground')}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-sm">Contenu <span className="text-destructive">*</span></Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Saisissez le contenu du bloc…"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
            >
              {isEdit ? 'Enregistrer les modifications' : 'Ajouter le bloc d\'info'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
