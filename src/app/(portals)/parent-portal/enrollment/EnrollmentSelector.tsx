'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ChildWithClasses } from '@/modules/parents/parents.types'
import { LinkChildModal } from '../children/LinkChildModal'
import { Phone, UserPlus, Users, ArrowRight, CheckCircle, Plus } from 'lucide-react'

interface Props {
  students: ChildWithClasses[]
  schoolName: string
  academicYear: string
  registeredStudentIds: string[]
}

export function EnrollmentSelector({ students, schoolName, academicYear, registeredStudentIds }: Props) {
  const router = useRouter()
  const registeredSet = new Set(registeredStudentIds)

  return (
    <div>
      <div className="bg-[#c2440f] py-6 text-center">
        <h1 className="text-2xl font-bold text-white">Inscription à {schoolName}</h1>
        <p className="text-white/80 text-sm mt-1">Année scolaire {academicYear}</p>
      </div>

      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Sélectionner un élève</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Consultez les élèves liés et leur statut d&apos;inscription pour {academicYear}
          </p>

          {students.length === 0 ? (
            <div className="border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center">
                <Phone className="h-6 w-6 text-[#c2440f]" />
              </div>
              <h3 className="font-semibold text-gray-900">Trouver votre élève</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Votre enfant est déjà inscrit. Entrez le numéro de téléphone parental
                enregistré à l&apos;école pour le rattacher à votre compte.
              </p>
              <LinkChildModal onLinked={() => router.refresh()}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white
                             bg-[#c2440f] hover:bg-[#a33a0d] transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Lier mon élève
                </button>
              </LinkChildModal>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map(child => {
                const isRegistered = registeredSet.has(child.studentId)
                const idLabel = child.studentCustomId ?? child.studentId

                if (isRegistered) {
                  return (
                    <div
                      key={child.studentId}
                      className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50"
                    >
                      <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm">{child.firstName} {child.lastName}</p>
                        <p className="text-xs text-muted-foreground">ID : {idLabel}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full shrink-0">
                        Inscrit
                      </span>
                    </div>
                  )
                }

                return (
                  <Link
                    key={child.studentId}
                    href={`/parent-portal/enrollment/${child.studentId}`}
                    className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white
                               hover:border-[#c2440f]/30 hover:shadow-sm transition-all"
                  >
                    <div className="h-9 w-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-[#c2440f]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">{child.firstName} {child.lastName}</p>
                      <p className="text-xs text-muted-foreground">ID : {idLabel}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <ArrowRight className="h-4 w-4 text-[#c2440f]" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <Link
          href="/parent-portal/enrollment/new"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-semibold
                     bg-gradient-to-r from-[#c2440f] to-[#e8853f] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Ajouter un nouvel élève à l&apos;école
        </Link>
      </div>
    </div>
  )
}
