'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { X, Plus } from 'lucide-react'
import type { CustomField, FieldType } from '@/modules/registrations/registrations.types'

// ── Field type definitions ─────────────────────────────────────────────────────

const FIELD_TYPES: {
  value: FieldType
  label: string
  icon: string
  hasOptions: boolean
  hasPlaceholder: boolean
}[] = [
  { value: 'text',     label: 'Texte court',      icon: 'T',  hasOptions: false, hasPlaceholder: true  },
  { value: 'textarea', label: 'Texte long',        icon: '≡',  hasOptions: false, hasPlaceholder: true  },
  { value: 'email',    label: 'E-mail',            icon: '@',  hasOptions: false, hasPlaceholder: true  },
  { value: 'tel',      label: 'Téléphone',         icon: '✆',  hasOptions: false, hasPlaceholder: true  },
  { value: 'date',     label: 'Date',              icon: '▦',  hasOptions: false, hasPlaceholder: false },
  { value: 'select',   label: 'Liste déroulante',  icon: '▼',  hasOptions: true,  hasPlaceholder: false },
  { value: 'radio',    label: 'Choix unique',      icon: '◉',  hasOptions: true,  hasPlaceholder: false },
  { value: 'checkbox', label: 'Case à cocher',     icon: '☑',  hasOptions: false, hasPlaceholder: false },
  { value: 'rating',   label: 'Évaluation ★',      icon: '★',  hasOptions: false, hasPlaceholder: false },
]

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (field: CustomField) => void
  existing?: CustomField
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AddFieldDialog({ open, onOpenChange, onAdd, existing }: Props) {
  const isEdit = !!existing

  const [label,       setLabel]       = useState(existing?.label       ?? '')
  const [type,        setType]        = useState<FieldType>(existing?.type ?? 'text')
  const [required,    setRequired]    = useState(existing?.required     ?? false)
  const [placeholder, setPlaceholder] = useState(existing?.placeholder ?? '')
  const [note,        setNote]        = useState(existing?.note        ?? '')
  const [options,     setOptions]     = useState<string[]>(existing?.options ?? [])
  const [optionInput, setOptionInput] = useState('')

  const selectedType    = FIELD_TYPES.find(t => t.value === type)!
  const showPlaceholder = selectedType.hasPlaceholder
  const showOptions     = selectedType.hasOptions
  const canSubmit       = label.trim().length > 0 && (!showOptions || options.length > 0)

  function addOption() {
    const trimmed = optionInput.trim()
    if (trimmed && !options.includes(trimmed)) {
      setOptions(prev => [...prev, trimmed])
    }
    setOptionInput('')
  }

  function removeOption(opt: string) {
    setOptions(prev => prev.filter(o => o !== opt))
  }

  function handleOptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addOption() }
  }

  function resetForm() {
    if (isEdit) return // Don't reset when editing
    setLabel('')
    setType('text')
    setRequired(false)
    setPlaceholder('')
    setNote('')
    setOptions([])
    setOptionInput('')
  }

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      kind:        'custom_field',
      id:          existing?.id ?? `cf-${nanoid(8)}`,
      label:       label.trim(),
      type,
      required,
      placeholder: showPlaceholder && placeholder.trim() ? placeholder.trim() : undefined,
      note:        note.trim() || undefined,
      options:     showOptions && options.length > 0 ? options : undefined,
    })
    if (!isEdit) resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isEdit) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier la question' : 'Ajouter une question'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit
              ? 'Modifiez les paramètres de ce champ personnalisé'
              : 'Créez un champ personnalisé à ajouter à cette section'}
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-1">

          {/* ── Label ─────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Question / Libellé <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex. : Avez-vous des allergies alimentaires ?"
              className="h-9"
            />
          </div>

          {/* ── Type selector ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm">Type de champ</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {FIELD_TYPES.map(ft => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => { setType(ft.value); setOptions([]) }}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2.5 rounded-lg border text-left transition-all',
                    type === ft.value
                      ? 'border-[#c2440f] bg-[#c2440f]/5 text-[#c2440f] font-medium'
                      : 'border-border text-foreground hover:border-muted-foreground/40'
                  )}
                >
                  <span className="text-base leading-none w-4 text-center shrink-0 select-none">
                    {ft.icon}
                  </span>
                  <span className="text-xs leading-tight">{ft.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Options (for radio / select) ───────────────────────────────── */}
          {showOptions && (
            <div className="space-y-2">
              <Label className="text-sm">
                Options <span className="text-destructive">*</span>
              </Label>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {options.map(opt => (
                    <span
                      key={opt}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-muted border border-border rounded-full"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(opt)}
                        className="text-muted-foreground hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={handleOptionKeyDown}
                  placeholder="Saisir une option puis Entrée…"
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="h-8 px-2.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {options.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Ajoutez au moins une option pour ce champ
                </p>
              )}
            </div>
          )}

          {/* ── Placeholder ────────────────────────────────────────────────── */}
          {showPlaceholder && (
            <div className="space-y-1.5">
              <Label className="text-sm">
                Texte indicatif{' '}
                <span className="text-muted-foreground font-normal">(facultatif)</span>
              </Label>
              <Input
                value={placeholder}
                onChange={e => setPlaceholder(e.target.value)}
                placeholder="Texte affiché quand le champ est vide…"
                className="h-9"
              />
            </div>
          )}

          {/* ── Note d'aide ────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Note d'aide{' '}
              <span className="text-muted-foreground font-normal">(facultatif)</span>
            </Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ex. : Ce numéro sera utilisé pour vous contacter en cas d'urgence"
              className="h-9"
            />
          </div>

          {/* ── Required toggle ────────────────────────────────────────────── */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={required}
              onClick={() => setRequired(r => !r)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                required ? 'bg-[#c2440f]' : 'bg-muted-foreground/30'
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                  required ? 'translate-x-[18px]' : 'translate-x-0.5'
                )}
              />
            </button>
            <div>
              <p className="text-sm font-medium leading-none">Champ obligatoire</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {required ? 'Les parents devront remplir ce champ' : 'Ce champ est optionnel'}
              </p>
            </div>
          </label>

          {/* ── Actions ────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
            >
              {isEdit ? 'Enregistrer les modifications' : 'Ajouter la question'}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
