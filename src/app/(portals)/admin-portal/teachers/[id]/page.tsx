// L'édition se fait via le dialog dans la liste
// Cette page redirige vers la liste
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export default function TeacherDetailPage() {
  redirect(ROUTES.admin.teachers)
}
