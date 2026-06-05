'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  createSalaryUploadUrl,
  importSalaryUpload,
  listSalaryRecords,
  listSalaryUploads
} from '@/lib/api/backoffice'

const moneyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 2
})

function normalizeSalaryContentType(file: File) {
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  ) {
    return file.type
  }

  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

export function SalaryPage() {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const uploadBatchesQuery = useQuery({
    queryKey: ['salary-uploads'],
    queryFn: () => listSalaryUploads({ page: 1, perPage: 20 })
  })
  const salaryRecordsQuery = useQuery({
    queryKey: ['salary-records'],
    queryFn: () => listSalaryRecords({ page: 1, perPage: 20 })
  })
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Please choose an Excel file')
      }

      const contentType = normalizeSalaryContentType(file)
      const upload = await createSalaryUploadUrl({
        fileName: file.name,
        contentType
      })

      const response = await fetch(upload.signedUploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: file
      })

      if (!response.ok) {
        throw new Error('Unable to upload salary file')
      }

      return importSalaryUpload({ uploadBatchId: upload.uploadBatchId })
    },
    onSuccess: () => {
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['salary-uploads'] })
      queryClient.invalidateQueries({ queryKey: ['salary-records'] })
    }
  })

  const batches = uploadBatchesQuery.data?.uploadBatches ?? []
  const records = salaryRecordsQuery.data?.salaryRecords ?? []

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Salary import</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              uploadMutation.mutate()
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="salary-file">Excel file</Label>
              <Input
                id="salary-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!file || uploadMutation.isPending}>
                <Upload className="size-4" />
                Upload
              </Button>
            </div>
          </form>
          {uploadMutation.isError ? <ErrorBanner error={uploadMutation.error} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload batches</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadBatchesQuery.isLoading ? <TableSkeleton rows={3} /> : null}
          {uploadBatchesQuery.isError ? <ErrorBanner error={uploadBatchesQuery.error} /> : null}
          {uploadBatchesQuery.data ? (
            batches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>{new Date(batch.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {batch.originalFileName ?? batch.storagePath}
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.status === 'FAILED' ? 'destructive' : 'outline'}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {batch.successRows}/{batch.totalRows}
                      </TableCell>
                      <TableCell className="text-right">{batch.errorRows}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState label="No salary uploads found" />
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary records</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryRecordsQuery.isLoading ? <TableSkeleton rows={3} /> : null}
          {salaryRecordsQuery.isError ? <ErrorBanner error={salaryRecordsQuery.error} /> : null}
          {salaryRecordsQuery.data ? (
            records.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Accumulated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.periodMonth}</TableCell>
                      <TableCell>
                        <div>{record.employeeCode ?? record.userId}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.employeeEmail ?? '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {moneyFormatter.format(record.baseSalary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {moneyFormatter.format(record.netSalary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {moneyFormatter.format(record.accumulatedSalary)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState label="No salary records found" />
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
