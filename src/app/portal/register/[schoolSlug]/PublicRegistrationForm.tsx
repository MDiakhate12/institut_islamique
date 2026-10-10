'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Info, AlertTriangle, CheckCircle, XCircle, Star, X, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitRegistrationAction } from '@/modules/registrations/registrations.actions'
import { getMissingRequiredFields, getInvalidPhoneFields, getGuardianErrors } from '@/modules/registrations/registrations.schema'
import { PHONE_INVALID_MESSAGE } from '@/lib/phone'
import { GuardiansInput, emptyGuardian, complementRelation } from '@/components/shared/GuardiansInput/GuardiansInput'
import type { FormItem, FormSection, InfoBlock, FormField, FormType, InfoBlockStyle, RegistrationClassItem, RegistrationGuardianInput } from '@/modules/registrations/registrations.types'
import { GUARDIAN_FIELD_KEYS, getGuardianOptions } from '@/modules/registrations/registrations.types'

// ── Style config ───────────────────────────────────────────────────────────────

const BLOCK_STYLES: Record<InfoBlockStyle, { bg: string; border: string; icon: React.ReactNode; titleColor: string }> = {
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: <Info          className="h-4 w-4 text-blue-500  shrink-0 mt-0.5" />, titleColor: 'text-blue-700'    },
  warning: { bg: 'bg-amber-50',   border: 'border-amber-200',  icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />, titleColor: 'text-amber-700'   },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle  className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />, titleColor: 'text-emerald-700' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',    icon: <XCircle      className="h-4 w-4 text-red-500   shrink-0 mt-0.5" />, titleColor: 'text-red-700'     },
}

// ── Field renderer ─────────────────────────────────────────────────────────────

function FieldRenderer({
  field, value, onChange, gradeOptions, financialOptions,
}: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
  gradeOptions?: string[]
  financialOptions?: string[]
}) {
  const { type, label, required } = field
  const placeholder = 'placeholder' in field ? (field.placeholder ?? '') : ''
  const options     = 'options'     in field ? (field.options     ?? []) : []
  const note        = 'note'        in field ? field.note                : undefined

  const inputClass = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]/50 transition-colors'

  const labelEl = (
    <label className="text-sm font-medium text-foreground block mb-1">
      {label}
      {required && <span className="text-[#2d6a4f] ml-0.5">*</span>}
    </label>
  )

  // Shared note element (placed before input)
  const noteEl = note ? (
    <p className="text-xs text-muted-foreground mb-1.5">{note}</p>
  ) : null

  // System fields whose value is computed by the app — shown, never editable
  if (field.kind === 'system_field' && field.readOnly) {
    return (
      <div>
        {labelEl}
        {noteEl}
        <div className={cn(inputClass, 'bg-muted/40 text-muted-foreground cursor-not-allowed select-none')}>
          {(value as string) ?? ''}
        </div>
      </div>
    )
  }

  if (type === 'text' || type === 'email' || type === 'tel') {
    const isLastName = field.kind === 'system_field' && 'fieldKey' in field && (field as { fieldKey: string }).fieldKey === 'lastName'
    return (
      <div>
        {labelEl}
        {noteEl}
        <input
          type={type}
          value={(value as string) ?? ''}
          onChange={e => onChange(isLastName ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          className={isLastName ? cn(inputClass, 'uppercase') : inputClass}
        />
      </div>
    )
  }

  if (type === 'number') {
    return (
      <div>
        {labelEl}
        {noteEl}
        <input
          type="number"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      </div>
    )
  }

  if (type === 'date') {
    return (
      <div>
        {labelEl}
        <input type="date" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} className={inputClass} />
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div>
        {labelEl}
        {noteEl}
        <textarea
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(inputClass, 'resize-y')}
        />
      </div>
    )
  }

  if (type === 'select') {
    const selectOptions = gradeOptions ?? financialOptions ?? options
    return (
      <div>
        {labelEl}
        <select
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={cn(inputClass, 'bg-white appearance-none pr-8')}
        >
          <option value="">Sélectionner une option</option>
          {selectOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {note && <p className="text-xs text-blue-600 mt-1">{note}</p>}
      </div>
    )
  }

  // Radio — full-width option cards with radio circle (matches qaf.app)
  if (type === 'radio') {
    return (
      <div>
        {labelEl}
        {noteEl}
        <div className="space-y-2">
          {options.map(opt => {
            const isSelected = value === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-[#2d6a4f] bg-[#2d6a4f]/5'
                    : 'border-border bg-white hover:border-muted-foreground/30'
                )}
              >
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  isSelected ? 'border-[#2d6a4f]' : 'border-muted-foreground/40'
                )}>
                  {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-[#2d6a4f]" />}
                </div>
                <span className={cn('text-sm', isSelected ? 'text-[#2d6a4f] font-medium' : 'text-foreground')}>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Checkbox — inline label+checkbox (for photo consent, policy acknowledgement)
  if (type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={(value as boolean) ?? false}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-[#2d6a4f] shrink-0"
        />
        <div>
          <span className="text-sm text-foreground">{label}</span>
          {required && <span className="text-[#2d6a4f] ml-0.5">*</span>}
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
      </label>
    )
  }

  // Rating — clickable stars with X/5 counter (matches qaf.app)
  if (type === 'rating') {
    const rating = (value as number) ?? 0
    return (
      <div>
        {labelEl}
        {noteEl}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className="transition-colors"
              >
                <Star className={cn('h-7 w-7', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <span className="text-sm text-muted-foreground font-medium">{rating}/5</span>
          )}
        </div>
      </div>
    )
  }

  // Yes/No — single checkbox (matches qaf.app: checked = oui, unchecked = non)
  if (type === 'yes_no') {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={(value as boolean) ?? false}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-[#2d6a4f] shrink-0"
        />
        <div>
          <span className="text-sm text-foreground">{label}</span>
          {required && <span className="text-[#2d6a4f] ml-0.5">*</span>}
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
      </label>
    )
  }

  // Multiple — full-width option cards with checkboxes (matches qaf.app)
  if (type === 'multiple') {
    const selected = (value as string[]) ?? []
    return (
      <div>
        {labelEl}
        {noteEl}
        <div className="space-y-2">
          {options.map(opt => {
            const isChecked = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = isChecked
                    ? selected.filter(s => s !== opt)
                    : [...selected, opt]
                  onChange(next)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                  isChecked
                    ? 'border-[#2d6a4f] bg-[#2d6a4f]/5'
                    : 'border-border bg-white hover:border-muted-foreground/30'
                )}
              >
                <div className={cn(
                  'h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  isChecked ? 'border-[#2d6a4f] bg-[#2d6a4f]' : 'border-muted-foreground/40 bg-white'
                )}>
                  {isChecked && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-white fill-current">
                      <path d="M1.5 6L4.5 9L10.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                </div>
                <span className={cn('text-sm', isChecked ? 'text-[#2d6a4f] font-medium' : 'text-foreground')}>{opt}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

// ── Class selection helpers ────────────────────────────────────────────────────

function groupBySubject(classes: RegistrationClassItem[]): Record<string, RegistrationClassItem[]> {
  return classes.reduce<Record<string, RegistrationClassItem[]>>((acc, cls) => {
    if (!acc[cls.subjectCode]) acc[cls.subjectCode] = []
    acc[cls.subjectCode].push(cls)
    return acc
  }, {})
}

function PublicSyllabusDialog({ cls, onClose }: { cls: RegistrationClassItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-[#1e4535] px-5 py-4 flex items-start justify-between gap-4 shrink-0">
          <h3 className="text-white font-semibold text-sm leading-snug">
            {cls.name} ({cls.code}) — Programme
          </h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white shrink-0 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {cls.curriculum
            ? <div
                className="text-sm [&_h2]:text-[#2d6a4f] [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-[#2d6a4f] [&_h3]:font-semibold [&_h3]:mb-1 [&_h4]:text-[#2d6a4f] [&_h4]:font-medium [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_li]:mb-0.5"
                dangerouslySetInnerHTML={{ __html: cls.curriculum }}
              />
            : <p className="text-sm text-muted-foreground">Aucun syllabus disponible pour cette classe.</p>
          }
        </div>
      </div>
    </div>
  )
}

function ClassSelectionCards({
  classes, formData, onFieldChange,
}: {
  classes: RegistrationClassItem[]
  formData: Record<string, unknown>
  onFieldChange: (key: string, value: unknown) => void
}) {
  const [syllabusClass, setSyllabusClass] = useState<RegistrationClassItem | null>(null)
  const grouped = groupBySubject(classes)
  const subjects = Object.keys(grouped)

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Aucune classe disponible pour l&apos;inscription.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {subjects.map(subject => {
          const classList = grouped[subject]
          const selectedId = formData[`class_${subject}`] as string | undefined

          return (
            <div key={subject}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Classe {subject}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {classList.map(cls => {
                  const isSelected = selectedId === cls.id
                  return (
                    <div
                      key={cls.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onFieldChange(`class_${subject}`, isSelected ? undefined : cls.id)}
                      onKeyDown={e => e.key === 'Enter' && onFieldChange(`class_${subject}`, isSelected ? undefined : cls.id)}
                      className={cn(
                        'relative flex flex-col gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
                        isSelected
                          ? 'border-[#2d6a4f] bg-[#2d6a4f]/5'
                          : 'border-border bg-white hover:border-muted-foreground/30'
                      )}
                    >
                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#2d6a4f] flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                            <path d="M2 6L4.5 8.5L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}

                      {/* Class name */}
                      <p className={cn(
                        'text-xs font-medium leading-snug line-clamp-3',
                        isSelected ? 'text-[#2d6a4f] pr-6' : 'text-foreground',
                      )}>
                        {cls.name}
                      </p>

                      {/* Code badge */}
                      <span className="inline-flex self-start text-[10px] bg-[#2d6a4f] text-white rounded px-1.5 py-0.5 font-medium">
                        {cls.fullCode}
                      </span>

                      {/* Syllabus button */}
                      {cls.curriculum && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSyllabusClass(cls) }}
                          className="inline-flex self-start items-center gap-1 text-[10px] bg-[#2d6a4f] text-white rounded px-1.5 py-0.5 hover:bg-[#1e4535] transition-colors"
                        >
                          <BookOpen className="h-2.5 w-2.5" />
                          Syllabus
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {syllabusClass && (
        <PublicSyllabusDialog cls={syllabusClass} onClose={() => setSyllabusClass(null)} />
      )}
    </>
  )
}

// ── Info block renderer ────────────────────────────────────────────────────────

function InfoBlockRenderer({ block }: { block: InfoBlock }) {
  const cfg = BLOCK_STYLES[block.style]
  return (
    <div className={cn('rounded-xl border p-4 flex items-start gap-3', cfg.bg, cfg.border)}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        {block.title && <p className={cn('font-semibold text-sm mb-1', cfg.titleColor)}>{block.title}</p>}
        <div
          className="text-sm text-foreground/80 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-[#2d6a4f] [&_a]:underline [&_p]:mb-1 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      </div>
    </div>
  )
}

// ── Section renderer ───────────────────────────────────────────────────────────

function SectionRenderer({
  section, formType, formData, onFieldChange, gradeOptions, financialOptions, prefilledStudent, classes, errors,
  guardiansSlot,
}: {
  section: FormSection
  formType: FormType
  formData: Record<string, unknown>
  onFieldChange: (key: string, value: unknown) => void
  errors: Map<string, string>
  gradeOptions?: string[]
  financialOptions?: string[]
  prefilledStudent?: { name: string; id: string }
  classes?: RegistrationClassItem[]
  /** Bloc « Tuteurs » (portail parent) : remplace les champs parents/contact, à la place du premier */
  guardiansSlot?: React.ReactNode
}) {
  const isClassSection = section.systemKey === 'class_selection'
  const isGuardianField = (f: FormSection['fields'][number]) =>
    !!guardiansSlot && f.kind === 'system_field' && GUARDIAN_FIELD_KEYS.includes(f.fieldKey)
  const firstGuardianFieldId = section.fields.find(isGuardianField)?.id

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-border/60">
        <h3 className="font-semibold text-[#2d6a4f] text-base">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
        )}
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Student info section — reenrollment shows prefilled fields */}
        {section.systemKey === 'student_info' && formType === 'reenrollment' && prefilledStudent && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Élève :</span>
              <span className="text-sm font-medium">{prefilledStudent.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">ID :</span>
              <span className="text-sm font-medium">{prefilledStudent.id}</span>
            </div>
          </div>
        )}

        {/* Class selection — reenrollment is automatic */}
        {isClassSection && formType === 'reenrollment' && (
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Le placement en classe est géré automatiquement par le système.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Nous vous déplacerons automatiquement ou enregistrerons les classes en fonction de vos antécédents académiques précédents. Aucune sélection manuelle n&apos;est requise.
              </p>
            </div>
          </div>
        )}

        {/* Class selection — new student: selectable cards */}
        {isClassSection && formType === 'new_student' && (
          <ClassSelectionCards
            classes={classes ?? []}
            formData={formData}
            onFieldChange={onFieldChange}
          />
        )}

        {/* Regular fields */}
        {!isClassSection && section.fields.map(field => {
          if (isGuardianField(field)) {
            return field.id === firstGuardianFieldId ? <div key="guardians">{guardiansSlot}</div> : null
          }
          const hasError = errors.has(field.id)
          return (
            <div
              key={field.id}
              id={`field-${field.id}`}
              className={cn(hasError && '[&_input:not([type=checkbox])]:border-red-400 [&_select]:border-red-400 [&_textarea]:border-red-400')}
            >
              <FieldRenderer
                field={field}
                value={formData[field.id]}
                onChange={v => onFieldChange(field.id, v)}
                gradeOptions={field.kind === 'system_field' && field.fieldKey === 'schoolGrade' ? gradeOptions : undefined}
                financialOptions={field.kind === 'system_field' && field.fieldKey === 'financialAid' ? financialOptions : undefined}
              />
              {hasError && <p className="text-xs text-red-600 mt-1">{errors.get(field.id)}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main public form ───────────────────────────────────────────────────────────

export interface PublicRegistrationFormProps {
  schoolSlug: string
  schoolName: string
  formType: FormType
  schema: FormItem[]
  isPreview?: boolean
  prefilledStudent?: { name: string; id: string }
  academicYear?: string
  gradeOptions?: string[]
  financialOptions?: string[]
  classes?: RegistrationClassItem[]
  initialFormData?: Record<string, unknown>
  /** Portail parent : tuteur 1 = le parent connecté (pré-rempli). Absent = formulaire public, tuteurs saisis par la famille */
  initialGuardians?: RegistrationGuardianInput[]
  studentId?: string
  backHref?: string
  successHref?: string
}

export function PublicRegistrationForm({
  schoolSlug, schoolName, formType, schema,
  isPreview = false,
  prefilledStudent,
  academicYear = '2026-2027',
  gradeOptions,
  financialOptions,
  classes = [],
  initialFormData,
  initialGuardians,
  studentId,
  backHref,
  successHref,
}: PublicRegistrationFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const seeded: Record<string, unknown> = { ...(initialFormData ?? {}) }
    for (const item of schema) {
      if (item.kind !== 'section') continue
      for (const field of item.fields) {
        if (field.kind === 'system_field' && field.fieldKey === 'academicYear' && seeded[field.id] === undefined) {
          seeded[field.id] = academicYear
        }
      }
    }
    return seeded
  })
  const [isPending, startTransition] = useTransition()
  // id du champ → message (« Ce champ est requis » ou numéro invalide)
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  // Bloc « Tuteurs » à la place des champs père/mère/contact (si l'école les a dans son formulaire)
  const accountHolder = !!initialGuardians
  const withGuardians = formType === 'new_student' && schema.some(item =>
    item.kind === 'section' && item.fields.some(f => f.kind === 'system_field' && GUARDIAN_FIELD_KEYS.includes(f.fieldKey)))
  // Réglages de l'école (« Second tuteur obligatoire »…) : la carte du second tuteur est alors affichée d'office
  const guardianOptions = getGuardianOptions(schema)
  const [guardians, setGuardians] = useState<RegistrationGuardianInput[]>(() => {
    const first = initialGuardians ?? [emptyGuardian()]
    return guardianOptions.secondRequired && first.length < 2
      ? [...first, emptyGuardian(complementRelation(first[0]?.relationship ?? ''))]
      : first
  })
  const [guardianErrors, setGuardianErrors] = useState<Record<string, string>>({})

  function handleGuardiansChange(next: RegistrationGuardianInput[]) {
    setGuardians(next)
    // Les erreurs affichées suivent la saisie (elles disparaissent dès que le champ est corrigé)
    if (Object.keys(guardianErrors).length > 0) setGuardianErrors(getGuardianErrors(next, { accountHolder, options: guardianOptions }))
  }

  function handleFieldChange(key: string, value: unknown) {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (errors.has(key)) setErrors(prev => { const next = new Map(prev); next.delete(key); return next })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPreview) {
      toast.info("Mode aperçu — soumission désactivée")
      return
    }
    const missing = getMissingRequiredFields(schema, formData, {
      gradeOptions, financialOptions,
      skipFieldKeys: withGuardians ? GUARDIAN_FIELD_KEYS : undefined,
    })
    const invalidPhones = getInvalidPhoneFields(schema, formData, {
      skipFieldKeys: withGuardians ? GUARDIAN_FIELD_KEYS : undefined,
    })
    const gErrors = withGuardians ? getGuardianErrors(guardians, { accountHolder, options: guardianOptions }) : {}
    const errorCount = missing.length + invalidPhones.length + Object.keys(gErrors).length
    if (errorCount > 0) {
      setErrors(new Map([
        ...invalidPhones.map(f => [f.id, PHONE_INVALID_MESSAGE] as const),
        ...missing.map(f => [f.id, 'Ce champ est requis'] as const),
      ]))
      setGuardianErrors(gErrors)
      const hasInvalid = invalidPhones.length > 0 || Object.values(gErrors).includes(PHONE_INVALID_MESSAGE)
      toast.error(!hasInvalid
        ? (errorCount === 1 ? 'Veuillez compléter le champ obligatoire' : `Veuillez compléter les ${errorCount} champs obligatoires`)
        : (errorCount === 1 ? 'Veuillez corriger le champ indiqué' : `Veuillez corriger les ${errorCount} champs indiqués`))
      const firstField = missing[0] ?? invalidPhones[0]
      const firstId = Object.keys(gErrors).length > 0 || !firstField ? 'field-guardians' : `field-${firstField.id}`
      document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    startTransition(async () => {
      const result = await submitRegistrationAction(schoolSlug, formType, formData, studentId, withGuardians ? guardians : undefined)
      if (!result.success) { toast.error(result.error); return }
      router.push(successHref ?? `/portal/register/${schoolSlug}/success`)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-[#2d6a4f] py-6 text-center">
        <h1 className="text-2xl font-bold text-white">Inscription à {schoolName}</h1>
        <p className="text-white/80 text-sm mt-1">Année scolaire {academicYear}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Back link */}
        {formType === 'reenrollment' && (
          <button
            type="button"
            onClick={() => backHref ? router.push(backHref) : router.back()}
            className="text-sm text-[#2d6a4f] hover:underline flex items-center gap-1"
          >
            ← Sélectionner un autre élève
          </button>
        )}

        {/* Preview banner */}
        {isPreview && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
            👁️ Mode aperçu — cet aperçu représente ce que verront les parents
          </div>
        )}

        {/* Student card (reenrollment) */}
        {formType === 'reenrollment' && prefilledStudent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold shrink-0">
              {prefilledStudent.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">Réinscription : {prefilledStudent.name}</p>
              <p className="text-xs text-muted-foreground">Numéro d&apos;élève : {prefilledStudent.id}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {schema.map(item => {
            if (item.kind === 'info_block') {
              return <InfoBlockRenderer key={item.id} block={item} />
            }
            return (
              <SectionRenderer
                key={item.id}
                section={item}
                formType={formType}
                formData={formData}
                onFieldChange={handleFieldChange}
                gradeOptions={gradeOptions}
                financialOptions={financialOptions}
                prefilledStudent={prefilledStudent}
                classes={classes}
                errors={errors}
                guardiansSlot={withGuardians && item.systemKey === 'student_info'
                  ? <GuardiansInput value={guardians} onChange={handleGuardiansChange} errors={guardianErrors} accountHolder={accountHolder} options={guardianOptions} />
                  : undefined}
              />
            )
          })}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-semibold text-base rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {isPending ? 'Envoi en cours…' : "Soumettre l'inscription"}
          </button>

          <p className="text-center text-xs text-muted-foreground pb-4">
            En cliquant sur &quot;Soumettre l&apos;inscription&quot;, vous acceptez nos{' '}
            <a href="#" className="text-[#2d6a4f] hover:underline">Conditions d&apos;utilisation</a>
            {' '}et{' '}
            <a href="#" className="text-[#2d6a4f] hover:underline">Politique de confidentialité</a>
          </p>
        </form>
      </div>
    </div>
  )
}
