'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnnouncementsAction, createAnnouncementAction, updateAnnouncementAction, deleteAnnouncementAction } from './announcements.actions'
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.schema'

const KEYS = {
  list: (portal: string) => ['announcements', portal] as const,
}

export function useAnnouncements(portal: 'admin' | 'parents' | 'teachers' = 'admin') {
  return useQuery({
    queryKey: KEYS.list(portal),
    queryFn: async () => {
      const result = await getAnnouncementsAction(portal)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 60_000,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) => createAnnouncementAction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAnnouncementInput }) =>
      updateAnnouncementAction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncementAction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}
