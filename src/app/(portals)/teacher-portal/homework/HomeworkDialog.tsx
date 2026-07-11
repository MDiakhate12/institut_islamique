'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ClipboardList, X, Search, Upload, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

type RevisionSurah = { name: string; arabic: string }

export default function HomeworkDialog({ open, onClose, classId, homework }: Props) {
  const isEdit = !!homework

  const [hasNewSurah, setHasNewSurah] = useState(false)
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
      setHasNewSurah(!!homework.surahName)
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
      setHasNewSurah(false)
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
    if (!hasNewSurah && !hasRevision) {
      toast.error('Cochez au moins un type de devoir')
      return
    }
    if (hasNewSurah && !selectedSurah) {
      toast.error('Sélectionnez une sourate')
      return
    }
    if (hasRevision && revisionSurahs.length === 0) {
      toast.error('Sélectionnez au moins une sourate pour la révision')
      return
    }

    const payload = {
      classId,
      hasNewSurah,
      surahName:   hasNewSurah ? selectedSurah?.name : undefined,
      surahArabic: hasNewSurah ? selectedSurah?.arabic : undefined,
      isFullSurah: hasNewSurah ? isFullSurah : false,
      fromVerse:   hasNewSurah && !isFullSurah ? (fromVerse as number) : undefined,
      toVerse:     hasNewSurah && !isFullSurah ? (toVerse as number) : undefined,
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 sticky top-0 bg-white z-10">
          <div className="bg-orange-100 rounded-full p-2">
            <ClipboardList className="w-5 h-5 text-orange-700" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              {isEdit ? 'Modifier le devoir' : 'Ajouter un devoir'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Nouveau devoir ─── */}
          <div className={cn(
            'rounded-lg border p-4 space-y-4 transition-colors',
            hasNewSurah ? 'border-orange-200 bg-orange-50' : 'border-gray-200',
          )}>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-new-surah"
                checked={hasNewSurah}
                onCheckedChange={(v) => setHasNewSurah(!!v)}
              />
              <Label htmlFor="has-new-surah" className="font-semibold text-gray-900 cursor-pointer">
                Nouveau devoir
              </Label>
            </div>

            {hasNewSurah && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-700">Sourate</Label>
                  <Select
                    value={selectedSurahNumber?.toString() ?? ''}
                    onValueChange={handleSurahSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une sourate" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {SURAHS.map(s => (
                        <SelectItem key={s.number} value={s.number.toString()}>
                          {s.name} — {s.arabic} ({s.verses} v.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSurah && (
                  <>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="full-surah"
                        checked={isFullSurah}
                        onCheckedChange={(v) => setIsFullSurah(!!v)}
                      />
                      <Label htmlFor="full-surah" className="text-sm cursor-pointer">
                        Sourate complète ({selectedSurah.verses} versets)
                      </Label>
                    </div>

                    {!isFullSurah && (
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-sm text-gray-700">De (verset)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={selectedSurah.verses}
                            value={fromVerse}
                            onChange={e => setFromVerse(parseInt(e.target.value) || '')}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Label className="text-sm text-gray-700">À (verset)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={selectedSurah.verses}
                            value={toVerse}
                            onChange={e => setToVerse(parseInt(e.target.value) || '')}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Révision ─── */}
          <div className={cn(
            'rounded-lg border p-4 space-y-4 transition-colors',
            hasRevision ? 'border-blue-200 bg-blue-50' : 'border-gray-200',
          )}>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-revision"
                checked={hasRevision}
                onCheckedChange={(v) => setHasRevision(!!v)}
              />
              <Label htmlFor="has-revision" className="font-semibold text-gray-900 cursor-pointer">
                Révision
              </Label>
            </div>

            {hasRevision && (
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher des sourates..."
                    value={revisionSearch}
                    onChange={e => setRevisionSearch(e.target.value)}
                    className="pl-9"
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

                <div className="max-h-44 overflow-y-auto border border-blue-100 rounded-md bg-white divide-y divide-gray-50">
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

          {/* ── Notes ─── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Notes supplémentaires</Label>
            <Textarea
              rows={3}
              placeholder="Notes ou instructions supplémentaires..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* ── Fichier joint ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Joindre un fichier (Optionnel)
            </Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg px-4 py-4 flex items-center gap-3 cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
            >
              {file ? (
                <Paperclip className="w-5 h-5 text-orange-600 flex-shrink-0" />
              ) : (
                <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="text-sm">
                {file ? (
                  <span className="text-gray-700 font-medium">{file.name}</span>
                ) : isEdit && homework?.fileName ? (
                  <span className="text-gray-500">
                    Fichier actuel : {homework.fileName} — cliquer pour remplacer
                  </span>
                ) : (
                  <span className="text-gray-400">Image, PDF ou PPT — max 25 MB</span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.ppt,.pptx"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {file && (
              <button
                onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Retirer le fichier
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            <X className="w-4 h-4 mr-1" />
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-2"
            style={{ backgroundColor: '#c2440f' }}
          >
            <ClipboardList className="w-4 h-4" />
            {isPending
              ? (isEdit ? 'Mise à jour...' : 'Ajout...')
              : (isEdit ? 'Mettre à jour le devoir' : 'Ajouter un devoir')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
