/**
 * Detects the domain-level not-found error used by part metrics query helpers.
 */
export function isPartNotFoundError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'PART_NOT_FOUND') {
    return true
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return code === 'PART_NOT_FOUND'
  }

  return false
}