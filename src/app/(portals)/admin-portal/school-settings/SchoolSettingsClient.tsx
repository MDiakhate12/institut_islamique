'use client'

import { useState, useRef, useCallback, useId } from 'react'
import { toast } from 'sonner'
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form'
import {
  useSchool,
  useUpdateSchoolInfo,
  useUpdateSchoolSettings,
  useUploadSchoolLogo,
} from '@/modules/school/school.hooks'
import type { School, SchoolSettings, TvRule, ClassPeriod, QuickLink, StaffMember } from '@/modules/school/school.types'
import type { UpdateSchoolInfoInput, UpdateSchoolSettingsInput } from '@/modules/school/school.schema'
import { ContactSupportDialog } from './ContactSupportDialog'
import { ImportExcelDialog } from './ImportExcelDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Save, Plus, Trash2, Upload, GripVertical, Phone, Mail, Globe,
  Share2, MapPin, Clock, BookOpen, Link, Tv2, Users,
  FileSpreadsheet, Settings, AlertTriangle, MessageCircle,
  Check, HelpCircle, CreditCard,
} from 'lucide-react'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'

// ── Days ─────────────────────────────────────────────────────────────────────
const DAYS = [
  { key: 'monday',    label: 'Lun' },
  { key: 'tuesday',   label: 'Mar' },
  { key: 'wednesday', label: 'Mer' },
  { key: 'thursday',  label: 'Jeu' },
  { key: 'friday',    label: 'Ven' },
  { key: 'saturday',  label: 'Sam' },
  { key: 'sunday',    label: 'Dim' },
]

const MONTHS = [
  { key: 'january',   label: 'janvier' },
  { key: 'february',  label: 'février' },
  { key: 'march',      label: 'mars' },
  { key: 'april',      label: 'avril' },
  { key: 'may',        label: 'mai' },
  { key: 'june',       label: 'juin' },
  { key: 'july',       label: 'juillet' },
  { key: 'august',     label: 'août' },
  { key: 'september',  label: 'septembre' },
  { key: 'october',    label: 'octobre' },
  { key: 'november',   label: 'novembre' },
  { key: 'december',   label: 'décembre' },
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

const TIMEZONES = [
  { value: 'UTC',            label: 'UTC' },
  { value: 'Europe/Paris',   label: 'Europe/Paris (CET)' },
  { value: 'Europe/London',  label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca' },
  { value: 'Africa/Algiers', label: 'Africa/Algiers' },
  { value: 'Africa/Tunis',   label: 'Africa/Tunis' },
  { value: 'Asia/Riyadh',    label: 'Asia/Riyadh' },
  { value: 'Asia/Dubai',     label: 'Asia/Dubai' },
]

// ── Combined form — toute la page partage un seul état + un seul bouton Sauvegarder ──
interface SchoolSettingsFormValues {
  // Identité / contact
  name: string
  defaultLanguage: string
  timezone: string
  contactEmail: string
  phone: string
  address: string
  website: string
  facebook: string
  instagram: string
  // Settings JSONB
  schoolDays: string[]
  academicYear: string
  currentTrimester: 1 | 2 | 3
  allowNewRegistrations: boolean
  examPeriodT1Open: boolean
  examPeriodT2Open: boolean
  examPeriodT3Open: boolean
  yearStartDate: string | null
  yearEndDate: string | null
  trimester1StartDate: string | null
  trimester2StartDate: string | null
  trimester3StartDate: string | null
  rooms: string[]
  classPeriods: ClassPeriod[]
  gradeLevels: string[]
  teacherHourlyRate: number
  paymentInfoUrl: string
  paymentModes: string[]
  financialOptions: string[]
  paymentPeriodShowTrimesters: boolean
  paymentPeriodShowAnnually: boolean
  paymentPeriodShowMonthly: boolean
  paymentPeriodShowCantAfford: boolean
  paymentMonths: string[]
  allowTeacherExpenses: boolean
  requireQuranRecording: boolean
  tvRules: TvRule[]
  staff: StaffMember[]
  quickLinks: QuickLink[]
}

function buildDefaultValues(school: School): SchoolSettingsFormValues {
  const s = school.settings as SchoolSettings
  return {
    name:            school.name,
    defaultLanguage: school.defaultLanguage ?? 'fr',
    timezone:        school.timezone ?? 'UTC',
    contactEmail:    school.contactEmail ?? '',
    phone:           school.phone ?? '',
    address:         school.address ?? '',
    website:         school.website ?? '',
    facebook:        school.facebook ?? '',
    instagram:       school.instagram ?? '',
    schoolDays:             s.schoolDays,
    academicYear:           s.academicYear,
    currentTrimester:       s.currentTrimester,
    allowNewRegistrations:  s.allowNewRegistrations,
    examPeriodT1Open:       s.examPeriodT1Open,
    examPeriodT2Open:       s.examPeriodT2Open,
    examPeriodT3Open:       s.examPeriodT3Open,
    yearStartDate:          s.yearStartDate,
    yearEndDate:            s.yearEndDate,
    trimester1StartDate:    s.trimester1StartDate,
    trimester2StartDate:    s.trimester2StartDate,
    trimester3StartDate:    s.trimester3StartDate,
    rooms:                  s.rooms,
    classPeriods:           s.classPeriods,
    gradeLevels:            s.gradeLevels,
    teacherHourlyRate:      s.teacherHourlyRate,
    paymentInfoUrl:         s.paymentInfoUrl,
    paymentModes:           s.paymentModes,
    financialOptions:       s.financialOptions,
    paymentPeriodShowTrimesters: s.paymentPeriodShowTrimesters,
    paymentPeriodShowAnnually:   s.paymentPeriodShowAnnually,
    paymentPeriodShowMonthly:    s.paymentPeriodShowMonthly,
    paymentPeriodShowCantAfford: s.paymentPeriodShowCantAfford,
    paymentMonths:          s.paymentMonths,
    allowTeacherExpenses:   s.allowTeacherExpenses,
    requireQuranRecording:  s.requireQuranRecording,
    tvRules:                s.tvRules,
    staff:                  s.staff,
    quickLinks:             s.quickLinks,
  }
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#c2440f]" />
        <h2 className="font-semibold text-sm text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Checkbox row ─────────────────────────────────────────────────────────────
function CheckRow({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-[#c2440f]"
        />
      </div>
      <div>
        <p className="text-sm font-medium group-hover:text-[#c2440f] transition-colors">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </label>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main client
// ══════════════════════════════════════════════════════════════════════════════
export function SchoolSettingsClient() {
  const { data: school, isLoading } = useSchool()

  if (isLoading) return <SettingsSkeleton />
  if (!school) return (
    <div className="p-6 text-center text-muted-foreground">
      École introuvable
    </div>
  )

  return <SchoolSettingsForm school={school} />
}

function SchoolSettingsForm({ school }: { school: School }) {
  const form = useForm<SchoolSettingsFormValues>({ defaultValues: buildDefaultValues(school) })
  const { handleSubmit, reset, formState: { isDirty } } = form
  const updateInfo = useUpdateSchoolInfo()
  const updateSettings = useUpdateSchoolSettings()
  const isSaving = updateInfo.isPending || updateSettings.isPending

  async function onSubmit(values: SchoolSettingsFormValues) {
    const infoPayload: UpdateSchoolInfoInput = {
      name: values.name,
      defaultLanguage: values.defaultLanguage,
      timezone: values.timezone,
      contactEmail: values.contactEmail,
      phone: values.phone,
      address: values.address,
      website: values.website,
      facebook: values.facebook,
      instagram: values.instagram,
    }
    const settingsPayload: UpdateSchoolSettingsInput = {
      schoolDays: values.schoolDays,
      academicYear: values.academicYear,
      currentTrimester: values.currentTrimester,
      allowNewRegistrations: values.allowNewRegistrations,
      examPeriodT1Open: values.examPeriodT1Open,
      examPeriodT2Open: values.examPeriodT2Open,
      examPeriodT3Open: values.examPeriodT3Open,
      yearStartDate: values.yearStartDate,
      yearEndDate: values.yearEndDate,
      trimester1StartDate: values.trimester1StartDate,
      trimester2StartDate: values.trimester2StartDate,
      trimester3StartDate: values.trimester3StartDate,
      rooms: values.rooms,
      classPeriods: values.classPeriods,
      gradeLevels: values.gradeLevels,
      teacherHourlyRate: values.teacherHourlyRate,
      paymentInfoUrl: values.paymentInfoUrl,
      paymentModes: values.paymentModes,
      financialOptions: values.financialOptions,
      paymentPeriodShowTrimesters: values.paymentPeriodShowTrimesters,
      paymentPeriodShowAnnually: values.paymentPeriodShowAnnually,
      paymentPeriodShowMonthly: values.paymentPeriodShowMonthly,
      paymentPeriodShowCantAfford: values.paymentPeriodShowCantAfford,
      paymentMonths: values.paymentMonths,
      allowTeacherExpenses: values.allowTeacherExpenses,
      requireQuranRecording: values.requireQuranRecording,
      tvRules: values.tvRules,
      staff: values.staff,
      quickLinks: values.quickLinks,
    }

    const [infoResult, settingsResult] = await Promise.all([
      updateInfo.mutateAsync(infoPayload),
      updateSettings.mutateAsync(settingsPayload),
    ])
    if (infoResult.success && settingsResult.success) reset(values)
  }

  return (
    <FormProvider {...form}>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Paramètres de l&apos;école</h1>
          <ContactSupportDialog />
        </div>

        {/* Two-column layout — la colonne droite est bien plus courte que la gauche (13 sections
            vs 3) ; sans stretch+sticky elle s'arrête net et laisse un grand vide crème avant la
            barre de sauvegarde collée en bas. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-stretch">
          {/* ── Left column ── */}
          <div className="space-y-5">
            <OperationsSection />
            <SchoolDaysSection />
            <IdentitySection />
            <ContactSection />
            <RoomsSection />
            <ClassPeriodsSection />
            <GradeLevelsSection />
            <SchoolStaffSection />
            <QuickLinksSection />
            <SubmissionsSection />
            <TvRulesSection />
            <ImportSection />
            <DangerZoneSection />
          </div>

          {/* ── Right column — reste visible pendant que la gauche défile plus loin ──
              La cellule de grille est étirée (items-stretch) à la hauteur de la colonne
              gauche ; sticky ancre alors le contenu (top-aligné) en haut de cette cellule
              tant que son bas n'a pas rejoint la colonne gauche. */}
          <div className="space-y-5 lg:sticky lg:top-6">
            <LogoSection school={school} />
            <CalendarSection />
            <FinancialSection />
          </div>
        </div>
      </div>

      <StickySaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSubmit(onSubmit)}
      />
    </FormProvider>
  )
}

// ── Barre de sauvegarde globale — collée en bas, désactivée sans modification ──
function StickySaveBar({
  isDirty, isSaving, onSave,
}: {
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-white px-6 py-3 flex justify-end shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      <Button
        onClick={onSave}
        disabled={!isDirty || isSaving}
        className="bg-[#c2440f] hover:bg-[#a33a0d] text-white font-medium gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="h-4 w-4" />
        {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </Button>
    </div>
  )
}

// ── 1. Opérations scolaires ───────────────────────────────────────────────────
function OperationsSection() {
  const { watch, setValue } = useFormContext<SchoolSettingsFormValues>()
  const academicYear = watch('academicYear')
  const trimester    = watch('currentTrimester')
  const allowReg     = watch('allowNewRegistrations')
  const examT1Open   = watch('examPeriodT1Open')
  const examT2Open   = watch('examPeriodT2Open')
  const examT3Open   = watch('examPeriodT3Open')

  const examOpen = trimester === 1 ? examT1Open : trimester === 2 ? examT2Open : examT3Open
  const examField = trimester === 1 ? 'examPeriodT1Open' : trimester === 2 ? 'examPeriodT2Open' : 'examPeriodT3Open'

  return (
    <Section icon={Settings} title="Opérations scolaires">
      <p className="text-xs text-muted-foreground -mt-2">
        Définissez l&apos;année académique et le trimestre en cours, puis activez l&apos;inscription et l&apos;accès aux examens.
      </p>

      {/* Année académique + navigation */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Année académique</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const [s, e] = academicYear.split('-').map(Number)
              if (s && e) setValue('academicYear', `${s - 1}-${e - 1}`, { shouldDirty: true })
            }}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:border-[#c2440f] hover:text-[#c2440f] transition-colors text-sm font-bold"
          >‹</button>
          <Input
            value={academicYear}
            onChange={e => setValue('academicYear', e.target.value, { shouldDirty: true })}
            placeholder="2025-2026"
            className="h-9 text-sm text-center font-medium flex-1"
          />
          <button
            type="button"
            onClick={() => {
              const [s, e] = academicYear.split('-').map(Number)
              if (s && e) setValue('academicYear', `${s + 1}-${e + 1}`, { shouldDirty: true })
            }}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:border-[#c2440f] hover:text-[#c2440f] transition-colors text-sm font-bold"
          >›</button>
        </div>
      </div>

      {/* Trimestre — 3 boutons toggle */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Trimestre</Label>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('currentTrimester', t, { shouldDirty: true })}
              className={cn(
                'flex-1 h-9 rounded-lg border text-sm font-medium transition-colors',
                trimester === t
                  ? 'bg-[#c2440f] border-[#c2440f] text-white'
                  : 'bg-white border-border text-muted-foreground hover:border-[#c2440f] hover:text-[#c2440f]'
              )}
            >
              Trimestre {t}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles — réagissent au trimestre sélectionné */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <label className={cn(
          'flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-colors',
          allowReg ? 'border-[#c2440f]/40 bg-[#fdf6f0]' : 'border-border bg-white'
        )}>
          <input
            type="checkbox"
            checked={allowReg}
            onChange={e => setValue('allowNewRegistrations', e.target.checked, { shouldDirty: true })}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[#c2440f]"
          />
          <div>
            <p className="text-sm font-medium leading-snug">
              Autoriser les nouvelles inscriptions pour {academicYear}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Autoriser les nouvelles inscriptions d&apos;élèves
            </p>
          </div>
        </label>

        <label className={cn(
          'flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-colors',
          examOpen ? 'border-[#c2440f]/40 bg-[#fdf6f0]' : 'border-border bg-white'
        )}>
          <input
            type="checkbox"
            checked={examOpen}
            onChange={e => setValue(examField, e.target.checked, { shouldDirty: true })}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[#c2440f]"
          />
          <div>
            <p className="text-sm font-medium leading-snug">
              Ouvrir les examens pour Trimestre {trimester} {academicYear}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Activer l&apos;affichage des examens et notes dans les portails parents et enseignants
            </p>
          </div>
        </label>
      </div>
    </Section>
  )
}

// ── 2. Jours de classe ────────────────────────────────────────────────────────
function SchoolDaysSection() {
  const { watch, setValue } = useFormContext<SchoolSettingsFormValues>()
  const days = watch('schoolDays')

  function toggle(day: string) {
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    setValue('schoolDays', next, { shouldDirty: true })
  }

  return (
    <Section icon={Clock} title="Jours de classe">
      <p className="text-xs text-muted-foreground">Jours où l&apos;école est ouverte</p>
      <div className="flex gap-2 flex-wrap">
        {DAYS.map(d => (
          <button
            key={d.key}
            type="button"
            onClick={() => toggle(d.key)}
            className={cn(
              'h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
              days.includes(d.key)
                ? 'bg-[#c2440f] border-[#c2440f] text-white'
                : 'bg-white border-border text-muted-foreground hover:border-[#c2440f] hover:text-[#c2440f]'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </Section>
  )
}

// ── 3. Identité de l'école ───────────────────────────────────────────────────
function IdentitySection() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<SchoolSettingsFormValues>()

  return (
    <Section icon={BookOpen} title="Identité de l'école">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nom de l&apos;école</Label>
          <Input
            {...register('name', { required: "Le nom est requis" })}
            placeholder="École Al-Nour"
            className="h-9 text-sm"
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Langue par défaut</Label>
            <Select
              value={watch('defaultLanguage')}
              onValueChange={v => v && setValue('defaultLanguage', v, { shouldDirty: true })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue>
                  {(v: string) => LANGUAGES.find(l => l.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fuseau horaire</Label>
            <Select
              value={watch('timezone')}
              onValueChange={v => v && setValue('timezone', v, { shouldDirty: true })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue>
                  {(v: string) => TIMEZONES.find(t => t.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── 4. Contact ────────────────────────────────────────────────────────────────
function ContactSection() {
  const { register } = useFormContext<SchoolSettingsFormValues>()

  return (
    <Section icon={Phone} title="Contact">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input {...register('contactEmail')} placeholder="contact@ecole.fr" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Téléphone
            </Label>
            <Input {...register('phone')} placeholder="+33 1 23 45 67 89" className="h-9 text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Adresse
          </Label>
          <Input {...register('address')} placeholder="12 rue des Lilas, 69000 Lyon" className="h-9 text-sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" /> Site web
            </Label>
            <Input {...register('website')} placeholder="https://..." className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Facebook
            </Label>
            <Input {...register('facebook')} placeholder="url ou @handle" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Instagram
            </Label>
            <Input {...register('instagram')} placeholder="url ou @handle" className="h-9 text-sm" />
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── 5. Salles de classe ────────────────────────────────────────────────────────
function RoomsSection() {
  const { control } = useFormContext<SchoolSettingsFormValues>()
  const [newRoom, setNewRoom] = useState('')

  return (
    <Controller
      control={control}
      name="rooms"
      render={({ field }) => {
        function addRoom() {
          const trimmed = newRoom.trim()
          if (!trimmed || field.value.includes(trimmed)) return
          field.onChange([...field.value, trimmed])
          setNewRoom('')
        }
        function removeRoom(room: string) {
          field.onChange(field.value.filter(r => r !== room))
        }

        return (
          <Section icon={Users} title="Salles de classe">
            <div className="flex gap-2">
              <Input
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRoom() } }}
                placeholder="Ex : Salle A, Room 1..."
                className="h-9 text-sm flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={addRoom}
                disabled={!newRoom.trim()}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {field.value.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {field.value.map(room => (
                  <span
                    key={room}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm font-medium"
                  >
                    {room}
                    <button
                      type="button"
                      onClick={() => removeRoom(room)}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucune salle définie</p>
            )}
          </Section>
        )
      }}
    />
  )
}

// ── 6. Emploi du temps (Périodes) ─────────────────────────────────────────────
function ClassPeriodsSection() {
  const { control } = useFormContext<SchoolSettingsFormValues>()
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '' })

  return (
    <Controller
      control={control}
      name="classPeriods"
      render={({ field }) => {
        function addPeriod() {
          if (!form.name || !form.startTime || !form.endTime) return
          field.onChange([
            ...field.value,
            { id: nanoid(), name: form.name, startTime: form.startTime, endTime: form.endTime },
          ])
          setForm({ name: '', startTime: '', endTime: '' })
        }
        function removePeriod(id: string) {
          field.onChange(field.value.filter(p => p.id !== id))
        }

        return (
          <Section icon={Clock} title="Emploi du temps — Périodes">
            <p className="text-xs text-muted-foreground">Définissez les créneaux horaires de la journée</p>

            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nom</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="8h30 - 9h30"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Début</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="h-9 text-sm w-28"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fin</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="h-9 text-sm w-28"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addPeriod}
                disabled={!form.name || !form.startTime || !form.endTime}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-9 px-3 mb-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {field.value.length > 0 ? (
              <div className="space-y-2">
                {field.value.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.startTime} – {p.endTime}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePeriod(p.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucune période définie</p>
            )}
          </Section>
        )
      }}
    />
  )
}

// ── 7. Niveaux scolaires ──────────────────────────────────────────────────────
function GradeLevelsSection() {
  const { control } = useFormContext<SchoolSettingsFormValues>()
  const [newLevel, setNewLevel] = useState('')

  return (
    <Controller
      control={control}
      name="gradeLevels"
      render={({ field }) => {
        function addLevel() {
          const trimmed = newLevel.trim()
          if (!trimmed || field.value.includes(trimmed)) return
          field.onChange([...field.value, trimmed])
          setNewLevel('')
        }
        function removeLevel(level: string) {
          field.onChange(field.value.filter(l => l !== level))
        }

        return (
          <Section icon={BookOpen} title="Niveaux scolaires">
            {/* Orange badge chips — matching reference */}
            {field.value.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {field.value.map(level => (
                  <span
                    key={level}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c2440f] text-white text-sm font-medium"
                  >
                    <GripVertical className="h-3 w-3 opacity-60" />
                    {level}
                    <button
                      type="button"
                      onClick={() => removeLevel(level)}
                      className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input */}
            <Input
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLevel() } }}
              placeholder="Saisissez le niveau et appuyez sur Entrée (ex. Pré-maternelle, Maternelle, CP)"
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ces niveaux apparaîtront dans les formulaires d&apos;inscription. Appuyez sur Entrée pour ajouter chaque niveau.
            </p>
          </Section>
        )
      }}
    />
  )
}

// ── 7b. School Staff ──────────────────────────────────────────────────────────
function SchoolStaffSection() {
  const { control } = useFormContext<SchoolSettingsFormValues>()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')

  return (
    <Controller
      control={control}
      name="staff"
      render={({ field }) => {
        function addPerson() {
          if (!newName.trim()) return
          field.onChange([
            ...field.value,
            { id: nanoid(), name: newName.trim(), role: newRole.trim() },
          ])
          setNewName('')
          setNewRole('')
          setAdding(false)
        }
        function removePerson(id: string) {
          field.onChange(field.value.filter(m => m.id !== id))
        }

        return (
          <Section icon={Users} title="School Staff">
            <div className="flex items-center justify-between -mt-2 mb-1">
              <p className="text-xs text-muted-foreground">List of school admins and staff members with their roles.</p>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-xs font-medium text-[#c2440f] hover:underline whitespace-nowrap ml-3"
              >
                Add Person
              </button>
            </div>

            {/* Existing staff rows */}
            <div className="space-y-2">
              {field.value.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-white">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <span className="flex-1 text-sm font-medium">{m.name}</span>
                  <span className="text-sm text-muted-foreground">{m.role}</span>
                  <button
                    type="button"
                    onClick={() => removePerson(m.id)}
                    className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add form */}
            {adding && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#c2440f]/40 bg-[#c2440f]/5">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <Input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="h-8 text-sm flex-1"
                />
                <Input
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}
                  placeholder="e.g. Principal, Secretary"
                  className="h-8 text-sm flex-1 border-[#c2440f]/40 focus-visible:border-[#c2440f]"
                />
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewName(''); setNewRole('') }}
                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            {field.value.length === 0 && !adding && (
              <p className="text-xs text-muted-foreground italic">Aucun membre du staff défini</p>
            )}
          </Section>
        )
      }}
    />
  )
}

// ── 8. Liens rapides ──────────────────────────────────────────────────────────
function QuickLinksSection() {
  const { control } = useFormContext<SchoolSettingsFormValues>()
  const [newRow, setNewRow] = useState<{ label: string; url: string } | null>(null)

  return (
    <Controller
      control={control}
      name="quickLinks"
      render={({ field }) => {
        function addLink() {
          if (!newRow || !newRow.label.trim()) return
          field.onChange([...field.value, { id: nanoid(), label: newRow.label.trim(), url: newRow.url.trim() }])
          setNewRow(null)
        }
        function removeLink(id: string) {
          field.onChange(field.value.filter(l => l.id !== id))
        }
        function updateLink(id: string, key: 'label' | 'url', value: string) {
          field.onChange(field.value.map(l => l.id === id ? { ...l, [key]: value } : l))
        }

        return (
          <div className="bg-white rounded-xl border border-border p-5 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-[#c2440f]" />
                <h2 className="font-semibold text-sm text-foreground">Liens rapides</h2>
              </div>
              <button
                type="button"
                onClick={() => setNewRow({ label: '', url: '' })}
                className="text-xs font-medium text-[#c2440f] hover:underline"
              >
                + Ajouter un lien
              </button>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Liens personnalisés pour la barre latérale de votre tableau de bord.
            </p>

            {/* Existing link rows — inline edit */}
            {field.value.length > 0 && (
              <div className="space-y-2">
                {/* Column headers (shown once) */}
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-1">
                  <div className="w-5" />
                  <span className="text-xs text-muted-foreground font-medium">Étiquette</span>
                  <span className="text-xs text-muted-foreground font-medium">URL</span>
                  <div className="w-5" />
                </div>
                {field.value.map(l => (
                  <div key={l.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <Input
                      value={l.label}
                      onChange={e => updateLink(l.id, 'label', e.target.value)}
                      placeholder="ex. Manuel de l'élève"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={l.url}
                      onChange={e => updateLink(l.id, 'url', e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(l.id)}
                      className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New link row */}
            {newRow && (
              <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <Input
                  autoFocus
                  value={newRow.label}
                  onChange={e => setNewRow(r => r ? { ...r, label: e.target.value } : r)}
                  placeholder="ex. Manuel de l'élève"
                  className="h-8 text-sm"
                />
                <Input
                  value={newRow.url}
                  onChange={e => setNewRow(r => r ? { ...r, url: e.target.value } : r)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                  placeholder="https://..."
                  className="h-8 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setNewRow(null)}
                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            {field.value.length === 0 && !newRow && (
              <p className="text-xs text-muted-foreground italic">Aucun lien rapide défini</p>
            )}
          </div>
        )
      }}
    />
  )
}

// ── 9. Soumissions ────────────────────────────────────────────────────────────
function SubmissionsSection() {
  const { watch, setValue } = useFormContext<SchoolSettingsFormValues>()
  const allowExpenses = watch('allowTeacherExpenses')
  const requireQuran  = watch('requireQuranRecording')

  return (
    <Section icon={FileSpreadsheet} title="Soumissions">
      <div className="space-y-3">
        <CheckRow
          checked={allowExpenses}
          onChange={v => setValue('allowTeacherExpenses', v, { shouldDirty: true })}
          label="Autoriser les demandes de remboursement"
          sub="Les enseignants peuvent soumettre des demandes de dépenses via leur portail"
        />
        <CheckRow
          checked={requireQuran}
          onChange={v => setValue('requireQuranRecording', v, { shouldDirty: true })}
          label="Exiger un enregistrement Coran"
          sub="Les parents doivent soumettre un audio de récitation Coran lors de l'inscription"
        />
      </div>
    </Section>
  )
}

// ── 10. Règles TV ─────────────────────────────────────────────────────────────
function TvRulesSection() {
  const { control } = useFormContext<SchoolSettingsFormValues>()
  const [form, setForm] = useState({ emoji: '', title: '', description: '' })

  return (
    <Controller
      control={control}
      name="tvRules"
      render={({ field }) => {
        function addRule() {
          if (!form.title.trim()) return
          field.onChange([
            ...field.value,
            { id: nanoid(), emoji: form.emoji || '📌', title: form.title.trim(), description: form.description.trim() },
          ])
          setForm({ emoji: '', title: '', description: '' })
        }
        function removeRule(id: string) {
          field.onChange(field.value.filter(r => r.id !== id))
        }

        return (
          <Section icon={Tv2} title="Règles — Mode TV">
            <p className="text-xs text-muted-foreground">Règles affichées sur l&apos;écran TV de l&apos;école</p>

            <div className="grid grid-cols-[auto_1fr_2fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Emoji</Label>
                <Input
                  value={form.emoji}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  placeholder="📌"
                  className="h-9 text-sm w-16 text-center"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Titre</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Règle..."
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Détail..."
                  className="h-9 text-sm"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addRule}
                disabled={!form.title.trim()}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {field.value.length > 0 ? (
              <div className="space-y-2">
                {field.value.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{r.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRule(r.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucune règle définie</p>
            )}
          </Section>
        )
      }}
    />
  )
}

// ── 11. Import section ────────────────────────────────────────────────────────
function ImportSection() {
  const [studentsOpen, setStudentsOpen] = useState(false)
  const [teachersOpen, setTeachersOpen] = useState(false)

  return (
    <Section icon={FileSpreadsheet} title="Import en masse">
      <ImportExcelDialog open={studentsOpen} onOpenChange={setStudentsOpen} type="students" />
      <ImportExcelDialog open={teachersOpen} onOpenChange={setTeachersOpen} type="teachers" />

      <div className="space-y-4">
        {/* Élèves */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Import d&apos;élèves</p>
              <p className="text-xs text-muted-foreground">Importez plusieurs élèves à partir d&apos;un fichier Excel</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setStudentsOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              Importer des élèves
            </Button>
          </div>
        </div>

        {/* Enseignants */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Import d&apos;enseignants</p>
              <p className="text-xs text-muted-foreground">Importez plusieurs enseignants à partir d&apos;un fichier Excel</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setTeachersOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              Importer des enseignants
            </Button>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── 12. Zone de danger ────────────────────────────────────────────────────────
function DangerZoneSection() {
  return (
    <Section icon={AlertTriangle} title="Zone de danger">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-red-900">Démarrer une nouvelle année académique</p>
          <p className="text-xs text-red-700 mt-1">
            Cette action archivera les classes, réinitialisera les présences et les notes.
            Les données seront conservées dans l&apos;historique mais ne seront plus actives.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-100"
          onClick={() => toast.info('Utilisez la page "Nouvelle année" pour ce processus')}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Démarrer une nouvelle année
        </Button>
      </div>
    </Section>
  )
}

// ── RIGHT COLUMN ──────────────────────────────────────────────────────────────

// ── Logo — upload instantané, hors du formulaire groupé ────────────────────────
function LogoSection({ school }: { school: School }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadSchoolLogo()

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target?.result as string
      upload.mutate({ base64, fileName: file.name })
    }
    reader.readAsDataURL(file)
  }, [upload])

  return (
    <Section icon={Upload} title="Logo de l'école">
      <div className="flex flex-col items-center gap-3">
        <div className="h-24 w-24 rounded-xl border border-border flex items-center justify-center bg-muted/30 overflow-hidden">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          {upload.isPending ? 'Téléversement...' : 'Changer le logo'}
        </Button>
        <p className="text-xs text-muted-foreground">PNG ou JPG, max 2 Mo</p>
      </div>
    </Section>
  )
}

// ── Calendrier ────────────────────────────────────────────────────────────────
function CalendarSection() {
  const { watch, setValue } = useFormContext<SchoolSettingsFormValues>()
  const t1      = watch('trimester1StartDate') ?? ''
  const t2      = watch('trimester2StartDate') ?? ''
  const t3      = watch('trimester3StartDate') ?? ''
  const yearEnd = watch('yearEndDate') ?? ''

  const rows: { label: string; value: string; onChange: (v: string) => void }[] = [
    {
      label: 'Date de début : Trimestre 1',
      value: t1,
      onChange: v => {
        setValue('trimester1StartDate', v || null, { shouldDirty: true })
        setValue('yearStartDate', v || null, { shouldDirty: true }) // kept in sync for attendance stats
      },
    },
    { label: 'Date de début : Trimestre 2', value: t2, onChange: v => setValue('trimester2StartDate', v || null, { shouldDirty: true }) },
    { label: 'Date de début : Trimestre 3', value: t3, onChange: v => setValue('trimester3StartDate', v || null, { shouldDirty: true }) },
    { label: "Date de fin de l'année scolaire", value: yearEnd, onChange: v => setValue('yearEndDate', v || null, { shouldDirty: true }) },
  ]

  return (
    <Section icon={Clock} title="Calendrier">
      <p className="text-xs text-muted-foreground -mt-2">
        Définissez les dates de début de chaque trimestre et la fin d&apos;année.
      </p>
      <div className="space-y-2.5">
        {rows.map(({ label, value, onChange }) => (
          <div key={label} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              type="date"
              value={value}
              onChange={e => onChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Finances ──────────────────────────────────────────────────────────────────
function PeriodToggleCard({
  checked, onChange, label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-2.5 rounded-xl border-2 p-3.5 cursor-pointer transition-colors',
        checked ? 'border-green-500/40 bg-green-50' : 'border-border bg-white'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className={cn(
        'mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0',
        checked ? 'bg-green-600' : 'border border-border'
      )}>
        {checked && <Check className="h-3 w-3 text-white" />}
      </span>
      <span className="text-sm font-medium leading-snug">{label}</span>
    </label>
  )
}

function FinancialSection() {
  const { register, watch, setValue, control } = useFormContext<SchoolSettingsFormValues>()
  const newModeRef = useRef<HTMLInputElement>(null)
  const newOptionRef = useRef<HTMLInputElement>(null)
  const [newMode, setNewMode] = useState('')
  const [newOption, setNewOption] = useState('')

  const showTrimesters = watch('paymentPeriodShowTrimesters')
  const showAnnually    = watch('paymentPeriodShowAnnually')
  const showMonthly     = watch('paymentPeriodShowMonthly')
  const showCantAfford  = watch('paymentPeriodShowCantAfford')
  const paymentMonths   = watch('paymentMonths')

  function toggleMonth(key: string) {
    const next = paymentMonths.includes(key) ? paymentMonths.filter(m => m !== key) : [...paymentMonths, key]
    setValue('paymentMonths', next, { shouldDirty: true })
  }

  return (
    <Section icon={Settings} title="Paramètres financiers">
      <p className="text-xs text-muted-foreground -mt-2">
        Configurez les modes de paiement et les options financières de votre école.
      </p>

      <div className="space-y-5">

        {/* Options de période de paiement */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Options de période de paiement</Label>
          <p className="text-xs text-muted-foreground">
            Choisissez les options de période de paiement qui apparaissent lors de l&apos;enregistrement d&apos;un paiement. Les trimestres sont affichés par défaut.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <PeriodToggleCard
              checked={showTrimesters}
              onChange={v => setValue('paymentPeriodShowTrimesters', v, { shouldDirty: true })}
              label="Afficher les trimestres (ex. Trimestre 1, Trimestre 2)"
            />
            <PeriodToggleCard
              checked={showAnnually}
              onChange={v => setValue('paymentPeriodShowAnnually', v, { shouldDirty: true })}
              label="Afficher Annuellement"
            />
            <PeriodToggleCard
              checked={showMonthly}
              onChange={v => setValue('paymentPeriodShowMonthly', v, { shouldDirty: true })}
              label="Afficher Mensuel"
            />
            <PeriodToggleCard
              checked={showCantAfford}
              onChange={v => setValue('paymentPeriodShowCantAfford', v, { shouldDirty: true })}
              label='Afficher "Je ne peux vraiment pas me le permettre"'
            />
          </div>
        </div>

        {/* Mois de paiement */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Mois de paiement</Label>
            <Popover>
              <PopoverTrigger
                aria-label="Comment fonctionnent les paiements mensuels"
                className="text-muted-foreground hover:text-[#c2440f] transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </PopoverTrigger>
              <PopoverContent>
                Les paiements mensuels sont dus chaque mois sélectionné ci-dessous. Un mois non sélectionné n&apos;apparaîtra jamais comme impayé.
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">Comment fonctionnent les paiements mensuels</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Mois du calendrier pour lesquels les frais de scolarité sont facturés (par ex. exclut juillet/août pour les vacances d&apos;été). Utilisé pour déterminer quels mois s&apos;affichent comme impayés pour les paiements mensuels. Par défaut, les 12 mois si aucun n&apos;est sélectionné.
          </p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
            {MONTHS.map(m => (
              <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentMonths.includes(m.key)}
                  onChange={() => toggleMonth(m.key)}
                  className="h-4 w-4 rounded border-border accent-[#c2440f]"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        {/* Options financières */}
        <Controller
          control={control}
          name="financialOptions"
          render={({ field }) => {
            function addOption() {
              const trimmed = newOption.trim()
              if (!trimmed) return
              field.onChange([...field.value, trimmed])
              setNewOption('')
            }
            function removeOption(opt: string) {
              field.onChange(field.value.filter(o => o !== opt))
            }

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Options financières</Label>
                  <button
                    type="button"
                    className="text-xs text-[#c2440f] hover:underline font-medium"
                    onClick={() => newOptionRef.current?.focus()}
                    title="Ajouter une option"
                  >
                    + Ajouter une option
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Options telles que les dispenses, remises ou arrangements de paiement spéciaux affichés dans la boîte de dialogue budgétaire.
                </p>
                <div className="space-y-1.5">
                  {field.value.map(opt => (
                    <div key={opt} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-white">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-sm">{opt}</span>
                      <button
                        type="button"
                        onClick={() => removeOption(opt)}
                        className="text-muted-foreground hover:text-red-600 transition-colors text-base leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={newOptionRef}
                    value={newOption}
                    onChange={e => setNewOption(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                    placeholder='Ex : "No, thank you!", "Supply 100% waived"'
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addOption}
                    disabled={!newOption.trim()}
                    className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-8 px-2.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          }}
        />

        {/* URL infos paiement */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Lien d&apos;informations de paiement</Label>
          <Input
            {...register('paymentInfoUrl')}
            placeholder="https://..."
            className="h-9 text-sm"
          />
        </div>

        {/* Modes de paiement — list with drag handles */}
        <Controller
          control={control}
          name="paymentModes"
          render={({ field }) => {
            function addMode() {
              const t = newMode.trim()
              if (!t || field.value.includes(t)) return
              field.onChange([...field.value, t])
              setNewMode('')
            }
            function removeMode(mode: string) {
              field.onChange(field.value.filter(m => m !== mode))
            }

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Modes de paiement</Label>
                  <button
                    type="button"
                    onClick={() => newModeRef.current?.focus()}
                    className="text-xs text-[#c2440f] hover:underline font-medium"
                    title="Ajouter un mode"
                  >
                    + Ajouter un mode
                  </button>
                </div>
                <div className="space-y-1.5">
                  {field.value.map(mode => (
                    <div key={mode} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-white">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-sm">{mode}</span>
                      <button
                        type="button"
                        onClick={() => removeMode(mode)}
                        className="text-muted-foreground hover:text-red-600 transition-colors text-base leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {/* Inline add new mode */}
                <div className="flex gap-2">
                  <Input
                    ref={newModeRef}
                    value={newMode}
                    onChange={e => setNewMode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMode() } }}
                    placeholder="Nouveau mode de paiement..."
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addMode}
                    disabled={!newMode.trim()}
                    className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-8 px-2.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          }}
        />

        {/* Taux horaire */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Taux horaire de l&apos;enseignant (Salaires)</Label>
          <p className="text-xs text-muted-foreground leading-snug">
            Taux horaire par défaut pour tous les enseignants rémunérés. Un taux individuel peut être défini pour chaque enseignant depuis la page Enseignants et aura la priorité. Mettre à 0 pour désactiver.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="0.00"
              className="h-9 text-sm pl-7"
              {...register('teacherHourlyRate', {
                setValueAs: v => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n },
              })}
            />
          </div>
        </div>

        {/* Stripe — non connecté (placeholder, comme l'onglet Paiements de Dépenses) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-white border border-amber-200 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Stripe — Aucun compte connecté</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connectez Stripe pour accepter les paiements numériques des parents (scolarité, frais, dons).
              </p>
            </div>
          </div>
          <Button type="button" disabled className="bg-indigo-600 text-white gap-2 opacity-60 cursor-not-allowed">
            <CreditCard className="h-4 w-4" /> Connecter Stripe
          </Button>
        </div>
      </div>
    </Section>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-7 w-56 bg-muted rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">
          {[130, 100, 160, 140, 90].map((h, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5">
              <div className="h-4 w-40 bg-muted rounded mb-4" />
              <div style={{ height: h }} className="bg-muted/50 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          {[120, 220, 280].map((h, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5">
              <div className="h-4 w-32 bg-muted rounded mb-4" />
              <div style={{ height: h }} className="bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
