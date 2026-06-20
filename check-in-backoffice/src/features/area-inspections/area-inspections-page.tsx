'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { AreaInspection } from '@/generated/api/model'
import { usePermissions } from '@/hooks/use-permissions'
import { deleteAreaInspection, listAreaInspections } from '@/lib/api/backoffice'
import { getErrorMessage } from '@/lib/api/errors'
import { useI18n } from '@/lib/i18n'

function formatTime(value: string | null | undefined, locale: string) {
  return value ? new Date(value).toLocaleString(locale) : '-'
}

function formatLocation(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return '-'
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function AreaInspectionsPage() {
  const queryClient = useQueryClient()
  const { locale, t } = useI18n()
  const { has, permissions } = usePermissions()
  const canDelete = has(permissions.attendanceReview)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pendingDelete, setPendingDelete] = useState<AreaInspection | null>(null)

  const inspectionsQuery = useQuery({
    queryKey: ['areaInspections', { dateFrom, dateTo }],
    queryFn: () =>
      listAreaInspections({
        page: 1,
        perPage: 100,
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      })
  })

  const deleteMutation = useMutation({
    mutationFn: (areaInspectionId: string) => deleteAreaInspection(areaInspectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areaInspections'] })
      setPendingDelete(null)
      toast.success(t('areaInspections.toastDeleted'))
    },
    onError: (error) =>
      toast.error(t('toast.actionFailed'), {
        description: getErrorMessage(error)
      })
  })

  const inspections = inspectionsQuery.data?.areaInspections ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{t('areaInspections.listTitle')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inspectionsQuery.refetch()}
            disabled={inspectionsQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="date-from">{t('attendance.dateFrom')}</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date-to">{t('attendance.dateTo')}</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </div>

        {inspectionsQuery.isLoading ? <TableSkeleton /> : null}
        {inspectionsQuery.isError ? <ErrorBanner error={inspectionsQuery.error} /> : null}

        {inspectionsQuery.data ? (
          inspections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.photo')}</TableHead>
                  <TableHead>{t('common.employee')}</TableHead>
                  <TableHead>{t('areaInspections.site')}</TableHead>
                  <TableHead>{t('common.location')}</TableHead>
                  <TableHead>{t('areaInspections.capturedAt')}</TableHead>
                  <TableHead>{t('areaInspections.notes')}</TableHead>
                  {canDelete ? (
                    <TableHead className="w-24 text-right">{t('common.action')}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                      {inspection.photoUrl ? (
                        <a
                          href={inspection.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={inspection.photoUrl}
                            alt=""
                            className="size-14 rounded-md object-cover"
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {inspection.user?.fullName ??
                          inspection.user?.email ??
                          '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inspection.user?.employeeCode ?? inspection.user?.email ?? ''}
                      </div>
                    </TableCell>
                    <TableCell>{inspection.workLocationName ?? '-'}</TableCell>
                    <TableCell>
                      {inspection.lat !== null && inspection.lng !== null ? (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={`https://www.openstreetmap.org/?mlat=${inspection.lat}&mlon=${inspection.lng}#map=18/${inspection.lat}/${inspection.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {formatLocation(inspection.lat, inspection.lng)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatTime(inspection.capturedAt, locale)}</TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                      {inspection.notes ?? '-'}
                    </TableCell>
                    {canDelete ? (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={deleteMutation.isPending}
                          onClick={() => setPendingDelete(inspection)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label={t('areaInspections.empty')} />
          )
        ) : null}
      </CardContent>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('areaInspections.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('areaInspections.deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pendingDelete) {
                  deleteMutation.mutate(pendingDelete.id)
                }
              }}
            >
              {t('areaInspections.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
