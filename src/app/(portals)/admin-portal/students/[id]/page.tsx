// La modification se fait via le dialog dans le tableau
// Cette page redirige vers la liste
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export default function StudentDetailPage() {
  redirect(ROUTES.admin.students)
}
