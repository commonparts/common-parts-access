import { z } from 'zod'
import { boundedIntParam, optionalUuidParam, uuid } from '@/lib/schemas/common'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { normalizeEntityName } from '@/lib/utils/validation'

/** Request schemas of `/api/products`. */

/** Largest product list one request may return. */
const PRODUCT_LIST_MAX_LIMIT = 1000
const PRODUCT_LIST_DEFAULT_LIMIT = 100

const { PRODUCTS_MAX_COUNT } = VALIDATION_LIMITS.PART

/** Longest product name, mirrored from the CHECK constraint on products.name. */
const PRODUCT_NAME_MAX_LENGTH = 200

/**
 * GET /api/products — the products of a brand and/or category, or an exact
 * lookup by ids.
 *
 * `ids` resolves specific products — the publish tools use it to name the
 * products a draft links to, which can span brands since #315. It is an exact
 * lookup, so the list is taken whole or refused: dropping the malformed
 * entries would report a corrupted link list as a success, and an empty
 * `ids=` would fall through to the unfiltered catalog. The cap rejects rather
 * than truncates for the same reason.
 */
export const productListQuerySchema = z.object({
  brandId: optionalUuidParam,
  categoryId: optionalUuidParam,
  includeDescendants: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  search: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  limit: boundedIntParam(PRODUCT_LIST_MAX_LIMIT, PRODUCT_LIST_DEFAULT_LIMIT),
  ids: z
    .string()
    .transform((value) => value.split(',').map((id) => id.trim()))
    .pipe(z.array(uuid).max(PRODUCTS_MAX_COUNT))
    .optional(),
})

/**
 * POST /api/products — a product created from the publish tools. The image is
 * a storage reference whose ownership the route checks against the session.
 */
export const createProductSchema = z.object({
  // Checked after the normalization createProduct() stores, so the limit
  // applies to the name as the database receives it.
  name: z
    .string()
    .transform(normalizeEntityName)
    .pipe(z.string().min(1, { error: 'required' }).max(PRODUCT_NAME_MAX_LENGTH)),
  brandId: uuid,
  categoryId: uuid,
  description: z.string().optional(),
  releaseYear: z
    .number()
    .int()
    .nullish()
    .transform((value) => value ?? null),
  imageUrl: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  discontinued: z.boolean().default(false),
})
