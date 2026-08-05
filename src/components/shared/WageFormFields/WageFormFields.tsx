'use client'

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { TeacherOption, TeacherClassOption } from '@/modules/wages/wages.types'

interface Props {
  showTeacherSelect: boolean
  teachers: TeacherOption[]
  teacherId: string | null
  onTeacherChange: (id: string) => void
  classes: TeacherClassOption[]
  classId: string | null
  onClassChange: (id: string) => void
  hours: string
  onHoursChange: (v: string) => void
  rate: number
}

function classLabel(c: TeacherClassOption): string {
  return c.classCode ? `${c.classCode} — ${c.name}` : c.name
}

export function WageFormFields({
  showTeacherSelect, teachers, teacherId, onTeacherChange,
  classes, classId, onClassChange, hours, onHoursChange, rate,
}: Props) {
  const hoursNum = parseInt(hours, 10) || 0
  const amount = rate * hoursNum

  return (
    <>
      {showTeacherSelect && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Enseignant</label>
          <Select value={teacherId ?? undefined} onValueChange={v => v && onTeacherChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner un enseignant">
                {(v: string) => teachers.find(t => t.id === v)?.name ?? v}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {teachers.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1.5 block">Classe</label>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {showTeacherSelect ? 'Aucune classe assignée' : 'Aucune classe ne vous est assignée'}
          </p>
        ) : (
          <Select value={classId ?? undefined} onValueChange={v => v && onClassChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner une classe">
                {(v: string) => {
                  const c = classes.find(cl => cl.id === v)
                  return c ? classLabel(c) : v
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{classLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Heures travaillées</label>
        <Input type="number" min="1" value={hours} onChange={e => onHoursChange(e.target.value)} />
      </div>

      {rate === 0 ? (
        <p className="text-xs text-amber-600">Taux horaire non défini — contactez votre administrateur</p>
      ) : (
        <div className="rounded-lg bg-gray-50 p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Montant calculé</span>
          <span className="font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)}</span>
        </div>
      )}
    </>
  )
}
