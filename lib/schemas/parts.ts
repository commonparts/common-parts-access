import { z } from 'zod'
import { MAX_FILENAME_LENGTH } from '@/constants/app'
import { boundedIntParam, optionalUuidParam, pageParam, uuid } from '@/lib/schemas/common'
import { SOURCE_CLICK_CONTEXTS } from '@/lib/utils/source-clicks'

/** Request schemas of the part endpoints (`/api/parts/**`). */

/** Largest page the browse grid may request at once. */
const PART_LIST_MAX_LIMIT = 100
const PART_LIST_DEFAULT_LIMIT = 20

/** GET /api/parts — the browse grid: page, size, order, search and filters. */
export const partListQuerySchema = z.object({
  page: pageParam,
  limit: boundedIntParam(PART_LIST_MAX_LIMIT, PART_LIST_DEFAULT_LIMIT),
  sortBy: z.enum(['likes', 'views', 'newest', 'created_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().default(''),
  productId: optionalUuidParam,
  brandId: optionalUuidParam,
  categoryId: optionalUuidParam,
})

/** POST /api/parts/[slug]/download — the file whose download is counted. */
export const downloadSchema = z.object({ fileId: uuid })

/** POST /api/parts/[slug]/source-click — where the source link was clicked. */
export const sourceClickSchema = z.object({ context: z.enum(SOURCE_CLICK_CONTEXTS) })

/** Path segments and parent references a stored filename must not contain. */
const PATH_CHARACTERS = /[\/\\]|\.\./

/** Longest storage path a registered file may have. */
const MAX_PATH_LENGTH = 500

/**
 * One file the client uploaded directly to Storage and now registers. Shape
 * only: the bucket, extension, size and path rules depend on the category,
 * the owner and the part, and are checked by the route.
 */
const registeredFileSchema = z.object({
  originalName: z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .max(MAX_FILENAME_LENGTH)
    .refine((name) => !PATH_CHARACTERS.test(name), { error: 'pathCharacters' }),
  filename: z
    .string()
    .trim()
    .min(1, { error: 'required' })
    .max(MAX_FILENAME_LENGTH)
    .refine((name) => !PATH_CHARACTERS.test(name), { error: 'pathCharacters' }),
  extension: z.string().trim().toLowerCase(),
  // Bytes, stored in a bigint column: a whole number.
  size: z.number().int().nonnegative(),
  path: z.string().trim().min(1, { error: 'required' }).max(MAX_PATH_LENGTH),
  bucket: z.string().trim(),
  category: z.enum(['model', 'image']),
})

/** POST /api/parts/[slug]/files — the files to register, at most `maxFiles`. */
export function registerFilesSchema(maxFiles: number) {
  return z.object({ files: z.array(registeredFileSchema).min(1).max(maxFiles) })
}
