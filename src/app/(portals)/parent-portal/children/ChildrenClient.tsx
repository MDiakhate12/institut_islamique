'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useChildren } from '@/modules/parents/parents.hooks'
import type { ChildWithClasses, EnrolledClass } from '@/modules/parents/parents.types'
import { LinkChildModal } from './LinkChildModal'
import { UserPlus, Users, MapPin, User, BookOpen, CalendarCheck, BookMarked } from 'lucide-react'
import { cn } from '@/lib/utils'

// Couleur par code matière
const SUBJECT_COLORS: Record<string, string> = {
  QRN: 'bg-blue-100 text-blue-700',
  NUR: 'bg-purple-100 text-purple-700',
  ARB: 'bg-green-100 text-green-700',
  ISL: 'bg-amber-100 text-amber-700',
}

function SubjectBadge({ code }: { code: string }) {
  const cls = SUBJECT_COLORS[code] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold ${cls}`}>
      {code}
    </span>
  )
}

function ClassCard({ cls }: { cls: EnrolledClass }) {
  const sectionLabel = cls.section ? `Sec ${cls.section}` : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-[#c2440f]/30 hover:shadow-sm transition-all">
      <div className="p-4 space-y-3">
        {/* Name */}
        <p className="font-semibold text-[#7a4f30] leading-snug pr-2">{cls.className}</p>

        {/* Badges: subject code + level + section */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {cls.subjectCode && <SubjectBadge code={cls.subjectCode} />}
          {cls.levelNumber && (
            <span className="text-xs font-medium text-gray-600">{cls.levelNumber}</span>
          )}
          {sectionLabel && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              {sectionLabel}
            </span>
          )}
        </div>

        {/* Room + Teacher */}
        <div className="space-y-1">
          {cls.room && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>Salle : {cls.room}</span>
            </div>
          )}
          {cls.teacherName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Professeur : {cls.teacherName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
        <Link
          href={`/parent-portal/attendance?classId=${cls.classId}`}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 hover:text-[#c2440f] hover:bg-[#fdf6f0] transition-colors"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          Présence
        </Link>
        <Link
          href={`/parent-portal/homework?classId=${cls.classId}`}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 hover:text-[#c2440f] hover:bg-[#fdf6f0] transition-colors"
        >
          <BookMarked className="h-3.5 w-3.5" />
          Devoirs
        </Link>
      </div>

      {/* Programme link */}
      <div className="border-t border-gray-100 px-4 py-2">
        <Link
          href={`/parent-portal/catalog?classId=${cls.classId}`}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#c2440f] transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          Voir le programme
        </Link>
      </div>
    </div>
  )
}

function ChildClasses({ child }: { child: ChildWithClasses }) {
  if (child.classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-[#c2440f]/60" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">Aucune classe trouvée</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {child.firstName} n&apos;est inscrit(e) dans aucune classe pour le moment.
        </p>
      </div>
    )
  }

  // Group by subject code
  const grouped = child.classes.reduce<Record<string, EnrolledClass[]>>((acc, cls) => {
    const key = cls.subjectCode ?? 'Autres'
    if (!acc[key]) acc[key] = []
    acc[key].push(cls)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([subject, classes]) => (
        <div key={subject} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{subject}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classes.map(cls => (
              <ClassCard key={cls.classId} cls={cls} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  initialChildren: ChildWithClasses[]
}

export function ChildrenClient({ initialChildren }: Props) {
  const { data: children = initialChildren } = useChildren()
  const [activeId, setActiveId] = useState<string>(initialChildren[0]?.studentId ?? '')

  const activeChild = children.find(c => c.studentId === activeId) ?? children[0]

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4 text-[#c2440f]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#7a4f30]">Classes de mes enfants</h1>
            <p className="text-sm text-muted-foreground">Voir toutes les classes de vos enfants</p>
          </div>
        </div>
        <LinkChildModal onLinked={() => {}}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#c2440f] hover:bg-[#a33a0d] transition-colors shrink-0">
            <UserPlus className="h-4 w-4" />
            + Ajouter d&apos;autres enfants
          </button>
        </LinkChildModal>
      </div>

      {children.length === 0 ? (
        <EmptyNoChildren />
      ) : (
        <>
          {/* Child selector pills */}
          {children.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 flex gap-1 w-full">
              {children.map(child => (
                <button
                  key={child.studentId}
                  onClick={() => setActiveId(child.studentId)}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm rounded-lg font-medium transition-all text-center',
                    activeId === child.studentId
                      ? 'bg-[#fdf6f0] text-[#c2440f] border border-[#f0dcc8] shadow-sm'
                      : 'text-gray-600 hover:text-[#7a4f30] hover:bg-gray-50',
                  )}
                >
                  {child.firstName} {child.lastName}
                </button>
              ))}
            </div>
          )}

          {/* Student ID badge */}
          {activeChild?.studentCustomId && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>ID étudiant :</span>
              <span className="inline-flex items-center rounded-full border border-[#c2440f]/30 bg-[#fdf6f0] px-2.5 py-0.5 text-xs font-medium text-[#c2440f]">
                {activeChild.studentCustomId}
              </span>
            </div>
          )}

          {/* Classes */}
          {activeChild && <ChildClasses child={activeChild} />}
        </>
      )}
    </div>
  )
}

function EmptyNoChildren() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-20 w-20 rounded-full bg-orange-50 flex items-center justify-center mb-5">
        <Users className="h-10 w-10 text-[#c2440f]/60" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800">Aucun enfant lié</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        Liez votre compte au profil scolaire de votre enfant grâce au numéro de téléphone
        enregistré à l&apos;école.
      </p>
      <LinkChildModal onLinked={() => {}}>
        <button className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#c2440f] hover:bg-[#a33a0d] transition-colors">
          <UserPlus className="h-4 w-4" />
          Lier mon élève
        </button>
      </LinkChildModal>
    </div>
  )
}
