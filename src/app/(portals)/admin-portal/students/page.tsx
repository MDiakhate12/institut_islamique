import { StudentsClient } from './StudentsClient'

export const metadata = { title: 'Élèves — Qaf School' }

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student } = await searchParams
  return <StudentsClient initialStudentId={student} />
}
