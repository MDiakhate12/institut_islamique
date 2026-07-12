'use client'

import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ClipboardList, X, Search, BookOpen, RefreshCw, FileText, Paperclip, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateHomework, useUpdateHomework } from '@/modules/homework/homework.hooks'
import { SURAHS } from '@/modules/homework/surahs.data'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { HomeworkItem } from '@/modules/homework/homework.types'

type Props = {
  open: boolean
  onClose: () => void
  classId: string
  homework?: HomeworkItem | null
}

type Tab = 'toute_la_classe' | 'par_eleve'
type RevisionSurah = { name: string; arabic: string }

export default function HomeworkDialog({ open, onClose, classId, homework }: Props) {
  const isEdit = !!homework

  const [tab, setTab] = useState<Tab>('toute_la_classe')

  const [hasHifz, setHasHifz]     = useState(false)
  const [hasRevision, setHasRevision] = useState(false)

  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null)
  const [isFullSurah, setIsFullSurah] = useState(true)
  const [fromVerse, setFromVerse] = useState<number | ''>(1)
  const [toVerse, setToVerse] = useState<number | ''>(1)

  const [revisionSearch, setRevisionSearch] = useState('')
  const [revisionSurahs, setRevisionSurahs] = useState<RevisionSurah[]>([])

  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const create = useCreateHomework()
  const update = useUpdateHomework(classId)

  useEffect(() => {
    if (!open) return
    if (isEdit && homework) {
      setHasHifz(!!homework.surahName)
      setHasRevision((homework.revisionSurahs ?? []).length > 0)
      const surah = homework.surahName
        ? SURAHS.find(s => s.name === homework.surahName) ?? null
        : null
      setSelectedSurahNumber(surah?.number ?? null)
      setIsFullSurah(homework.isFullSurah)
      setFromVerse(homework.fromVerse ?? 1)
      setToVerse(homework.toVerse ?? 1)
      setRevisionSurahs((homework.revisionSurahs as RevisionSurah[]) ?? [])
      setDescription(homework.description ?? '')
      setFile(null)
    } else {
      setHasHifz(false)
      setHasRevision(false)
      setSelectedSurahNumber(null)
      setIsFullSurah(true)
      setFromVerse(1)
      setToVerse(1)
      setRevisionSurahs([])
      setDescription('')
      setFile(null)
    }
  }, [open, isEdit, homework])

  const selectedSurah = selectedSurahNumber
    ? SURAHS.find(s => s.number === selectedSurahNumber) ?? null
    : null

  function handleSurahSelect(value: string | null) {
    if (!value) return
    const num = parseInt(value)
    const surah = SURAHS.find(s => s.number === num) ?? null
    setSelectedSurahNumber(num)
    if (surah) {
      setFromVerse(1)
      setToVerse(surah.verses)
      setIsFullSurah(true)
    }
  }

  const filteredSurahs = revisionSearch.trim()
    ? SURAHS.filter(s =>
        s.name.toLowerCase().includes(revisionSearch.toLowerCase()) ||
        s.arabic.includes(revisionSearch)
      )
    : SURAHS

  function toggleRevisionSurah(surah: { name: string; arabic: string }) {
    setRevisionSurahs(prev => {
      const exists = prev.find(s => s.name === surah.name)
      return exists ? prev.filter(s => s.name !== surah.name) : [...prev, surah]
    })
  }

  async function handleSubmit() {
    if (!hasHifz && !hasRevision) {
      toast.error('Activez au moins un type de devoir (Hifz ou Révision)')
      return
    }
    if (hasHifz && !selectedSurah) {
      toast.error('Sélectionnez une sourate pour le Hifz')
      return
    }
    if (hasRevision && revisionSurahs.length === 0) {
      toast.error('Sélectionnez au moins une sourate pour la révision')
      return
    }

    const payload = {
      classId,
      hasNewSurah: hasHifz,
      surahName:   hasHifz ? selectedSurah?.name : undefined,
      surahArabic: hasHifz ? selectedSurah?.arabic : undefined,
      isFullSurah: hasHifz ? isFullSurah : false,
      fromVerse:   hasHifz && !isFullSurah ? (fromVerse as number) : undefined,
      toVerse:     hasHifz && !isFullSurah ? (toVerse as number) : undefined,
      hasRevision,
      revisionSurahs: hasRevision ? revisionSurahs : [],
      description: description.trim() || undefined,
    }

    if (isEdit && homework) {
      const result = await update.mutateAsync({ id: homework.id, input: payload })
      if (!result.success) { toast.error(result.error); return }
      toast.success('Devoir mis à jour')
    } else {
      const result = await create.mutateAsync(payload)
      if (!result.success) { toast.error(result.error); return }
      toast.success('Devoir ajouté')
    }
    onClose()
  }

  const isPending = create.isPending || update.isPending

  const hifzRevisionBlock = (
    <div className="space-y-3">
      {/* Hifz section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Hifz</span>
          </div>
          <Toggle checked={hasHifz} onChange={setHasHifz} />
        </div>

        {hasHifz && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Sourate :</label>
              <Select
                value={selectedSurahNumber?.toString() ?? ''}
                onValueChange={handleSurahSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une sourate" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {SURAHS.map(s => (
                    <SelectItem key={s.number} value={s.number.toString()}>
                      {s.name} — {s.arabic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600 w-5 flex-shrink-0">De</label>
              <Input
                type="number"
                placeholder="Verset..."
                min={1}
                max={selectedSurah?.verses ?? 999}
                value={isFullSurah ? '' : fromVerse}
                disabled={isFullSurah}
                onChange={e => setFromVerse(parseInt(e.target.value) || '')}
                className="flex-1 h-8 text-sm"
              />
              <label className="text-xs font-medium text-gray-600 flex-shrink-0">À</label>
              <Input
                type="number"
                placeholder="Ayah..."
                min={1}
                max={selectedSurah?.verses ?? 999}
                value={isFullSurah ? '' : toVerse}
                disabled={isFullSurah}
                onChange={e => setToVerse(parseInt(e.target.value) || '')}
                className="flex-1 h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="full-surah"
                checked={isFullSurah}
                onCheckedChange={(v) => setIsFullSurah(!!v)}
                className="data-checked:bg-[#c2440f] data-checked:border-[#c2440f]"
              />
              <label htmlFor="full-surah" className="text-sm text-gray-700 cursor-pointer">
                Sourate complète
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Révision section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Révision</span>
          </div>
          <Toggle checked={hasRevision} onChange={setHasRevision} />
        </div>

        {hasRevision && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Rechercher des sourates..."
                value={revisionSearch}
                onChange={e => setRevisionSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {revisionSurahs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {revisionSurahs.length} sourate(s) sélectionnée(s)
                  </span>
                  <button
                    onClick={() => setRevisionSurahs([])}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Effacer la sélection
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {revisionSurahs.map(s => (
                    <span
                      key={s.name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs"
                    >
                      {s.name}
                      <button onClick={() => toggleRevisionSurah(s)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-50">
              {filteredSurahs.map(s => {
                const checked = !!revisionSurahs.find(r => r.name === s.name)
                return (
                  <label
                    key={s.number}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRevisionSurah(s)}
                    />
                    <span className="text-sm text-gray-700 flex-1">{s.name}</span>
                    <span className="text-sm text-gray-400">{s.arabic}</span>
                  </label>
                )
              })}
              {filteredSurahs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="sm:max-w-[480px] w-[480px] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7a4f30, #5c3820)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-base">
              {isEdit ? 'Modifier le devoir' : 'Ajouter un devoir'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => setTab('toute_la_classe')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              tab === 'toute_la_classe'
                ? 'text-[#c2440f] border-b-2 border-[#c2440f] bg-orange-50/60'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Toute la classe
          </button>
          <button
            onClick={() => setTab('par_eleve')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors',
              tab === 'par_eleve'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/60'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Par élève
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'toute_la_classe' ? (
            hifzRevisionBlock
          ) : (
            <div className="space-y-4">
              {/* Group 1 */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <span className="text-sm font-semibold text-gray-900">Groupe 1</span>
                  </div>
                  <button className="text-xs text-purple-600 font-medium flex items-center gap-1 hover:text-purple-700">
                    + Ajouter des élèves
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-3">
                  {hifzRevisionBlock}
                </div>
              </div>

              <button className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1">
                + Ajouter un autre groupe
              </button>
            </div>
          )}

          {/* S'APPLIQUE À TOUS divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              S&apos;APPLIQUE À TOUS
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Notes supplémentaires */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Notes supplémentaires</span>
            </div>
            <div className="px-4 py-3">
              <Textarea
                rows={3}
                placeholder="Toute instruction ou note supplémentaire..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="text-sm resize-none border-0 shadow-none p-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Fichier joint */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
              <Paperclip className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-gray-900">
                Joindre un fichier <span className="text-gray-400 font-normal">(Optionnel)</span>
              </span>
            </div>
            <div className="px-4 py-3">
              {isEdit && homework?.fileName && !file && (
                <p className="text-xs text-gray-500 mb-2">
                  Fichier actuel : <span className="font-medium">{homework.fileName}</span>
                </p>
              )}
              {file && (
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-700 truncate flex-1">{file.name}</span>
                  <button
                    onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Retirer
                  </button>
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-blue-200 rounded-lg py-2.5 text-sm text-blue-600 font-medium hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Cliquez pour choisir un fichier
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.ppt,.pptx"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-white flex justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-2 min-w-44"
            style={{ backgroundColor: '#c2440f' }}
          >
            <ClipboardList className="w-4 h-4" />
            {isPending
              ? (isEdit ? 'Mise à jour...' : 'Ajout...')
              : (isEdit ? 'Mettre à jour le devoir' : 'Ajouter un devoir')
            }
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none',
        checked ? 'bg-gray-900' : 'bg-gray-300',
      )}
    >
      <span className={cn(
        'absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-0',
      )} />
    </button>
  )
}
