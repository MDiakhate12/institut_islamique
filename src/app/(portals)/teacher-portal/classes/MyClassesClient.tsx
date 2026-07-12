'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, MapPin, Users, ClipboardList, BookMarked } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMyClasses } from '@/modules/teacher-classes/teacher-classes.hooks'
import type { MyClass } from '@/modules/teacher-classes/teacher-classes.types'
import SyllabusDialog from './SyllabusDialog'

type Props = {
  initialMyClasses: MyClass[]
}

const SUBJECT_COLORS: Record<string, string> = {
  QRN: 'bg-emerald-100 text-emerald-700',
  NUR: 'bg-blue-100 text-blue-700',
  ARA: 'bg-purple-100 text-purple-700',
  ISL: 'bg-amber-100 text-amber-700',
}

const CODE_COLORS: Record<string, string> = {
  QRN: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  NUR: 'bg-blue-50 text-blue-700 border border-blue-200',
  ARA: 'bg-purple-50 text-purple-700 border border-purple-200',
  ISL: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function MyClassesClient({ initialMyClasses }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [syllabusClass, setSyllabusClass] = useState<MyClass | null>(null)

  const { data: myClasses = initialMyClasses } = useMyClasses()

  const filtered = useMemo(() => {
    if (!search.trim()) return myClasses
    const q = search.toLowerCase()
    return myClasses.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.catalogCode.toLowerCase().includes(q) ||
      c.subjectCode.toLowerCase().includes(q)
    )
  }, [myClasses, search])

  const grouped = useMemo(() => {
    const map = new Map<string, MyClass[]>()
    for (const cls of filtered) {
      const key = cls.subjectCode || 'Autre'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(cls)
    }
    return map
  }, [filtered])

  return (
    <div className="flex flex-col bg-[#fdf6f0] min-h-screen">
      <div className="max-w-5xl mx-auto w-full px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-[#7a4f30]/10 rounded-xl p-2.5">
              <BookOpen className="h-6 w-6 text-[#c2440f]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#c2440f]">Mes Classes</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {myClasses.length} classe{myClasses.length !== 1 ? 's' : ''} qui vous sont attribuées
              </p>
            </div>
          </div>

          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher des classes..."
            className="w-56 bg-white border-border"
          />
        </div>

        {/* Content */}
        {myClasses.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-white p-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Aucune classe attribuée</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contactez votre administrateur pour être affecté à une classe.
            </p>
          </div>
        ) : grouped.size === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            Aucune classe ne correspond à la recherche.
          </div>
        ) : (
          <div className="space-y-8">
            {[...grouped.entries()].map(([subject, classes]) => (
              <div key={subject}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-foreground">{subject}</h2>
                  <span className="text-sm text-muted-foreground">
                    {classes.length} class{classes.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map(cls => (
                    <ClassCard
                      key={cls.classId}
                      cls={cls}
                      onAttendance={() => router.push('/teacher-portal/attendance')}
                      onHomework={() => router.push('/teacher-portal/homework')}
                      onSyllabus={() => setSyllabusClass(cls)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {syllabusClass && (
        <SyllabusDialog
          open={!!syllabusClass}
          onClose={() => setSyllabusClass(null)}
          className={syllabusClass.name}
          curriculum={syllabusClass.curriculum}
        />
      )}
    </div>
  )
}

function ClassCard({
  cls, onAttendance, onHomework, onSyllabus,
}: {
  cls: MyClass
  onAttendance: () => void
  onHomework: () => void
  onSyllabus: () => void
}) {
  const subjectColor = SUBJECT_COLORS[cls.subjectCode] ?? 'bg-gray-100 text-gray-700'
  const codeColor = CODE_COLORS[cls.subjectCode] ?? 'bg-gray-50 text-gray-700 border border-gray-200'

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <h3 className="font-bold text-sm text-foreground leading-snug">{cls.name}</h3>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', subjectColor)}>
          {cls.subjectCode}
        </span>
        {cls.catalogCode && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded', codeColor)}>
            {cls.catalogCode}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {cls.room && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {cls.room}
          </span>
        )}
        {cls.section && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Sec {cls.section}
          </span>
        )}
      </div>

      {cls.teacherName && (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-[#7a4f30] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{cls.teacherInitial ?? '?'}</span>
          </div>
          <span className="text-xs text-foreground">{cls.teacherName}</span>
        </div>
      )}

      <div className="mt-auto pt-1 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAttendance}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-foreground border border-border rounded-lg py-1.5 px-2 hover:bg-gray-50 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            Présence
          </button>
          <button
            onClick={onHomework}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-foreground border border-border rounded-lg py-1.5 px-2 hover:bg-gray-50 transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Devoirs
          </button>
        </div>
        <button
          onClick={onSyllabus}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-foreground border border-border rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
        >
          <BookMarked className="h-3.5 w-3.5" />
          Voir le programme
        </button>
      </div>
    </div>
  )
}
