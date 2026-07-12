'use client'

import { useQuery } from '@tanstack/react-query'
import { getMyClassesAction } from './teacher-classes.actions'

export const myClassKeys = {
  list: () => ['my-classes', 'list'] as const,
}

export function useMyClasses() {
  return useQuery({
    queryKey: myClassKeys.list(),
    queryFn: () => getMyClassesAction().then(r => r.success ? r.data : []),
  })
}
