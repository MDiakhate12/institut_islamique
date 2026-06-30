'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Plus, XCircle,
  Type, AlignLeft, Mail, Phone, CalendarDays, ChevronDown,
  CircleDot, ToggleLeft, CheckSquare, Hash, Star,
} from 'lucide-react'
import type { CustomField, FieldType } from '@/modules/registrations/registrations.types'

// ── Field type definitions ─────────────────────────────────────────────────────
// Row 1 (6 items) + Row 2 (5 items) — matches qaf.app layout
// "Case à cocher" is not selectable from this dialog (used only in default schema)

const ROW1: { value: FieldType; label: string; icon: React.ReactNode; hasOptions: boolean; hasPlaceholder: boolean }[] = [
  { value: 'text',     label: 'Texte court',     icon: <Type         className="h-5 w-5" />, hasOptions: false, hasPlaceholder: true  },
  { value: 'textarea', label: 'Texte long',       icon: <AlignLeft    className="h-5 w-5" />, hasOptions: false, hasPlaceholder: true  },
  { value: 'email',    label: 'E-mail',           icon: <Mail         className="h-5 w-5" />, hasOptions: false, hasPlaceholder: true  },
  { value: 'tel',      label: 'Téléphone',        icon: <Phone        className="h-5 w-5" />, hasOptions: false, hasPlaceholder: true  },
  { value: 'date',     label: 'Date',             icon: <CalendarDays className="h-5 w-5" />, hasOptions: false, hasPlaceholder: false },
  { value: 'select',   label: 'Liste déroulante', icon: <ChevronDown  className="h-5 w-5" />, hasOptions: true,  hasPlaceholder: false },
]

const ROW2: typeof ROW1 = [
  { value: 'radio',    label: 'Choix unique',          icon: <CircleDot   className="h-5 w-5" />, hasOptions: true,  hasPlaceholder: false },
  { value: 'yes_no',   label: 'Oui / Non',             icon: <ToggleLeft  className="h-5 w-5" />, hasOptions: false, hasPlaceholder: false },
  { value: 'multiple', label: 'Choix multiple',         icon: <CheckSquare className="h-5 w-5" />, hasOptions: true,  hasPlaceholder: false },
  { value: 'number',   label: 'Nombre',                icon: <Hash        className="h-5 w-5" />, hasOptions: false, hasPlaceholder: true  },
  { value: 'rating',   label: 'Évaluation par étoiles', icon: <Star       className="h-5 w-5" />, hasOptions: false, hasPlaceholder: false },
]

const ALL_TYPES = [...ROW1, ...ROW2]

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (field: CustomField) => void
  existing?: CustomField
}

// ── Type selector card ─────────────────────────────────────────────────────────

function TypeCard({
  ft, selected, onClick,
}: {
  ft: typeof ROW1[0]
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-3 px-1 rounded-xl border-2 transition-all text-center',
        selected
          ? 'border-[#7a4f30] bg-[#7a4f30]/5 text-[#7a4f30]'
          : 'border-border bg-white text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
      )}
    >
      <span className="shrink-0">{ft.icon}</span>
      <span className="text-[9px] font-semibold leading-tight tracking-wide uppercase">
        {ft.label}
      </span>
    </button>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AddFieldDialog({ open, onOpenChange, onAdd, existing }: Props) {
  const isEdit = !!existing

  const [label,         setLabel]         = useState(existing?.label       ?? '')
  const [type,          setType]          = useState<FieldType>(existing?.type ?? 'text')
  const [required,      setRequired]      = useState(existing?.required     ?? false)
  const [placeholder,   setPlaceholder]   = useState(existing?.placeholder ?? '')
  const [note,          setNote]          = useState(existing?.note        ?? '')
  const [options,       setOptions]       = useState<string[]>(existing?.options ?? [])
  const [addingOption,  setAddingOption]  = useState(false)
  const [optionInput,   setOptionInput]   = useState('')

  const selectedTypeDef = ALL_TYPES.find(t => t.value === type)!
  const showPlaceholder = selectedTypeDef.hasPlaceholder
  const showOptions     = selectedTypeDef.hasOptions
  const canSubmit       = label.trim().length > 0 && (!showOptions || options.length > 0)

  function commitOption() {
    const trimmed = optionInput.trim()
    if (trimmed && !options.includes(trimmed)) {
      setOptions(prev => [...prev, trimmed])
    }
    setOptionInput('')
    setAddingOption(false)
  }

  function handleOptionKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  { e.preventDefault(); commitOption() }
    if (e.key === 'Escape') { setOptionInput(''); setAddingOption(false) }
  }

  function removeOption(opt: string) {
    setOptions(prev => prev.filter(o => o !== opt))
  }

  function resetForm() {
    if (isEdit) return
    setLabel(''); setType('text'); setRequired(false)
    setPlaceholder(''); setNote(''); setOptions([])
    setOptionInput(''); setAddingOption(false)
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

  function handleTypeSelect(newType: FieldType) {
    setType(newType)
    setOptions([])
    setAddingOption(false)
    setOptionInput('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isEdit) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">

        {/* ── Header with Obligatoire toggle ─────────────────────────────── */}
        <DialogHeader>
          <div className="flex items-start justify-between pr-7">
            <div>
              <DialogTitle>
                {isEdit ? 'Modifier la question' : 'Ajouter une question à la section'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEdit
                  ? 'Modifiez les paramètres de ce champ'
                  : 'Créez une nouvelle question pour votre formulaire d\'inscription'}
              </p>
            </div>

            {/* Obligatoire toggle */}
            <button
              type="button"
              onClick={() => setRequired(r => !r)}
              className="flex items-center gap-2 shrink-0 ml-4 mt-0.5"
            >
              <span className={cn(
                'text-sm font-medium transition-colors',
                required ? 'text-[#c2440f]' : 'text-muted-foreground'
              )}>
                Obligatoire
              </span>
              <div className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                required ? 'bg-[#c2440f]' : 'bg-muted-foreground/30'
              )}>
                <span className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                  required ? 'translate-x-[18px]' : 'translate-x-0.5'
                )} />
              </div>
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-1">

          {/* ── Libellé ────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Libellé de la question <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex. : Avez-vous des allergies alimentaires ?"
              className="h-9"
            />
          </div>

          {/* ── Type selector — row 1 (6) + row 2 (5) ────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#c2440f]">Type de question</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-6 gap-2">
                {ROW1.map(ft => (
                  <TypeCard key={ft.value} ft={ft} selected={type === ft.value} onClick={() => handleTypeSelect(ft.value)} />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {ROW2.map(ft => (
                  <TypeCard key={ft.value} ft={ft} selected={type === ft.value} onClick={() => handleTypeSelect(ft.value)} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Options (radio / select / multiple) ───────────────────────── */}
          {showOptions && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Options <span className="text-destructive">*</span>
              </Label>

              {/* Options list */}
              {options.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                  {options.map(opt => (
                    <div key={opt} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm text-foreground">{opt}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(opt)}
                        className="text-muted-foreground/50 hover:text-red-500 transition-colors ml-2 shrink-0"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add option — inline input or text link */}
              {addingOption ? (
                <Input
                  autoFocus
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={handleOptionKeyDown}
                  onBlur={() => { if (optionInput.trim()) commitOption(); else setAddingOption(false) }}
                  placeholder="Saisir une option puis Entrée…"
                  className="h-8 text-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingOption(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une option
                </button>
              )}

              {options.length === 0 && !addingOption && (
                <p className="text-xs text-muted-foreground italic">Ajoutez au moins une option</p>
              )}
            </div>
          )}

          {/* ── Texte d'espace réservé (placeholder) ─────────────────────── */}
          {showPlaceholder && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Texte d&apos;espace réservé{' '}
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

          {/* ── Texte d'aide (note) ────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Texte d&apos;aide{' '}
              <span className="text-muted-foreground font-normal">(facultatif)</span>
            </Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="ex. : Ce numéro sera utilisé pour vous contacter en cas d'urgence"
              className="h-9"
            />
          </div>

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
