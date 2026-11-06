/**
 * Whether an error carries the given `code`: a Postgres SQLSTATE (for example
 * '23505', a unique violation) as the Supabase client reports it, or a domain
 * code set by a query helper.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Object && 'code' in error && error.code === code
}

/**
 * Detects the domain-level not-found error used by part metrics query helpers.
 */
export function isPartNotFoundError(error: unknown): boolean {
  return (error instanceof Error && error.message === 'PART_NOT_FOUND') || hasErrorCode(error, 'PART_NOT_FOUND')
}
