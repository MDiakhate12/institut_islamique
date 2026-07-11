import Link from 'next/link'
import { CheckCircle, Plus } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { schoolService } from '@/modules/school/school.service'

export default async function EnrollmentSuccessPage() {
  const session = await requireSession()
  const school = await schoolService.getById(session.schoolId)
  const schoolName = school?.name ?? ''
  const academicYear = school?.settings?.academicYear ?? '2026-2027'

  return (
    <div>
      <div className="bg-[#c2440f] py-6 text-center">
        <h1 className="text-2xl font-bold text-white">Inscription à {schoolName}</h1>
        <p className="text-white/80 text-sm mt-1">Année scolaire {academicYear}</p>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" strokeWidth={1.75} />

          <h2 className="text-2xl font-bold text-emerald-900">Inscription soumise !</h2>

          <p className="text-emerald-800 text-sm leading-relaxed">
            Merci ! Votre demande d&apos;inscription a été soumise avec succès. Nous examinerons votre demande et vous contacterons bientôt.
          </p>

          <Link
            href="/parent-portal/enrollment"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-full transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Soumettre une autre inscription
          </Link>
        </div>
      </div>
    </div>
  )
}
