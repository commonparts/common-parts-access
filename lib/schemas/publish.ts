import { z } from 'zod'
import { uuid } from '@/lib/schemas/common'
import { createUploadDraftSchema, updateUploadDraftSchema } from '@/lib/schemas/upload'
import { createCurationDraftSchema, updateCurationDraftSchema } from '@/lib/schemas/curation'

/** The same step payload is validated by the form resolver and the Server Action. */
export const savePublicationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('createOriginal'), fields: createUploadDraftSchema }),
  z.object({ operation: z.literal('updateOriginal'), id: uuid, fields: updateUploadDraftSchema }),
  z.object({ operation: z.literal('createElsewhere'), fields: createCurationDraftSchema }),
  z.object({ operation: z.literal('updateElsewhere'), id: uuid, fields: updateCurationDraftSchema }),
])

export const publishPublicationSchema = z.object({ track: z.enum(['original', 'elsewhere']), id: uuid })
