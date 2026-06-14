'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCatalogClassesAction,
  createCatalogClassAction,
  updateCatalogClassAction,
  deleteCatalogClassAction,
} from './classes.actions'
import type { CreateCatalogClassInput, UpdateCatalogClassInput } from './classes.schema'

export const catalogKeys = {
  all:   ['catalog'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
}

export function useCatalogClasses() {
  return useQuery({
    queryKey: catalogKeys.lists(),
    queryFn: async () => {
      const result = await getCatalogClassesAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}

export function useCreateCatalogClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCatalogClassInput) => createCatalogClassAction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.lists() }),
  })
}

export function useUpdateCatalogClass(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCatalogClassInput) => updateCatalogClassAction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.lists() }),
  })
}

export function useDeleteCatalogClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCatalogClassAction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.lists() }),
  })
}
