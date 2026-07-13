import { requireSession } from '@/lib/auth/session'
import { ClassCatalogClient } from '@/app/(portals)/admin-portal/class-catalog/ClassCatalogClient'

export default async function ParentCatalogPage() {
  await requireSession()
  return <ClassCatalogClient readonly />
}
