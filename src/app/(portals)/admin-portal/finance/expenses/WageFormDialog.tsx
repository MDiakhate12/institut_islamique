'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WageFormFields } from '@/components/shared/WageFormFields/WageFormFields'
import { useSchool } from '@/modules/school/school.hooks'
import { useTeacherOptions, useTeacherClassOptions, useLogHours } from '@/modules/wages/wages.hooks'

export function WageFormDialog() {
  const [open, setOpen] = useState(false)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')

  const { data: school } = useSchool()
  const { data: teachers = [] } = useTeacherOptions()
  const { data: classes = [] } = useTeacherClassOptions(teacherId)
  const logHours = useLogHours()

  const rate = school?.settings?.teacherHourlyRate ?? 0
  const hoursNum = parseInt(hours, 10) || 0

  function reset() {
    setTeacherId(null)
    setClassId(null)
    setDate(new Date().toISOString().slice(0, 10))
    setHours('')
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) reset()
  }

  async function handleSubmit() {
    if (!teacherId || !hoursNum) return
    const result = await logHours.mutateAsync({ teacherId, classId, date, hoursWorked: hoursNum })
    if (result.success) handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <Button className="bg-[#c2440f] hover:bg-[#a33a0d] text-white gap-1.5">
          <Clock className="h-4 w-4" /> Enregistrer les heures
        </Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#c2440f]" /> Enregistrer les heures
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Enregistrez vos heures d&apos;enseignement pour la paie</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <WageFormFields
            showTeacherSelect
            teachers={teachers}
            teacherId={teacherId}
            onTeacherChange={id => { setTeacherId(id); setClassId(null) }}
            classes={classes}
            classId={classId}
            onClassChange={setClassId}
            hours={hours}
            onHoursChange={setHours}
            rate={rate}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
            <Button
              disabled={!teacherId || !hoursNum || logHours.isPending}
              onClick={handleSubmit}
              className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
            >
              Soumettre les heures
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
