/** Any navigation row carrying a distinct published-parts count. */
export interface WithPartsCount {
  parts_count: number
}

/**
 * Keeps only the rows that have at least one published part. The navigation
 * RPCs already exclude such rows since migration 20260922120000 (issue #312);
 * this guard makes a deployment that runs ahead of that migration hide them
 * too, so a stale function can never bring the empty entries back.
 */
export function withPublishedParts<T extends WithPartsCount>(rows: T[]): T[] {
  return rows.filter((row) => row.parts_count > 0)
}
