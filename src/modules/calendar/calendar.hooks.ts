'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getEventsAction,
  createEventAction,
  updateEventAction,
  deleteEventAction,
  duplicateEventAction,
  sendReminderAction,
} from './calendar.actions'
import type { CreateEventInput, UpdateEventInput } from './calendar.schema'

export const calendarKeys = {
  all:    () => ['calendar'] as const,
  events: (opts?: object) => ['calendar', 'events', opts] as const,
}

export function useEvents(opts?: { from?: string; to?: string; type?: string }) {
  return useQuery({
    queryKey: calendarKeys.events(opts),
    queryFn: async () => {
      const result = await getEventsAction(opts)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEventAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: calendarKeys.all() })
      toast.success('Événement créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateEventInput) => updateEventAction(input),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: calendarKeys.all() })
      toast.success('Événement mis à jour')
    },
    onError: () => toast.error('Erreur lors de la modification'),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEventAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: calendarKeys.all() })
      toast.success('Événement supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
}

export function useDuplicateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicateEventAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      qc.invalidateQueries({ queryKey: calendarKeys.all() })
      toast.success('Événement dupliqué')
    },
    onError: () => toast.error('Erreur lors de la duplication'),
  })
}

export function useSendReminder() {
  return useMutation({
    mutationFn: (id: string) => sendReminderAction(id),
    onSuccess: (result) => {
      if (!result.success) { toast.error(result.error); return }
      toast.success('Reminder sent to all school members')
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  })
}
