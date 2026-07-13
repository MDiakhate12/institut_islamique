import type { AdminSubRole } from '@/lib/constants'

export type PermissionMember = {
  memberId: string
  userId: string
  fullName: string | null
  email: string
  phone: string | null
  portalRoles: string[]
  adminSubRole: AdminSubRole
  isPending: boolean
  pendingEmail: string | null
}

export type SearchResult = {
  found: boolean
  memberId?: string
  fullName?: string | null
  email: string
  phone?: string | null
  alreadyHasRole?: boolean
}
