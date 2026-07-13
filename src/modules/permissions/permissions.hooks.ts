'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdminSubRole } from '@/lib/constants'
import {
  getPermissionsByRoleAction,
  searchMemberByEmailAction,
  grantRoleAction,
  revokeRoleAction,
} from './permissions.actions'

export function usePermissions(role: AdminSubRole) {
  return useQuery({
    queryKey: ['permissions', role],
    queryFn: async () => {
      const result = await getPermissionsByRoleAction(role)
      return result.success ? result.data : []
    },
    staleTime: 30_000,
  })
}

export function useGrantRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: AdminSubRole }) =>
      grantRoleAction(email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
  })
}

export function useRevokeRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => revokeRoleAction(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
  })
}
