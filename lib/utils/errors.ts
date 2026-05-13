/**
 * Detects the domain-level not-found error used by model metrics query helpers.
 */
export function isModelNotFoundError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'MODEL_NOT_FOUND') {
    return true
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    return code === 'MODEL_NOT_FOUND'
  }

  return false
}