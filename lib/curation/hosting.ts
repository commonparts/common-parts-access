import { z } from 'zod'
import type { PartFileHostingType } from '@/types/database'

/**
 * Hosting rule of the elsewhere track (#396): a part already published on
 * another platform is always referenced — its files stay at the original
 * publication and Common Parts links to them. Hosting files is reserved for
 * parts published here for the first time (the original track).
 *
 * The `file_hosting_type` column keeps both values; this module is the single
 * place the curation routes read the rule from.
 */
export const CURATED_FILE_HOSTING_TYPE = 'link_out' satisfies PartFileHostingType

export const CURATED_HOSTED_ERROR =
  "A part published elsewhere is always referenced: its files stay at the source. Set fileHostingType to 'link_out' or omit it."

const INVALID_HOSTING_TYPE = 'Invalid file hosting type'

/**
 * Schema of the optional `fileHostingType` of a curation request body. Null
 * or empty reads as `link_out`; `hosted` is refused with an actionable
 * message; any other value is invalid. The key itself is optional where the
 * schema is used: an absent key leaves the column unchanged.
 */
export const curatedHostingTypeSchema = z
  .string({ error: INVALID_HOSTING_TYPE })
  .trim()
  .nullable()
  .transform((value, ctx): typeof CURATED_FILE_HOSTING_TYPE => {
    if (!value || value === CURATED_FILE_HOSTING_TYPE) return CURATED_FILE_HOSTING_TYPE
    ctx.addIssue({ code: 'custom', message: value === 'hosted' ? CURATED_HOSTED_ERROR : INVALID_HOSTING_TYPE })
    return z.NEVER
  })
