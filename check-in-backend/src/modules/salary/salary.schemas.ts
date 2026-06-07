import { z } from '@hono/zod-openapi'

export const CreateSalaryUploadUrlRequestSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.enum([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ])
  })
  .openapi('CreateSalaryUploadUrlRequest')

export const CreateSalaryUploadUrlResponseSchema = z
  .object({
    uploadBatchId: z.string().uuid(),
    storagePath: z.string(),
    signedUploadUrl: z.string().url(),
    token: z.string().optional()
  })
  .openapi('CreateSalaryUploadUrlResponse')

export const ImportSalaryRequestSchema = z
  .object({
    uploadBatchId: z.string().uuid()
  })
  .openapi('ImportSalaryRequest')

export const SalaryUploadBatchIdParamSchema = z.object({
  uploadBatchId: z.string().uuid()
})

export const SalaryRecordIdParamSchema = z.object({
  salaryRecordId: z.string().uuid()
})

export const SalaryUploadBatchSchema = z
  .object({
    id: z.string().uuid(),
    uploadedBy: z.string().uuid(),
    storagePath: z.string(),
    originalFileName: z.string().nullable(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
    totalRows: z.number(),
    successRows: z.number(),
    errorRows: z.number(),
    errors: z.array(z.unknown()),
    importedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime()
  })
  .openapi('SalaryUploadBatch')

export const SalaryRecordSchema = z
  .object({
    id: z.string().uuid(),
    uploadBatchId: z.string().uuid(),
    userId: z.string().uuid(),
    employeeCode: z.string().nullable(),
    employeeEmail: z.string().nullable(),
    periodMonth: z.string(),
    baseSalary: z.number(),
    allowance: z.number(),
    deduction: z.number(),
    netSalary: z.number(),
    accumulatedSalary: z.number(),
    note: z.string().nullable(),
    createdAt: z.string().datetime()
  })
  .openapi('SalaryRecord')

export const ImportSalaryResponseSchema = z
  .object({
    uploadBatch: SalaryUploadBatchSchema
  })
  .openapi('ImportSalaryResponse')

export const ListSalaryUploadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional()
})

export const ListSalaryRecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  periodMonth: z.string().regex(/^[0-9]{4}-[0-9]{2}$/).optional()
})

export const ListSalaryUploadsResponseSchema = z
  .object({
    uploadBatches: z.array(SalaryUploadBatchSchema),
    page: z.number(),
    perPage: z.number(),
    total: z.number()
  })
  .openapi('ListSalaryUploadsResponse')

export const ListSalaryRecordsResponseSchema = z
  .object({
    salaryRecords: z.array(SalaryRecordSchema),
    page: z.number(),
    perPage: z.number(),
    total: z.number()
  })
  .openapi('ListSalaryRecordsResponse')

export const DeleteSalaryUploadResponseSchema = z
  .object({
    deletedUploadBatchId: z.string().uuid(),
    deletedSalaryRecords: z.number()
  })
  .openapi('DeleteSalaryUploadResponse')

export const DeleteSalaryRecordResponseSchema = z
  .object({
    deletedSalaryRecordId: z.string().uuid(),
    uploadBatchId: z.string().uuid()
  })
  .openapi('DeleteSalaryRecordResponse')

export type CreateSalaryUploadUrlRequest = z.infer<typeof CreateSalaryUploadUrlRequestSchema>
export type ImportSalaryRequest = z.infer<typeof ImportSalaryRequestSchema>
export type ListSalaryUploadsQuery = z.infer<typeof ListSalaryUploadsQuerySchema>
export type ListSalaryRecordsQuery = z.infer<typeof ListSalaryRecordsQuerySchema>
