'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { EmergencyLogStatus } from '@/generated/api/model'
import { listEmergencyLogs, updateEmergencyLog } from '@/lib/api/backoffice'

type EmergencyStatusFilter = '' | EmergencyLogStatus

function statusVariant(status: EmergencyLogStatus) {
  if (status === 'OPEN') {
    return 'destructive'
  }

  if (status === 'ACKNOWLEDGED') {
    return 'secondary'
  }

  return 'outline'
}

export function EmergencyPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<EmergencyStatusFilter>('OPEN')
  const emergencyQuery = useQuery({
    queryKey: ['emergency-logs', { status }],
    queryFn: () =>
      listEmergencyLogs({
        page: 1,
        perPage: 50,
        ...(status ? { status } : {})
      })
  })
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status: EmergencyLogStatus }) =>
      updateEmergencyLog(input.id, { status: input.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emergency-logs'] })
  })
  const logs = emergencyQuery.data?.emergencyLogs ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Emergency logs</CardTitle>
          <div className="flex gap-2">
            <NativeSelect
              className="w-44"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as EmergencyStatusFilter)
              }
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </NativeSelect>
            <Button
              variant="outline"
              size="sm"
              onClick={() => emergencyQuery.refetch()}
              disabled={emergencyQuery.isFetching}
            >
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {emergencyQuery.isLoading ? <TableSkeleton /> : null}
        {emergencyQuery.isError ? <ErrorBanner error={emergencyQuery.error} /> : null}
        {updateMutation.isError ? <ErrorBanner error={updateMutation.error} /> : null}

        {emergencyQuery.data ? (
          logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-56 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {new Date(log.triggeredAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.userId}</TableCell>
                    <TableCell>
                      <div>{log.emergencyType ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">{log.message ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      <a
                        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                        href={`https://www.openstreetmap.org/?mlat=${log.lat}&mlon=${log.lng}#map=18/${log.lat}/${log.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {log.lat.toFixed(5)}, {log.lng.toFixed(5)}
                        <ExternalLink className="size-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending || log.status !== 'OPEN'}
                          onClick={() =>
                            updateMutation.mutate({
                              id: log.id,
                              status: 'ACKNOWLEDGED'
                            })
                          }
                        >
                          Ack
                        </Button>
                        <Button
                          size="sm"
                          disabled={updateMutation.isPending || log.status === 'RESOLVED'}
                          onClick={() =>
                            updateMutation.mutate({
                              id: log.id,
                              status: 'RESOLVED'
                            })
                          }
                        >
                          Resolve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label="No emergency logs found" />
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
