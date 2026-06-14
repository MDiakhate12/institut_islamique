import { requireSession } from '@/lib/auth/session'
import { ClassCatalogClient } from './ClassCatalogClient'

export default async function ClassCatalogPage() {
  await requireSession()
  return (
    <div className="p-6">
      <ClassCatalogClient />
    </div>
  )
}
