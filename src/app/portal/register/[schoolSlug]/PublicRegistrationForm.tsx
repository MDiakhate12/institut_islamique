'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Info, AlertTriangle, CheckCircle, XCircle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submitRegistrationAction } from '@/modules/registrations/registrations.actions'
import type { FormItem, FormSection, InfoBlock, FormField, FormType, InfoBlockStyle } from '@/modules/registrations/registrations.types'

// ── Style config ───────────────────────────────────────────────────────────────

const BLOCK_STYLES: Record<InfoBlockStyle, { bg: string; border: string; icon: React.ReactNode; titleColor: string }> = {
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: <Info          className="h-4 w-4 text-blue-500  shrink-0 mt-0.5" />, titleColor: 'text-blue-700'    },
  warning: { bg: 'bg-amber-50',   border: 'border-amber-200',  icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />, titleColor: 'text-amber-700'   },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle  className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />, titleColor: 'text-emerald-700' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',    icon: <XCircle      className="h-4 w-4 text-red-500   shrink-0 mt-0.5" />, titleColor: 'text-red-700'     },
}

// ── Field renderer ─────────────────────────────────────────────────────────────

function FieldRenderer({
  field, value, onChange, gradeOptions,
}: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
  gradeOptions?: string[]
}) {
  const { type, label, required } = field
  const placeholder = 'placeholder' in field ? (field.placeholder ?? '') : ''
  const options     = 'options'     in field ? (field.options     ?? []) : []
  const note        = 'note'        in field ? field.note                : undefined

  const inputClass = 'w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]/50 transition-colors'

  const labelEl = (
    <label className="text-sm font-medium text-foreground block mb-1.5">
      {label}
      {required && <span className="text-[#c2440f] ml-0.5">*</span>}
    </label>
  )

  if (type === 'text' || type === 'email' || type === 'tel') {
    return (
      <div>
        {labelEl}
        <input
          type={type}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        {note && <p className="text-xs text-muted-foreground italic mt-1">{note}</p>}
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
        <textarea
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(inputClass, 'resize-none')}
        />
      </div>
    )
  }

  if (type === 'select') {
    const selectOptions = gradeOptions ?? options
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

  if (type === 'radio') {
    return (
      <div>
        {labelEl}
        {note && <p className="text-xs text-muted-foreground italic mb-2">{note}</p>}
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm transition-all',
                value === opt
                  ? 'border-[#c2440f] bg-[#c2440f]/5 text-[#c2440f] font-medium'
                  : 'border-border text-foreground hover:border-muted-foreground/50'
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={(value as boolean) ?? false}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-[#c2440f] focus:ring-[#c2440f]/20 shrink-0"
        />
        <div>
          <span className="text-sm text-foreground">{label}</span>
          {required && <span className="text-[#c2440f] ml-0.5">*</span>}
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
      </label>
    )
  }

  if (type === 'rating') {
    const rating = (value as number) ?? 0
    return (
      <div>
        {labelEl}
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
      </div>
    )
  }

  return null
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
          className="text-sm text-foreground/80 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-[#c2440f] [&_a]:underline [&_p]:mb-1 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      </div>
    </div>
  )
}

// ── Section renderer ───────────────────────────────────────────────────────────

function SectionRenderer({
  section, formType, formData, onFieldChange, gradeOptions, prefilledStudent,
}: {
  section: FormSection
  formType: FormType
  formData: Record<string, unknown>
  onFieldChange: (key: string, value: unknown) => void
  gradeOptions?: string[]
  prefilledStudent?: { name: string; id: string }
}) {
  const isClassSection = section.systemKey === 'class_selection'

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Section header */}
      <div className="px-5 py-4 border-b border-border/60">
        <h3 className="font-semibold text-[#c2440f] text-base">{section.title}</h3>
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
                Nous vous déplacerons automatiquement ou enregistrerons les classes en fonction de vos antécédents académiques précédents. Aucune sélection manuelle n'est requise.
              </p>
            </div>
          </div>
        )}

        {/* Class selection — new student */}
        {isClassSection && formType === 'new_student' && (
          <div className="space-y-3">
            {(['QRN', 'ARA', 'NUR'] as const).map(code => (
              <div key={code}>
                <label className="text-sm font-medium block mb-1.5">Classe {code}</label>
                <select
                  value={(formData[`class_${code}`] as string) ?? ''}
                  onChange={e => onFieldChange(`class_${code}`, e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20"
                >
                  <option value="">Sélectionner une classe {code}</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Regular fields */}
        {!isClassSection && section.fields.map(field => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={v => onFieldChange(field.id, v)}
            gradeOptions={field.kind === 'system_field' && field.fieldKey === 'schoolGrade' ? gradeOptions : undefined}
          />
        ))}
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
}

export function PublicRegistrationForm({
  schoolSlug, schoolName, formType, schema,
  isPreview = false,
  prefilledStudent,
  academicYear = '2026-2027',
  gradeOptions,
}: PublicRegistrationFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [isPending, startTransition] = useTransition()

  function handleFieldChange(key: string, value: unknown) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPreview) {
      toast.info("Mode aperçu — soumission désactivée")
      return
    }
    startTransition(async () => {
      const result = await submitRegistrationAction(schoolSlug, formType, formData)
      if (!result.success) { toast.error(result.error); return }
      router.push(`/portal/register/${schoolSlug}/success`)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-[#c2440f] py-6 text-center">
        <h1 className="text-2xl font-bold text-white">Inscription à {schoolName}</h1>
        <p className="text-white/80 text-sm mt-1">Année scolaire {academicYear}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Back link */}
        {formType === 'reenrollment' && (
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-[#c2440f] hover:underline flex items-center gap-1"
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
              <p className="text-xs text-muted-foreground">Numéro d'élève : {prefilledStudent.id}</p>
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
                prefilledStudent={prefilledStudent}
              />
            )
          })}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 bg-[#c2440f] hover:bg-[#a33a0d] text-white font-semibold text-base rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {isPending ? 'Envoi en cours…' : "Soumettre l'inscription"}
          </button>

          <p className="text-center text-xs text-muted-foreground pb-4">
            En cliquant sur "Soumettre l'inscription", vous acceptez nos{' '}
            <a href="#" className="text-[#c2440f] hover:underline">Conditions d'utilisation</a>
            {' '}et{' '}
            <a href="#" className="text-[#c2440f] hover:underline">Politique de confidentialité</a>
          </p>
        </form>
      </div>
    </div>
  )
}
