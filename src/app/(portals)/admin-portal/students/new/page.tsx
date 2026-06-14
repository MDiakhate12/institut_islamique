// La création se fait via le dialog sur la page /students
// Cette page redirige vers la liste
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export default function NewStudentPage() {
  redirect(ROUTES.admin.students)
}
