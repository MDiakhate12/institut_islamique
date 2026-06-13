import { notFound } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { studentsService } from '@/modules/students/students.service'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge'
import { StudentForm } from '../StudentForm'

interface StudentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = await params
  const session = await requireSession()
  const student = await studentsService.getById(session.schoolId, id)

  if (!student) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`${student.lastName} ${student.firstName}`}
        subtitle="Profil de l'élève"
        actions={
          <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
        }
      />

      {/* Fiche info */}
      <div className="bg-white rounded-xl border border-border p-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground mb-0.5">Genre</p>
          <StatusBadge status={student.gender} />
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5">Date de naissance</p>
          <p className="font-medium">
            {student.birthDate
              ? new Date(student.birthDate).toLocaleDateString('fr-FR')
              : '—'}
          </p>
        </div>
        {student.notes && (
          <div className="col-span-2">
            <p className="text-muted-foreground mb-0.5">Notes</p>
            <p>{student.notes}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground mb-0.5">Créé le</p>
          <p className="font-medium">
            {new Date(student.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Formulaire édition */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold mb-4">Modifier les informations</h2>
        <StudentForm student={student} />
      </div>
    </div>
  )
}
