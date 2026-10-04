'use client'

import { Plus, UserRound, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { GuardianOptions, GuardianRelationship, RegistrationGuardianInput } from '@/modules/registrations/registrations.types'

// Même gabarit que l'éditeur de tuteurs du tableau Élèves (admin-portal/students/StudentForm.tsx)
const SELECT_CLASS = 'h-10 w-full border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2d6a4f]/30'
const INPUT_CLASS = 'h-10 rounded-md px-3 py-2 text-sm bg-white'

const RELATIONS: { value: GuardianRelationship; label: string }[] = [
  { value: 'father',   label: 'Père' },
  { value: 'mother',   label: 'Mère' },
  { value: 'guardian', label: 'Tuteur légal' },
  { value: 'other',    label: 'Autre' },
]

export const emptyGuardian = (relationship: RegistrationGuardianInput['relationship'] = ''): RegistrationGuardianInput =>
  ({ relationship, name: '', phone: '', email: '', emergencyPhone: '' })

/** Relation proposée pour le second tuteur : l'autre parent si le premier est le père ou la mère. */
export function complementRelation(first: RegistrationGuardianInput['relationship']): RegistrationGuardianInput['relationship'] {
  if (first === 'father') return 'mother'
  if (first === 'mother') return 'father'
  return ''
}

interface Props {
  value: RegistrationGuardianInput[]
  onChange: (next: RegistrationGuardianInput[]) => void
  /** Clés `<index>.<champ>` → message (getGuardianErrors) */
  errors: Record<string, string>
  /**
   * true  : portail parent — le tuteur 1 est le parent connecté (e-mail de son compte, verrouillé) ;
   * false : formulaire public — le tuteur 1 est le contact principal, saisi par la famille.
   */
  accountHolder: boolean
  /** Titre « Tuteurs » + phrase d'explication. Masqué dans l'aperçu du constructeur, qui a déjà son titre. */
  showHeader?: boolean
  /** Réglages de l'école (second tuteur obligatoire…) */
  options?: GuardianOptions
  /** Aperçu du constructeur : cartes non interactives (l'emplacement `secondSlot` reste utilisable) */
  preview?: boolean
  /** Contenu affiché entre la carte du tuteur principal et celle du second tuteur (réglages du constructeur) */
  secondSlot?: React.ReactNode
}

/**
 * Bloc « Tuteurs » du formulaire « nouvel élève » : un seul composant pour le portail parent, le
 * formulaire public et l'aperçu du constructeur admin. Tuteur 1 obligatoire, tuteur 2 optionnel.
 * Remplace les champs système père/mère/e-mails/téléphones (GUARDIAN_FIELD_KEYS).
 */
export function GuardiansInput({ value, onChange, errors, accountHolder, showHeader = true, options, preview = false, secondSlot }: Props) {
  const previewCls = preview ? 'pointer-events-none select-none opacity-80' : undefined
  const secondRequired = !!options?.secondRequired
  const update = (i: number, patch: Partial<RegistrationGuardianInput>) =>
    onChange(value.map((g, j) => {
      if (j === i) return { ...g, ...patch }
      // Le tuteur 1 choisit sa relation : le second, s'il n'en a pas encore, prend la complémentaire
      if (i === 0 && j === 1 && patch.relationship !== undefined && !g.relationship) {
        return { ...g, relationship: complementRelation(patch.relationship) }
      }
      return g
    }))

  return (
    <div id="field-guardians" className="space-y-3">
      {showHeader && <div>
        <p className="text-sm font-medium text-foreground">Tuteurs</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {accountHolder
            ? <>Vous êtes le premier tuteur de l&apos;élève. Vous pouvez ajouter un second tuteur (l&apos;autre parent par exemple).</>
            : <>Le tuteur principal est le contact de l&apos;école pour cette inscription. Vous pouvez ajouter un second tuteur (l&apos;autre parent par exemple).</>}
        </p>
      </div>}

      {value.map((g, i) => (
        <div key={i} className="contents">
        {/* Réglages du second tuteur (constructeur) : sous la carte du tuteur principal */}
        {i === 1 && secondSlot}
        <div className={previewCls} aria-hidden={preview || undefined}>
        <GuardianCard
          index={i}
          guardian={g}
          isFirst={i === 0}
          accountHolder={accountHolder}
          takenRelations={value.filter((_, j) => j !== i).map(o => o.relationship)}
          errors={errors}
          onChange={patch => update(i, patch)}
          onRemove={i > 0 && !secondRequired ? () => onChange(value.filter((_, j) => j !== i)) : undefined}
          required={i === 0 ? undefined : secondRequired ? { email: !!options?.secondEmailRequired, phone: !!options?.secondPhoneRequired } : undefined}
        />
        </div>
        </div>
      ))}

      {value.length < 2 && secondSlot}
      {value.length < 2 && (
        <button
          aria-hidden={preview || undefined}
          tabIndex={preview ? -1 : undefined}
          type="button"
          onClick={() => onChange([...value, emptyGuardian(complementRelation(value[0]?.relationship ?? ''))])}
          className={cn('w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#2d6a4f]/30 py-3 text-sm font-medium text-[#2d6a4f] hover:bg-[#2d6a4f]/5 transition-colors', previewCls)}
        >
          <Plus className="h-4 w-4" />
          Ajouter un second tuteur <span className="font-normal text-muted-foreground">(optionnel)</span>
        </button>
      )}
    </div>
  )
}

function GuardianCard({ index, guardian: g, isFirst, accountHolder, takenRelations, errors, onChange, onRemove, required }: {
  index: number
  guardian: RegistrationGuardianInput
  isFirst: boolean
  accountHolder: boolean
  takenRelations: RegistrationGuardianInput['relationship'][]
  errors: Record<string, string>
  onChange: (patch: Partial<RegistrationGuardianInput>) => void
  onRemove?: () => void
  /** Second tuteur obligatoire : quels contacts sont exigés (undefined = second tuteur optionnel) */
  required?: { email: boolean; phone: boolean }
}) {
  const id = (f: string) => `guardian-${index}-${f}`
  const err = (f: string) => errors[`${index}.${f}`]
  const errCls = (f: string) => err(f) && 'border-red-400'
  const isAccountHolder = isFirst && accountHolder

  return (
    <div className="border border-[#2d6a4f]/30 rounded-lg p-3 space-y-3 bg-orange-50/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-[#2d6a4f] text-white text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {isAccountHolder ? 'Vous' : isFirst ? 'Tuteur principal' : 'Second tuteur'}
          </span>
          {isFirst ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2d6a4f]/10 px-2 py-0.5 text-[11px] font-medium text-[#2d6a4f]">
              <UserRound className="h-3 w-3" /> {isAccountHolder ? 'Votre compte' : 'Contact principal'}
            </span>
          ) : (
            !required && <span className="text-xs text-muted-foreground">(optionnel)</span>
          )}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 transition-colors">
            <X className="h-3.5 w-3.5" /> Retirer
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('relationship')} className="text-xs font-medium mb-1 block">Relation avec l&apos;élève *</label>
          <select
            id={id('relationship')}
            value={g.relationship}
            onChange={e => onChange({ relationship: e.target.value as RegistrationGuardianInput['relationship'] })}
            className={cn(SELECT_CLASS, errCls('relationship'))}
          >
            <option value="" disabled>Choisir…</option>
            {RELATIONS.map(r => (
              <option key={r.value} value={r.value}
                disabled={(r.value === 'father' || r.value === 'mother') && takenRelations.includes(r.value)}>
                {r.label}
              </option>
            ))}
          </select>
          {err('relationship') && <p className="text-xs text-red-600 mt-1">{err('relationship')}</p>}
        </div>

        <div>
          <label htmlFor={id('name')} className="text-xs font-medium mb-1 block">Nom complet *</label>
          <Input id={id('name')} className={cn(INPUT_CLASS, errCls('name'))} value={g.name}
            onChange={e => onChange({ name: e.target.value })} placeholder="Prénom NOM" />
          {err('name') && <p className="text-xs text-red-600 mt-1">{err('name')}</p>}
        </div>

        <div>
          <label htmlFor={id('phone')} className="text-xs font-medium mb-1 block">
            Téléphone {isFirst || required?.phone ? '*' : <span className="text-muted-foreground font-normal">(optionnel)</span>}
          </label>
          <Input id={id('phone')} type="tel" className={cn(INPUT_CLASS, errCls('phone'))} value={g.phone}
            onChange={e => onChange({ phone: e.target.value })} placeholder="0X XX XX XX XX" />
          {isFirst && !isAccountHolder && (
            <p className="text-[11px] text-muted-foreground mt-1">Ce numéro permettra de lier l&apos;élève à votre compte dans l&apos;application de l&apos;école.</p>
          )}
          {err('phone') && <p className="text-xs text-red-600 mt-1">{err('phone')}</p>}
        </div>

        <div>
          <label htmlFor={id('email')} className="text-xs font-medium mb-1 block">
            Email {isFirst ? (isAccountHolder ? null : '*') : required?.email ? '*' : <span className="text-muted-foreground font-normal">(optionnel)</span>}
          </label>
          <Input id={id('email')} type="email" value={g.email}
            readOnly={isAccountHolder}
            className={cn(INPUT_CLASS, isAccountHolder && 'bg-gray-50 text-muted-foreground cursor-not-allowed', errCls('email'))}
            onChange={e => onChange({ email: e.target.value })} placeholder="email@exemple.com" />
          {isAccountHolder && <p className="text-[11px] text-muted-foreground mt-1">L&apos;e-mail de votre compte</p>}
          {err('email') && <p className="text-xs text-red-600 mt-1">{err('email')}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={id('emergencyPhone')} className="text-xs font-medium mb-1 block">
            Téléphone d&apos;urgence <span className="text-muted-foreground font-normal">(optionnel)</span>
          </label>
          <Input id={id('emergencyPhone')} type="tel" className={INPUT_CLASS} value={g.emergencyPhone}
            onChange={e => onChange({ emergencyPhone: e.target.value })} placeholder="0X XX XX XX XX" />
        </div>
      </div>

      {!isFirst && (
        <p className="text-xs text-muted-foreground">
          Avec ce numéro de téléphone, ce tuteur pourra lier l&apos;élève à son propre compte.
        </p>
      )}
    </div>
  )
}
