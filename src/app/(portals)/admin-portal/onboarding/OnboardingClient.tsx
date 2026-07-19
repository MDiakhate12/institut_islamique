'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateSchoolInfoAction, updateSchoolSettingsAction } from '@/modules/school/school.actions'
import { useUploadSchoolLogo } from '@/modules/school/school.hooks'
import {
  CheckCircle, ChevronRight, School, CalendarDays, Sparkles,
  MapPin, Mail, Phone, Upload, BookOpen,
} from 'lucide-react'

const SCHOOL_DAYS = [
  { key: 'monday',    label: 'Lun' },
  { key: 'tuesday',   label: 'Mar' },
  { key: 'wednesday', label: 'Mer' },
  { key: 'thursday',  label: 'Jeu' },
  { key: 'friday',    label: 'Ven' },
  { key: 'saturday',  label: 'Sam' },
  { key: 'sunday',    label: 'Dim' },
]

interface Props {
  schoolId:    string
  initialName: string
}

export function OnboardingClient({ schoolId, initialName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)

  // Step 1 — School identity
  const [schoolName, setSchoolName]     = useState(initialName)
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone]               = useState('')
  const [address, setAddress]           = useState('')

  // Step 1 — Logo upload
  const fileRef    = useRef<HTMLInputElement>(null)
  const upload     = useUploadSchoolLogo()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const handleLogoFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target?.result as string
      setLogoPreview(base64)
      upload.mutate({ base64, fileName: file.name })
    }
    reader.readAsDataURL(file)
  }, [upload])

  // Step 2 — Academic setup
  const [academicYear, setAcademicYear]   = useState('2025-2026')
  const [currentTrimester, setTrimester] = useState<1 | 2 | 3>(1)
  const [allowReg, setAllowReg]           = useState(true)
  const [examT1Open, setExamT1Open]       = useState(false)
  const [examT2Open, setExamT2Open]       = useState(false)
  const [examT3Open, setExamT3Open]       = useState(false)

  const examOpen = currentTrimester === 1 ? examT1Open : currentTrimester === 2 ? examT2Open : examT3Open
  function setExamOpen(v: boolean) {
    if (currentTrimester === 1) setExamT1Open(v)
    else if (currentTrimester === 2) setExamT2Open(v)
    else setExamT3Open(v)
  }

  const [schoolDays, setSchoolDays] = useState<string[]>(['sunday', 'saturday'])
  const [roomInput, setRoomInput]   = useState('')
  const [rooms, setRooms]           = useState<string[]>([])

  function toggleDay(key: string) {
    setSchoolDays(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  function addRoom() {
    const v = roomInput.trim()
    if (v && !rooms.includes(v)) { setRooms(prev => [...prev, v]); setRoomInput('') }
  }

  async function handleStep1() {
    if (!schoolName.trim()) { toast.error('Le nom de l\'école est requis'); return }
    startTransition(async () => {
      const result = await updateSchoolInfoAction({ name: schoolName, contactEmail, phone, address })
      if (!result.success) { toast.error(result.error); return }
      setStep(2)
    })
  }

  async function handleStep2() {
    if (!academicYear.trim()) { toast.error('L\'année scolaire est requise'); return }
    if (schoolDays.length === 0) { toast.error('Sélectionnez au moins un jour de classe'); return }
    startTransition(async () => {
      const result = await updateSchoolSettingsAction({
        academicYear,
        currentTrimester,
        allowNewRegistrations: allowReg,
        examPeriodT1Open: examT1Open,
        examPeriodT2Open: examT2Open,
        examPeriodT3Open: examT3Open,
        schoolDays,
        rooms,
      })
      if (!result.success) { toast.error(result.error); return }
      setStep(3)
    })
  }

  async function handleComplete() {
    startTransition(async () => {
      const result = await updateSchoolSettingsAction({ onboardingCompleted: true } as Parameters<typeof updateSchoolSettingsAction>[0])
      if (!result.success) { toast.error(result.error); return }
      toast.success('Configuration terminée !')
      router.push('/admin-portal')
      router.refresh()
    })
  }

  const STEPS = [
    { n: 1, label: 'Identité', icon: School },
    { n: 2, label: 'Académique', icon: CalendarDays },
    { n: 3, label: 'Terminé', icon: Sparkles },
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#fdf6f0] flex items-start justify-center pt-10 px-4 pb-10">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="h-14 w-14 rounded-2xl bg-[#c2440f] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <School className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#5c3820]">Configuration de l'école</h1>
          <p className="text-sm text-muted-foreground mt-1">Quelques étapes pour préparer votre portail</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                step === s.n ? 'bg-[#c2440f] text-white shadow-md' :
                step > s.n  ? 'bg-green-100 text-green-700' :
                              'bg-white text-gray-400 border border-gray-200',
              )}>
                {step > s.n ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('w-8 h-px mx-1', step > s.n ? 'bg-green-300' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* ── Step 1: School identity + logo ── */}
          {step === 1 && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#7a4f30]">Identité de l'école</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Ces informations seront visibles dans l'application.</p>
              </div>

              {/* Logo upload */}
              <div className="flex items-center gap-5 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="h-20 w-20 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-gray-700">Logo de l'école</p>
                  <p className="text-xs text-gray-400">PNG ou JPG, max 2 Mo. Optionnel — vous pourrez le modifier plus tard.</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={upload.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-60"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {upload.isPending ? 'Téléversement…' : logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-gray-400" /> Nom de l'école *
                  </label>
                  <input
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="Association Islamique Al-Bayan"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" /> Email de contact
                    </label>
                    <input
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      type="email"
                      placeholder="contact@ecole.fr"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" /> Téléphone
                    </label>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      type="tel"
                      placeholder="0X XX XX XX XX"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" /> Adresse
                  </label>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="12 rue de la Paix, 69000 Lyon"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStep1}
                  disabled={isPending}
                  className="flex items-center gap-2 bg-[#c2440f] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#a33a0d] transition-colors disabled:opacity-60"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Opérations scolaires (conforme school-settings) ── */}
          {step === 2 && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#7a4f30]">Opérations scolaires</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Définissez l'année académique, le trimestre en cours, puis activez l'inscription et les examens.</p>
              </div>

              <div className="space-y-5">

                {/* Année académique avec navigation */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Année académique *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const [s, e] = academicYear.split('-').map(Number)
                        if (s && e) setAcademicYear(`${s - 1}-${e - 1}`)
                      }}
                      className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#c2440f] hover:text-[#c2440f] transition-colors text-sm font-bold"
                    >‹</button>
                    <input
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      placeholder="2025-2026"
                      className="flex-1 px-3 py-2.5 text-sm text-center font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const [s, e] = academicYear.split('-').map(Number)
                        if (s && e) setAcademicYear(`${s + 1}-${e + 1}`)
                      }}
                      className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#c2440f] hover:text-[#c2440f] transition-colors text-sm font-bold"
                    >›</button>
                  </div>
                </div>

                {/* Trimestre */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Trimestre en cours</label>
                  <div className="flex gap-2">
                    {([1, 2, 3] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTrimester(t)}
                        className={cn(
                          'flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all',
                          currentTrimester === t
                            ? 'bg-[#c2440f] text-white border-[#c2440f]'
                            : 'border-gray-200 text-gray-600 hover:border-[#c2440f] hover:text-[#c2440f]',
                        )}
                      >
                        Trimestre {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Checkboxes inscriptions + examens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={cn(
                    'flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-colors',
                    allowReg ? 'border-[#c2440f]/40 bg-[#fdf6f0]' : 'border-gray-200 bg-white'
                  )}>
                    <input
                      type="checkbox"
                      checked={allowReg}
                      onChange={e => setAllowReg(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#c2440f]"
                    />
                    <div>
                      <p className="text-sm font-medium leading-snug">
                        Autoriser les nouvelles inscriptions pour {academicYear}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Autoriser les nouvelles inscriptions d'élèves
                      </p>
                    </div>
                  </label>

                  <label className={cn(
                    'flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-colors',
                    examOpen ? 'border-[#c2440f]/40 bg-[#fdf6f0]' : 'border-gray-200 bg-white'
                  )}>
                    <input
                      type="checkbox"
                      checked={examOpen}
                      onChange={e => setExamOpen(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#c2440f]"
                    />
                    <div>
                      <p className="text-sm font-medium leading-snug">
                        Ouvrir les examens pour Trimestre {currentTrimester} {academicYear}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Activer l'affichage des examens et notes dans les portails parents et enseignants
                      </p>
                    </div>
                  </label>
                </div>

                {/* Jours de classe */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Jours de classe *</label>
                  <div className="flex gap-2 flex-wrap">
                    {SCHOOL_DAYS.map(d => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className={cn(
                          'h-9 px-3 text-sm font-medium rounded-lg border transition-all',
                          schoolDays.includes(d.key)
                            ? 'bg-[#c2440f] text-white border-[#c2440f]'
                            : 'border-gray-200 text-gray-600 hover:border-[#c2440f] hover:text-[#c2440f]',
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Salles */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Salles de classe</label>
                  <div className="flex gap-2">
                    <input
                      value={roomInput}
                      onChange={e => setRoomInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRoom())}
                      placeholder="ex: Salle 1, Salle A…"
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2440f]/20 focus:border-[#c2440f]"
                    />
                    <button
                      type="button"
                      onClick={addRoom}
                      className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                  {rooms.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {rooms.map(r => (
                        <span
                          key={r}
                          className="flex items-center gap-1.5 px-3 py-1 text-sm bg-[#fdf6f0] text-[#7a4f30] border border-[#f0dcc8] rounded-full"
                        >
                          {r}
                          <button
                            type="button"
                            onClick={() => setRooms(prev => prev.filter(x => x !== r))}
                            className="text-[#c2440f] hover:text-[#a33a0d] leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleStep2}
                  disabled={isPending}
                  className="flex items-center gap-2 bg-[#c2440f] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#a33a0d] transition-colors disabled:opacity-60"
                >
                  {isPending ? 'Sauvegarde…' : (
                    <>
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div className="p-8 space-y-6 text-center">
              <div className="space-y-3">
                <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-[#7a4f30]">L'école est prête !</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  La configuration de base est terminée. Vous pouvez maintenant accéder à votre portail et ajouter des enseignants, des élèves et des classes.
                </p>
              </div>

              <div className="bg-[#fdf6f0] rounded-xl border border-[#f0dcc8] p-5 text-left space-y-2">
                <p className="text-sm font-semibold text-[#7a4f30]">Prochaines étapes suggérées :</p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-[#c2440f]" /> Ajouter vos enseignants dans <strong>Enseignants</strong></li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-[#c2440f]" /> Créer vos classes depuis le <strong>Catalogue des classes</strong></li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-[#c2440f]" /> Configurer le calendrier académique</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-[#c2440f]" /> Personnaliser les paramètres avancés</li>
                </ul>
              </div>

              <button
                onClick={handleComplete}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-[#c2440f] text-white py-3 rounded-lg font-semibold hover:bg-[#a33a0d] transition-colors disabled:opacity-60 text-base"
              >
                {isPending ? 'Chargement…' : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Accéder au portail
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
