import { notFound } from 'next/navigation'

/**
 * Feature flags read from NEXT_PUBLIC_* environment variables.
 *
 * NEXT_PUBLIC_ values are inlined at build time, so each flag must read its
 * variable through a literal `process.env.NEXT_PUBLIC_…` expression for the
 * value to reach client components. Changing a flag needs a rebuild.
 */

/** A flag is on only when its variable is exactly "true"; unset means off. */
export function parseFeatureFlag(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() === 'true'
}

/**
 * Comments, likes and collections (issue #322). Off by default: they have no
 * usage and do not serve stage 1. Their tables and data are kept, so turning
 * the flag back on restores the UI as it was.
 */
export const SOCIAL_FEATURES_ENABLED = parseFeatureFlag(
  process.env.NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES,
)

/** Renders the 404 page from a social-feature route while the flag is off. */
export function notFoundUnlessSocialFeatures(): void {
  if (!SOCIAL_FEATURES_ENABLED) notFound()
}
