import { superAdminService } from '@/modules/super-admin/super-admin.service'
import { SchoolsClient } from './SchoolsClient'

export default async function SuperAdminPage() {
  const schools = await superAdminService.getAllSchools()

  return (
    <div>
      <SchoolsClient initialSchools={schools} />
    </div>
  )
}
