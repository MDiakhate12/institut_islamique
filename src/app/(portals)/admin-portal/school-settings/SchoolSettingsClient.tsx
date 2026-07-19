'use client'

import { useState, useRef, useCallback, useId } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import {
  useSchool,
  useUpdateSchoolInfo,
  useUpdateSchoolSettings,
  useUploadSchoolLogo,
} from '@/modules/school/school.hooks'
import type { School, SchoolSettings, TvRule, ClassPeriod, QuickLink, StaffMember } from '@/modules/school/school.types'
import type { UpdateSchoolInfoInput } from '@/modules/school/school.schema'
import { ContactSupportDialog } from './ContactSupportDialog'
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
} from 'lucide-react'
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

const PAYMENT_MODES = ['Cash', 'Check', 'PayPal', 'Venmo', 'No Fees']

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

// ── Save button ───────────────────────────────────────────────────────────────
function SaveBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <Button
        size="sm"
        onClick={onClick}
        disabled={loading}
        className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5"
      >
        <Save className="h-3.5 w-3.5" />
        {loading ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Paramètres de l&apos;école</h1>
        <ContactSupportDialog />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* ── Left column ── */}
        <div className="space-y-5">
          <OperationsSection school={school} />
          <SchoolDaysSection school={school} />
          <IdentitySection school={school} />
          <ContactSection school={school} />
          <RoomsSection school={school} />
          <ClassPeriodsSection school={school} />
          <GradeLevelsSection school={school} />
          <SchoolStaffSection school={school} />
          <QuickLinksSection school={school} />
          <SubmissionsSection school={school} />
          <TvRulesSection school={school} />
          <ImportSection />
          <DangerZoneSection />
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">
          <LogoSection school={school} />
          <CalendarSection school={school} />
          <FinancialSection school={school} />
        </div>
      </div>
    </div>
  )
}

// ── 1. Opérations scolaires ───────────────────────────────────────────────────
function OperationsSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [academicYear, setAcademicYear] = useState(s.academicYear ?? '2025-2026')
  const [trimester, setTrimester]       = useState<1|2|3>(s.currentTrimester ?? 1)
  const [allowReg, setAllowReg]         = useState(s.allowNewRegistrations ?? true)
  const [examT1Open, setExamT1Open]     = useState(s.examPeriodT1Open ?? false)
  const [examT2Open, setExamT2Open]     = useState(s.examPeriodT2Open ?? false)
  const [examT3Open, setExamT3Open]     = useState(s.examPeriodT3Open ?? false)

  const update = useUpdateSchoolSettings()

  const examOpen    = trimester === 1 ? examT1Open : trimester === 2 ? examT2Open : examT3Open
  const setExamOpen = trimester === 1 ? setExamT1Open : trimester === 2 ? setExamT2Open : setExamT3Open

  function save() {
    update.mutate({
      academicYear,
      currentTrimester: trimester,
      allowNewRegistrations: allowReg,
      examPeriodT1Open: examT1Open,
      examPeriodT2Open: examT2Open,
      examPeriodT3Open: examT3Open,
    })
  }

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
              if (s && e) setAcademicYear(`${s - 1}-${e - 1}`)
            }}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:border-[#c2440f] hover:text-[#c2440f] transition-colors text-sm font-bold"
          >‹</button>
          <Input
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            placeholder="2025-2026"
            className="h-9 text-sm text-center font-medium flex-1"
          />
          <button
            type="button"
            onClick={() => {
              const [s, e] = academicYear.split('-').map(Number)
              if (s && e) setAcademicYear(`${s + 1}-${e + 1}`)
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
              onClick={() => setTrimester(t)}
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
            onChange={e => setAllowReg(e.target.checked)}
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
            onChange={e => setExamOpen(e.target.checked)}
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

      <SaveBtn loading={update.isPending} onClick={save} />
    </Section>
  )
}

// ── 2. Jours de classe ────────────────────────────────────────────────────────
function SchoolDaysSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [days, setDays] = useState<string[]>(s.schoolDays ?? ['sunday', 'saturday'])
  const update = useUpdateSchoolSettings()

  function toggle(day: string) {
    const next = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day]
    setDays(next)
    update.mutate({ schoolDays: next })
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
      {update.isPending && (
        <p className="text-xs text-muted-foreground">Sauvegarde...</p>
      )}
    </Section>
  )
}

// ── 3. Identité de l'école ───────────────────────────────────────────────────
function IdentitySection({ school }: { school: School }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<UpdateSchoolInfoInput>({
      defaultValues: {
        name:            school.name,
        defaultLanguage: school.defaultLanguage ?? 'fr',
        timezone:        school.timezone ?? 'UTC',
        contactEmail:    school.contactEmail ?? '',
        phone:           school.phone ?? '',
        address:         school.address ?? '',
        website:         school.website ?? '',
        facebook:        school.facebook ?? '',
        instagram:       school.instagram ?? '',
      },
    })

  const updateInfo = useUpdateSchoolInfo()

  function onSubmit(data: UpdateSchoolInfoInput) {
    updateInfo.mutate(data)
  }

  return (
    <Section icon={BookOpen} title="Identité de l'école">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nom de l&apos;école</Label>
          <Input
            {...register('name')}
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
              value={watch('defaultLanguage') ?? 'fr'}
              onValueChange={v => v && setValue('defaultLanguage', v)}
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
              value={watch('timezone') ?? 'UTC'}
              onValueChange={v => v && setValue('timezone', v)}
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

      <SaveBtn loading={updateInfo.isPending} onClick={handleSubmit(onSubmit)} />
    </Section>
  )
}

// ── 4. Contact ────────────────────────────────────────────────────────────────
function ContactSection({ school }: { school: School }) {
  const { register, handleSubmit } = useForm<UpdateSchoolInfoInput>({
    defaultValues: {
      name:         school.name,
      contactEmail: school.contactEmail ?? '',
      phone:        school.phone ?? '',
      address:      school.address ?? '',
      website:      school.website ?? '',
      facebook:     school.facebook ?? '',
      instagram:    school.instagram ?? '',
    },
  })

  const updateInfo = useUpdateSchoolInfo()

  function onSubmit(data: UpdateSchoolInfoInput) {
    updateInfo.mutate({ ...data, name: school.name })
  }

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

      <SaveBtn loading={updateInfo.isPending} onClick={handleSubmit(onSubmit)} />
    </Section>
  )
}

// ── 5. Salles de classe ────────────────────────────────────────────────────────
function RoomsSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [rooms, setRooms] = useState<string[]>(s.rooms ?? [])
  const [newRoom, setNewRoom] = useState('')
  const update = useUpdateSchoolSettings()

  function addRoom() {
    const trimmed = newRoom.trim()
    if (!trimmed || rooms.includes(trimmed)) return
    const next = [...rooms, trimmed]
    setRooms(next)
    setNewRoom('')
    update.mutate({ rooms: next })
  }

  function removeRoom(room: string) {
    const next = rooms.filter(r => r !== room)
    setRooms(next)
    update.mutate({ rooms: next })
  }

  return (
    <Section icon={Users} title="Salles de classe">
      <div className="flex gap-2">
        <Input
          value={newRoom}
          onChange={e => setNewRoom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addRoom()}
          placeholder="Ex : Salle A, Room 1..."
          className="h-9 text-sm flex-1"
        />
        <Button
          size="sm"
          onClick={addRoom}
          disabled={!newRoom.trim()}
          className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-9 px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {rooms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {rooms.map(room => (
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
}

// ── 6. Emploi du temps (Périodes) ─────────────────────────────────────────────
function ClassPeriodsSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [periods, setPeriods] = useState<ClassPeriod[]>(s.classPeriods ?? [])
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '' })
  const update = useUpdateSchoolSettings()

  function addPeriod() {
    if (!form.name || !form.startTime || !form.endTime) return
    const next: ClassPeriod[] = [
      ...periods,
      { id: nanoid(), name: form.name, startTime: form.startTime, endTime: form.endTime },
    ]
    setPeriods(next)
    setForm({ name: '', startTime: '', endTime: '' })
    update.mutate({ classPeriods: next })
  }

  function removePeriod(id: string) {
    const next = periods.filter(p => p.id !== id)
    setPeriods(next)
    update.mutate({ classPeriods: next })
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
          size="sm"
          onClick={addPeriod}
          disabled={!form.name || !form.startTime || !form.endTime}
          className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-9 px-3 mb-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {periods.length > 0 ? (
        <div className="space-y-2">
          {periods.map(p => (
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
}

// ── 7. Niveaux scolaires ──────────────────────────────────────────────────────
function GradeLevelsSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [levels, setLevels] = useState<string[]>(s.gradeLevels ?? [])
  const [newLevel, setNewLevel] = useState('')
  const update = useUpdateSchoolSettings()

  function addLevel() {
    const trimmed = newLevel.trim()
    if (!trimmed || levels.includes(trimmed)) return
    const next = [...levels, trimmed]
    setLevels(next)
    setNewLevel('')
    update.mutate({ gradeLevels: next })
  }

  function removeLevel(level: string) {
    const next = levels.filter(l => l !== level)
    setLevels(next)
    update.mutate({ gradeLevels: next })
  }

  return (
    <Section icon={BookOpen} title="Niveaux scolaires">
      {/* Orange badge chips — matching reference */}
      {levels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-1">
          {levels.map(level => (
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
}

// ── 7b. School Staff ──────────────────────────────────────────────────────────
function SchoolStaffSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [staff, setStaff] = useState<StaffMember[]>(s.staff ?? [])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const update = useUpdateSchoolSettings()

  function addPerson() {
    if (!newName.trim()) return
    const next: StaffMember[] = [
      ...staff,
      { id: nanoid(), name: newName.trim(), role: newRole.trim() },
    ]
    setStaff(next)
    setNewName('')
    setNewRole('')
    setAdding(false)
    update.mutate({ staff: next })
  }

  function removePerson(id: string) {
    const next = staff.filter(m => m.id !== id)
    setStaff(next)
    update.mutate({ staff: next })
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
        {staff.map(m => (
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
            onKeyDown={e => e.key === 'Enter' && addPerson()}
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

      {staff.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic">Aucun membre du staff défini</p>
      )}
    </Section>
  )
}

// ── 8. Liens rapides ──────────────────────────────────────────────────────────
function QuickLinksSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [links, setLinks] = useState<QuickLink[]>(s.quickLinks ?? [])
  const [newRow, setNewRow] = useState<{ label: string; url: string } | null>(null)
  const update = useUpdateSchoolSettings()

  function addLink() {
    if (!newRow || !newRow.label.trim()) return
    const next: QuickLink[] = [...links, { id: nanoid(), label: newRow.label.trim(), url: newRow.url.trim() }]
    setLinks(next)
    setNewRow(null)
    update.mutate({ quickLinks: next })
  }

  function removeLink(id: string) {
    const next = links.filter(l => l.id !== id)
    setLinks(next)
    update.mutate({ quickLinks: next })
  }

  function updateLink(id: string, field: 'label' | 'url', value: string) {
    const next = links.map(l => l.id === id ? { ...l, [field]: value } : l)
    setLinks(next)
  }

  function saveLink() {
    update.mutate({ quickLinks: links })
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
      {links.length > 0 && (
        <div className="space-y-2">
          {/* Column headers (shown once) */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 px-1">
            <div className="w-5" />
            <span className="text-xs text-muted-foreground font-medium">Étiquette</span>
            <span className="text-xs text-muted-foreground font-medium">URL</span>
            <div className="w-5" />
          </div>
          {links.map(l => (
            <div key={l.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <Input
                value={l.label}
                onChange={e => updateLink(l.id, 'label', e.target.value)}
                onBlur={saveLink}
                placeholder="ex. Manuel de l'élève"
                className="h-8 text-sm"
              />
              <Input
                value={l.url}
                onChange={e => updateLink(l.id, 'url', e.target.value)}
                onBlur={saveLink}
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
            onKeyDown={e => e.key === 'Enter' && addLink()}
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

      {links.length === 0 && !newRow && (
        <p className="text-xs text-muted-foreground italic">Aucun lien rapide défini</p>
      )}
    </div>
  )
}

// ── 9. Soumissions ────────────────────────────────────────────────────────────
function SubmissionsSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [allowExpenses, setAllowExpenses]   = useState(s.allowTeacherExpenses ?? true)
  const [requireQuran, setRequireQuran]     = useState(s.requireQuranRecording ?? false)
  const update = useUpdateSchoolSettings()

  function save() {
    update.mutate({ allowTeacherExpenses: allowExpenses, requireQuranRecording: requireQuran })
  }

  return (
    <Section icon={FileSpreadsheet} title="Soumissions">
      <div className="space-y-3">
        <CheckRow
          checked={allowExpenses}
          onChange={setAllowExpenses}
          label="Autoriser les demandes de remboursement"
          sub="Les enseignants peuvent soumettre des demandes de dépenses via leur portail"
        />
        <CheckRow
          checked={requireQuran}
          onChange={setRequireQuran}
          label="Exiger un enregistrement Coran"
          sub="Les parents doivent soumettre un audio de récitation Coran lors de l'inscription"
        />
      </div>
      <SaveBtn loading={update.isPending} onClick={save} />
    </Section>
  )
}

// ── 10. Règles TV ─────────────────────────────────────────────────────────────
function TvRulesSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [rules, setRules] = useState<TvRule[]>(s.tvRules ?? [])
  const [form, setForm] = useState({ emoji: '', title: '', description: '' })
  const update = useUpdateSchoolSettings()

  function addRule() {
    if (!form.title.trim()) return
    const next: TvRule[] = [
      ...rules,
      { id: nanoid(), emoji: form.emoji || '📌', title: form.title.trim(), description: form.description.trim() },
    ]
    setRules(next)
    setForm({ emoji: '', title: '', description: '' })
    update.mutate({ tvRules: next })
  }

  function removeRule(id: string) {
    const next = rules.filter(r => r.id !== id)
    setRules(next)
    update.mutate({ tvRules: next })
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
          size="sm"
          onClick={addRule}
          disabled={!form.title.trim()}
          className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-9 px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map(r => (
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
}

// ── 11. Import section ────────────────────────────────────────────────────────
function ImportSection() {
  return (
    <Section icon={FileSpreadsheet} title="Import en masse">
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
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => toast.info('Téléchargement du modèle bientôt disponible')}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Télécharger le modèle
            </Button>
            <Button
              size="sm"
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5 text-xs"
              onClick={() => toast.info("L'import par fichier sera disponible prochainement")}
            >
              <Upload className="h-3.5 w-3.5" />
              Importer
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
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => toast.info('Téléchargement du modèle bientôt disponible')}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Télécharger le modèle
            </Button>
            <Button
              size="sm"
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5 text-xs"
              onClick={() => toast.info("L'import par fichier sera disponible prochainement")}
            >
              <Upload className="h-3.5 w-3.5" />
              Importer
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

// ── Logo ──────────────────────────────────────────────────────────────────────
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
function CalendarSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  // T1 start = year start (unified — yearStartDate kept in sync for backward compat)
  const [t1, setT1] = useState(s.trimester1StartDate ?? s.yearStartDate ?? '')
  const [t2, setT2] = useState(s.trimester2StartDate ?? '')
  const [t3, setT3] = useState(s.trimester3StartDate ?? '')
  const [yearEnd, setYearEnd] = useState(s.yearEndDate ?? '')
  const update = useUpdateSchoolSettings()

  function save() {
    update.mutate({
      trimester1StartDate: t1 || null,
      trimester2StartDate: t2 || null,
      trimester3StartDate: t3 || null,
      yearStartDate:       t1 || null, // kept in sync for attendance stats
      yearEndDate:         yearEnd || null,
    })
  }

  const rows = [
    { label: 'Date de début : Trimestre 1', value: t1, set: setT1 },
    { label: 'Date de début : Trimestre 2', value: t2, set: setT2 },
    { label: 'Date de début : Trimestre 3', value: t3, set: setT3 },
    { label: "Date de fin de l'année scolaire", value: yearEnd, set: setYearEnd },
  ]

  return (
    <Section icon={Clock} title="Calendrier">
      <p className="text-xs text-muted-foreground -mt-2">
        Définissez les dates de début de chaque trimestre et la fin d&apos;année.
      </p>
      <div className="space-y-2.5">
        {rows.map(({ label, value, set }) => (
          <div key={label} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              type="date"
              value={value}
              onChange={e => set(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>
      <SaveBtn loading={update.isPending} onClick={save} />
    </Section>
  )
}

// ── Finances ──────────────────────────────────────────────────────────────────
function FinancialSection({ school }: { school: School }) {
  const s = school.settings as SchoolSettings
  const [hourlyRate, setHourlyRate]         = useState(String(s.teacherHourlyRate ?? 0))
  const [paymentInfoUrl, setPaymentInfoUrl] = useState(s.paymentInfoUrl ?? '')
  const [paymentModes, setPaymentModes]     = useState<string[]>(
    s.paymentModes?.length ? s.paymentModes : ['Venmo', 'Cash', 'Check', 'PayPal', 'No Fees']
  )
  const [newMode, setNewMode]               = useState('')
  const [financialOptions, setFinancialOptions] = useState<string[]>(s.financialOptions ?? [])
  const [newOption, setNewOption]           = useState('')
  const update = useUpdateSchoolSettings()

  function addMode() {
    const t = newMode.trim()
    if (!t || paymentModes.includes(t)) return
    const next = [...paymentModes, t]
    setPaymentModes(next)
    setNewMode('')
  }

  function removeMode(mode: string) {
    setPaymentModes(prev => prev.filter(m => m !== mode))
  }

  function addOption() {
    const trimmed = newOption.trim()
    if (!trimmed) return
    setFinancialOptions(prev => [...prev, trimmed])
    setNewOption('')
  }

  function removeOption(opt: string) {
    setFinancialOptions(prev => prev.filter(o => o !== opt))
  }

  function save() {
    update.mutate({
      teacherHourlyRate:  parseFloat(hourlyRate) || 0,
      paymentInfoUrl,
      paymentModes,
      financialOptions,
    })
  }

  return (
    <Section icon={Settings} title="Paramètres financiers">
      <div className="space-y-5">

        {/* Taux horaire */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground leading-snug">
            Taux horaire par défaut pour les enseignants payés (€). Un taux individuel peut être défini pour chaque enseignant depuis la page Enseignants et aura la priorité. Mettre à 0 pour désactiver.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={hourlyRate}
              onChange={e => setHourlyRate(e.target.value)}
              placeholder="0.00"
              className="h-9 text-sm pl-7"
            />
          </div>
        </div>

        {/* URL infos paiement */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Lien d&apos;informations de paiement</Label>
          <Input
            value={paymentInfoUrl}
            onChange={e => setPaymentInfoUrl(e.target.value)}
            placeholder="https://..."
            className="h-9 text-sm"
          />
        </div>

        {/* Modes de paiement — list with drag handles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Modes de paiement</Label>
            <button
              type="button"
              onClick={() => setNewMode('')}
              className="text-xs text-[#c2440f] hover:underline font-medium"
              title="Ajouter un mode"
            >
              + Ajouter un mode
            </button>
          </div>
          <div className="space-y-1.5">
            {paymentModes.map(mode => (
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
              value={newMode}
              onChange={e => setNewMode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMode()}
              placeholder="Nouveau mode de paiement..."
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={addMode}
              disabled={!newMode.trim()}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-8 px-2.5"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Options financières */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Options financières</Label>
            <button
              type="button"
              className="text-xs text-[#c2440f] hover:underline font-medium"
              onClick={() => {}}
              title="Ajouter une option"
            >
              + Ajouter une option
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Options telles que les dispenses, remises ou arrangements de paiement spéciaux affichés dans la boîte de dialogue budgétaire.
          </p>
          <div className="space-y-1.5">
            {financialOptions.map(opt => (
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
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOption()}
              placeholder='Ex : "No, thank you!", "Supply 100% waived"'
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              onClick={addOption}
              disabled={!newOption.trim()}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white h-8 px-2.5"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Global save — prominent CTA matching reference */}
      <div className="pt-2">
        <Button
          onClick={save}
          disabled={update.isPending}
          className="w-full bg-[#c2440f] hover:bg-[#a33a0d] text-white font-medium"
        >
          {update.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
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
