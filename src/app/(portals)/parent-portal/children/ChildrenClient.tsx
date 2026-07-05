'use client'

import { useState } from 'react'
import { useChildren } from '@/modules/parents/parents.hooks'
import type { ChildWithClasses } from '@/modules/parents/parents.types'
import { LinkChildModal } from './LinkChildModal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserPlus, BookOpen, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  initialChildren: ChildWithClasses[]
}

export function ChildrenClient({ initialChildren }: Props) {
  const { data: children = initialChildren } = useChildren()
  const [activeTab, setActiveTab] = useState<string>(initialChildren[0]?.studentId ?? '')

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes de mes enfants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Voir toutes les classes de vos enfants
          </p>
        </div>
        <LinkChildModal onLinked={() => {}}>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white
                       bg-[#c2440f] hover:bg-[#a33a0d] transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            + Ajouter d'autres enfants
          </button>
        </LinkChildModal>
      </div>

      {children.length === 0 ? (
        <EmptyNoChildren />
      ) : (
        <Tabs
          value={activeTab || children[0]?.studentId}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-4 h-auto p-1 bg-white border border-gray-200 rounded-xl shadow-sm w-fit">
            {children.map(child => (
              <TabsTrigger
                key={child.studentId}
                value={child.studentId}
                className={cn(
                  'px-4 py-2 text-sm rounded-lg font-medium transition-all',
                  'data-active:bg-[#c2440f] data-active:text-white data-active:shadow',
                )}
              >
                {child.firstName} {child.lastName}
              </TabsTrigger>
            ))}
          </TabsList>

          {children.map(child => (
            <TabsContent key={child.studentId} value={child.studentId}>
              <ChildClasses child={child} />
            </TabsContent>
          ))}
        </Tabs>
      )}
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
          {child.firstName} n'est inscrit(e) dans aucune classe pour le moment.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {child.classes.map(cls => (
        <div
          key={cls.classId}
          className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white
                     hover:border-[#c2440f]/30 hover:shadow-sm transition-all"
        >
          <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-[#c2440f]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{cls.className}</p>
            {(cls.room || cls.section) && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {[cls.room, cls.section].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      ))}
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
        enregistré à l'école.
      </p>
      <LinkChildModal onLinked={() => {}}>
        <button
          className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white
                     bg-[#c2440f] hover:bg-[#a33a0d] transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Lier mon élève
        </button>
      </LinkChildModal>
    </div>
  )
}
