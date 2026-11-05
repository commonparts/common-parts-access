import { z } from 'zod'
import { MAX_FILENAME_LENGTH } from '@/constants/app'
import { boundedIntParam, optionalUuidParam, pageParam, uuid } from '@/lib/schemas/common'
import { SOURCE_CLICK_CONTEXTS } from '@/lib/utils/source-clicks'
import { PART_STATUSES } from '@/types/database'

/** Request schemas of the part endpoints (`/api/parts/**`). */

/** Largest page the browse grid may request at once. */
const PART_LIST_MAX_LIMIT = 100
const PART_LIST_DEFAULT_LIMIT = 20

/** GET /api/parts — the browse grid: page, size, order, search and filters. */
export const partListQuerySchema = z.object({
  page: pageParam,
  limit: boundedIntParam('limit', PART_LIST_MAX_LIMIT, PART_LIST_DEFAULT_LIMIT),
  sortBy: z
    .enum(['likes', 'views', 'newest', 'created_at'], {
      error: 'sortBy must be one of: likes, views, newest, created_at',
    })
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc'], { error: 'sortOrder must be asc or desc' }).default('desc'),
  search: z.string().trim().default(''),
  productId: optionalUuidParam('productId'),
  brandId: optionalUuidParam('brandId'),
  categoryId: optionalUuidParam('categoryId'),
})

/** GET /api/parts/mine — the owner's dashboard list. */
export const myPartsQuerySchema = z.object({
  page: pageParam,
  status: z
    .enum(PART_STATUSES, { error: `status must be one of: ${PART_STATUSES.join(', ')}` })
    .default('published'),
})

/** POST /api/parts/[slug]/download — the file whose download is counted. */
export const downloadSchema = z.object(
  { fileId: uuid('Invalid fileId: expected a UUID') },
  { error: 'Invalid fileId: expected a UUID' },
)

const SOURCE_CLICK_CONTEXT_MESSAGE = `Invalid context: expected one of ${SOURCE_CLICK_CONTEXTS.join(', ')}`

/** POST /api/parts/[slug]/source-click — where the source link was clicked. */
export const sourceClickSchema = z.object(
  { context: z.enum(SOURCE_CLICK_CONTEXTS, { error: SOURCE_CLICK_CONTEXT_MESSAGE }) },
  { error: SOURCE_CLICK_CONTEXT_MESSAGE },
)

/** Path segments and parent references a stored filename must not contain. */
const PATH_CHARACTERS = /[\/\\]|\.\./

/** Longest storage path a registered file may have. */
const MAX_PATH_LENGTH = 500

/**
 * One file the client uploaded directly to Storage and now registers. Shape
 * only: the bucket, extension, size and path rules depend on the category,
 * the owner and the part, and are checked by the route.
 */
const registeredFileSchema = z.object(
  {
    originalName: z
      .string({ error: 'Invalid original filename' })
      .trim()
      .min(1, { error: 'Invalid original filename' })
      .max(MAX_FILENAME_LENGTH, { error: 'Invalid original filename' })
      .refine((name) => !PATH_CHARACTERS.test(name), { error: 'Original filename contains invalid characters' }),
    filename: z
      .string({ error: 'Invalid filename' })
      .trim()
      .min(1, { error: 'Invalid filename' })
      .max(MAX_FILENAME_LENGTH, { error: 'Invalid filename' })
      .refine((name) => !PATH_CHARACTERS.test(name), { error: 'Filename contains invalid path characters' }),
    extension: z.string({ error: 'Invalid file extension' }).trim().toLowerCase(),
    // Bytes, stored in a bigint column: a whole number.
    size: z
      .number({ error: 'Invalid file size' })
      .int({ error: 'Invalid file size' })
      .nonnegative({ error: 'Invalid file size' }),
    path: z
      .string({ error: 'Invalid file path' })
      .trim()
      .min(1, { error: 'Invalid file path' })
      .max(MAX_PATH_LENGTH, { error: 'Invalid file path' }),
    bucket: z.string({ error: 'Invalid storage bucket' }).trim(),
    category: z.enum(['model', 'image'], { error: 'Invalid file category: expected model or image' }),
  },
  { error: 'Invalid file entry' },
)

/** POST /api/parts/[slug]/files — the files to register, at most `maxFiles`. */
export function registerFilesSchema(maxFiles: number) {
  return z.object(
    {
      files: z
        .array(registeredFileSchema, { error: 'No files provided' })
        .min(1, { error: 'No files provided' })
        .max(maxFiles, { error: `Too many files (max ${maxFiles})` }),
    },
    { error: 'Invalid request body' },
  )
}
