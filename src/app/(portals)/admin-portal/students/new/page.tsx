import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { StudentForm } from '../StudentForm'

export const metadata = { title: 'Créer un élève — Qaf School' }

export default function NewStudentPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Créer un nouvel élève"
        subtitle="Renseignez les informations de l'élève"
      />
      <div className="bg-white rounded-xl border border-border p-6">
        <StudentForm />
      </div>
    </div>
  )
}
