'use client'

import { useQuery } from '@tanstack/react-query'
import { getAuthMe } from '@/lib/api/auth'
import {
  hasEveryPermission,
  hasPermission,
  permissions
} from '@/lib/permissions'

export function usePermissions() {
  const profileQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: getAuthMe,
    retry: false
  })

  return {
    permissions,
    profileQuery,
    user: profileQuery.data?.user,
    has: (permission: string) => hasPermission(profileQuery.data?.user, permission),
    hasEvery: (requiredPermissions: string[]) =>
      hasEveryPermission(profileQuery.data?.user, requiredPermissions)
  }
}
