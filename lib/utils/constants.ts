/**
 * Application constants and configuration values.
 *
 * The project skeleton shipped a large set of constants that were never wired
 * to anything — pricing tiers, quality levels, cache keys, a model-category
 * list superseded by the categories table, an API endpoint map nothing read.
 * They were removed in issue #295. What remains is what the app actually uses.
 */

// Application metadata
export const APP_NAME = 'Common Parts Access'

/**
 * Canonical application URL. Normalizes NEXT_PUBLIC_APP_URL so it is always
 * an absolute URL (adds https:// when a bare hostname is supplied).
 * Falls back to http://localhost:3000 when the env var is not set.
 */
function resolveAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL
  if (!raw) return 'http://localhost:3000'
  try {
    return new URL(raw).href
  } catch {
    // Bare hostname supplied without scheme — default to https
    return `https://${raw}`
  }
}

export const APP_URL = resolveAppUrl()

// Form validation limits
export const VALIDATION_LIMITS = {
  MODEL: {
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 250,
    INSTRUCTIONS_MAX_LENGTH: 8000,
    TAGS_MAX_COUNT: 10,
    TAG_MIN_LENGTH: 2,
    TAG_MAX_LENGTH: 20,
    PRODUCTS_MAX_COUNT: 10
  },
  USER: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 20,
    PASSWORD_MIN_LENGTH: 8,
    BIO_MAX_LENGTH: 500
  }
} as const
