'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ApiError } from '@/lib/api/fetch-json'
import { listUsers, resetUserDevice } from '@/lib/api/backoffice'

export function UsersTable() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['backoffice-users', { page: 1, perPage: 50, search }],
    queryFn: () => listUsers({ page: 1, perPage: 50, ...(search ? { search } : {}) })
  })
  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetUserDevice(userId, 'Reset from backoffice'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backoffice-users'] })
    }
  })

  const users = query.data?.users ?? []

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
      router.replace('/login')
    }
  }, [query.error, router])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Users</CardTitle>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search email, name, employee code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <TableSkeleton /> : null}

        {query.isError ? <ErrorBanner error={query.error} /> : null}

        {query.data ? (
          users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-36 text-right">Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.fullName ?? user.email ?? user.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.employeeCode ?? 'No employee code'} · {user.email ?? 'No email'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role.key}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resetMutation.isPending}
                        onClick={() => resetMutation.mutate(user.id)}
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label="No users found" />
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
