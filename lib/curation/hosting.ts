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

/**
 * Schema of the optional `fileHostingType` of a curation request body. Null
 * or empty reads as `link_out`; `hosted` is refused with an actionable
 * message; any other value is invalid. The key itself is optional where the
 * schema is used: an absent key leaves the column unchanged.
 */
export const curatedHostingTypeSchema = z
  .string()
  .trim()
  .nullable()
  .transform((value, ctx): typeof CURATED_FILE_HOSTING_TYPE => {
    if (!value || value === CURATED_FILE_HOSTING_TYPE) return CURATED_FILE_HOSTING_TYPE
    ctx.addIssue({ code: 'custom', message: value === 'hosted' ? 'curatedHosted' : 'invalidHostingType' })
    return z.NEVER
  })
