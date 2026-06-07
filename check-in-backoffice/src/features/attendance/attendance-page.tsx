'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { AttendanceDayReviewStatus } from '@/generated/api/model'
import { usePermissions } from '@/hooks/use-permissions'
import { listAttendance, reviewAttendance } from '@/lib/api/backoffice'
import { getErrorMessage } from '@/lib/api/errors'
import { translateStatusKey, useI18n } from '@/lib/i18n'

type ReviewStatusFilter = '' | AttendanceDayReviewStatus

function statusVariant(status: AttendanceDayReviewStatus) {
  if (status === 'APPROVED') {
    return 'outline'
  }

  if (status === 'REJECTED') {
    return 'destructive'
  }

  return 'secondary'
}

function formatTime(value: string | null | undefined, locale: string) {
  return value ? new Date(value).toLocaleString(locale) : '-'
}

function formatLocation(lat?: number, lng?: number) {
  if (lat === undefined || lng === undefined) {
    return '-'
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function AttendancePage() {
  const queryClient = useQueryClient()
  const { locale, t } = useI18n()
  const { has, permissions } = usePermissions()
  const canReviewAttendance = has(permissions.attendanceReview)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reviewNote, setReviewNote] = useState('')

  const attendanceQuery = useQuery({
    queryKey: ['attendance', { reviewStatus, dateFrom, dateTo }],
    queryFn: () =>
      listAttendance({
        page: 1,
        perPage: 50,
        ...(reviewStatus ? { reviewStatus } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      })
  })
  const reviewMutation = useMutation({
    mutationFn: (input: { attendanceDayId: string; status: AttendanceDayReviewStatus }) =>
      reviewAttendance(input.attendanceDayId, {
        reviewStatus: input.status,
        ...(reviewNote ? { reviewNote } : {})
      }),
    onSuccess: (_response, input) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      toast.success(
        input.status === 'APPROVED'
          ? t('attendance.toastApproved')
          : t('attendance.toastRejected')
      )
    },
    onError: (error) =>
      toast.error(t('toast.actionFailed'), {
        description: getErrorMessage(error)
      })
  })

  const attendanceDays = attendanceQuery.data?.attendanceDays ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>{t('attendance.reviewTitle')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => attendanceQuery.refetch()}
            disabled={attendanceQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="review-status">{t('attendance.reviewStatus')}</Label>
            <Select
              value={reviewStatus || 'ALL'}
              onValueChange={(value) =>
                setReviewStatus(value === 'ALL' ? '' : (value as ReviewStatusFilter))
              }
            >
              <SelectTrigger id="review-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')}</SelectItem>
                <SelectItem value="PENDING">{t('status.pending')}</SelectItem>
                <SelectItem value="APPROVED">{t('status.approved')}</SelectItem>
                <SelectItem value="REJECTED">{t('status.rejected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className="grid gap-2">
            <Label htmlFor="review-note">{t('attendance.reviewNote')}</Label>
            <Input
              id="review-note"
              value={reviewNote}
              placeholder={t('common.optional')}
              disabled={!canReviewAttendance}
              onChange={(event) => setReviewNote(event.target.value)}
            />
          </div>
        </div>

        {attendanceQuery.isLoading ? <TableSkeleton /> : null}
        {attendanceQuery.isError ? <ErrorBanner error={attendanceQuery.error} /> : null}
        {reviewMutation.isError ? <ErrorBanner error={reviewMutation.error} /> : null}

        {attendanceQuery.data ? (
          attendanceDays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('attendance.workDate')}</TableHead>
                  <TableHead>{t('common.employee')}</TableHead>
                  <TableHead>{t('attendance.checkIn')}</TableHead>
                  <TableHead>{t('attendance.checkOut')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-48 text-right">{t('attendance.review')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceDays.map((day) => (
                  <TableRow key={day.id}>
                    <TableCell className="font-medium">{day.workDate}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {day.user?.fullName ?? day.user?.email ?? day.userId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {day.user?.employeeCode ?? day.user?.email ?? day.userId}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{formatTime(day.checkIn?.capturedAt, locale)}</div>
                      {day.checkIn ? (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={`https://www.openstreetmap.org/?mlat=${day.checkIn.lat}&mlon=${day.checkIn.lng}#map=18/${day.checkIn.lat}/${day.checkIn.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {formatLocation(day.checkIn.lat, day.checkIn.lng)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                      {day.checkIn?.photoUrl ? (
                        <a
                          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={day.checkIn.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('common.photo')} <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div>{formatTime(day.checkOut?.capturedAt, locale)}</div>
                      {day.checkOut ? (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={`https://www.openstreetmap.org/?mlat=${day.checkOut.lat}&mlon=${day.checkOut.lng}#map=18/${day.checkOut.lat}/${day.checkOut.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {formatLocation(day.checkOut.lat, day.checkOut.lng)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                      {day.checkOut?.photoUrl ? (
                        <a
                          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={day.checkOut.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('common.photo')} <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(day.reviewStatus)}>
                        {t(translateStatusKey(day.reviewStatus))}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewMutation.isPending || !canReviewAttendance}
                          onClick={() =>
                            reviewMutation.mutate({
                              attendanceDayId: day.id,
                              status: 'APPROVED'
                            })
                          }
                        >
                          {t('attendance.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={reviewMutation.isPending || !canReviewAttendance}
                          onClick={() =>
                            reviewMutation.mutate({
                              attendanceDayId: day.id,
                              status: 'REJECTED'
                            })
                          }
                        >
                          {t('attendance.reject')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label={t('attendance.empty')} />
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
