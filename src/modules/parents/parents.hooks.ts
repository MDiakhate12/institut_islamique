'use client'

import { useQuery } from '@tanstack/react-query'
import { getParentsAction } from './parents.actions'

export function useParents() {
  return useQuery({
    queryKey: ['parents'],
    queryFn: async () => {
      const result = await getParentsAction()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })
}
