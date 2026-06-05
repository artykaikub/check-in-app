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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { AttendanceDayReviewStatus } from '@/generated/api/model'
import { listAttendance, reviewAttendance } from '@/lib/api/backoffice'

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

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

export function AttendancePage() {
  const queryClient = useQueryClient()
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] })
  })

  const attendanceDays = attendanceQuery.data?.attendanceDays ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Attendance review</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => attendanceQuery.refetch()}
            disabled={attendanceQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="review-status">Review status</Label>
            <NativeSelect
              id="review-status"
              value={reviewStatus}
              onChange={(event) =>
                setReviewStatus(event.target.value as ReviewStatusFilter)
              }
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date-from">Date from</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date-to">Date to</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="review-note">Review note</Label>
            <Input
              id="review-note"
              value={reviewNote}
              placeholder="Optional"
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
                  <TableHead>Work date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48 text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceDays.map((day) => (
                  <TableRow key={day.id}>
                    <TableCell className="font-medium">{day.workDate}</TableCell>
                    <TableCell className="font-mono text-xs">{day.userId}</TableCell>
                    <TableCell>
                      <div>{formatTime(day.checkIn?.capturedAt)}</div>
                      {day.checkIn?.photoUrl ? (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={day.checkIn.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Photo <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div>{formatTime(day.checkOut?.capturedAt)}</div>
                      {day.checkOut?.photoUrl ? (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                          href={day.checkOut.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Photo <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(day.reviewStatus)}>{day.reviewStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({
                              attendanceDayId: day.id,
                              status: 'APPROVED'
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({
                              attendanceDayId: day.id,
                              status: 'REJECTED'
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState label="No attendance records found" />
          )
        ) : null}
      </CardContent>
    </Card>
  )
}
