'use client'

import { useState, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClassOptions, useAddPinnedClass } from '@/modules/homework/homework.hooks'
import { toast } from 'sonner'
import type { ClassOption } from '@/modules/homework/homework.types'

type Props = {
  open: boolean
  onClose: () => void
}

const SUBJECT_LABELS: Record<string, string> = {
  QRN: 'Coran (QRN)',
  NUR: 'Nuraniyah (NUR)',
  ARA: 'Arabe (ARA)',
  ISL: 'Islamique (ISL)',
}

export default function AddClassDialog({ open, onClose }: Props) {
  const [subjectCode, setSubjectCode] = useState('')
  const [levelNumber, setLevelNumber] = useState('')
  const [classId, setClassId] = useState('')

  const { data: options = [] } = useClassOptions()
  const addPinned = useAddPinnedClass()

  const subjects = useMemo(() => {
    const codes = [...new Set(options.map(o => o.subjectCode).filter(Boolean))]
    return codes.sort()
  }, [options])

  const levels = useMemo(() => {
    if (!subjectCode) return []
    const nums = [...new Set(
      options
        .filter(o => o.subjectCode === subjectCode && o.levelNumber)
        .map(o => o.levelNumber as string)
    )]
    return nums.sort((a, b) => parseInt(a) - parseInt(b))
  }, [options, subjectCode])

  const sections = useMemo((): ClassOption[] => {
    if (!subjectCode) return []
    return options.filter(o => {
      if (o.subjectCode !== subjectCode) return false
      if (levelNumber && levelNumber !== 'all' && o.levelNumber !== levelNumber) return false
      return true
    })
  }, [options, subjectCode, levelNumber])

  function reset() {
    setSubjectCode('')
    setLevelNumber('')
    setClassId('')
  }

  async function handleAdd() {
    if (!classId) {
      toast.error('Veuillez sélectionner une classe')
      return
    }
    const result = await addPinned.mutateAsync(classId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Classe ajoutée')
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent showCloseButton={false} className="w-[480px] max-w-[95vw] p-0">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-amber-100 rounded-full p-2">
            <BookOpen className="w-5 h-5 text-amber-700" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Ajouter une classe
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">
            Sélectionnez une classe à épingler dans votre vue des devoirs.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="subject-select" className="text-sm font-medium text-gray-700">
              Type de matière
            </Label>
            <Select
              value={subjectCode}
              onValueChange={(v) => { if (v) { setSubjectCode(v); setLevelNumber(''); setClassId('') } }}
            >
              <SelectTrigger id="subject-select" className="w-full">
                <SelectValue placeholder="Sélectionner une matière" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(code => (
                  <SelectItem key={code} value={code}>
                    {SUBJECT_LABELS[code] ?? code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {levels.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="level-select" className="text-sm font-medium text-gray-700">
                Niveau
              </Label>
              <Select
                value={levelNumber}
                onValueChange={(v) => { if (v) { setLevelNumber(v); setClassId('') } }}
              >
                <SelectTrigger id="level-select" className="w-full">
                  <SelectValue placeholder="Sélectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  {levels.map(l => (
                    <SelectItem key={l} value={l}>Niveau {l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {sections.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="class-select" className="text-sm font-medium text-gray-700">
                Classe
              </Label>
              <Select value={classId} onValueChange={(v) => { if (v) setClassId(v) }}>
                <SelectTrigger id="class-select" className="w-full">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.catalogCode}{cls.section ? ` — Section ${cls.section}` : ''}
                      {cls.name ? ` (${cls.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {subjectCode && sections.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">
              Aucune classe disponible pour cette sélection.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => { reset(); onClose() }}
            disabled={addPinned.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!classId || addPinned.isPending}
            className="gap-2"
            style={{ backgroundColor: '#7a4f30' }}
          >
            <Plus className="w-4 h-4" />
            {addPinned.isPending ? 'Ajout...' : 'Ajouter la classe'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
