/**
 * PostgREST answers 416 with this code when a range requested with an exact
 * count starts past the last row, i.e. for a page number beyond the last page.
 * A range starting exactly at the row count returns no row and no error.
 */
export const RANGE_NOT_SATISFIABLE = 'PGRST103'

/** The 0-based, inclusive row bounds of a 1-based page, as `.range()` takes them. */
export interface PageRange {
  from: number
  to: number
}

/** The part of a Supabase query result the out-of-range check reads. */
interface PageQueryResult {
  data: readonly unknown[] | null
  error: { code?: string } | null
}

/** Returns the `.range()` bounds of a 1-based page; pages below 1 read as 1. */
export function pageRange(page: number, pageSize: number): PageRange {
  const from = (Math.max(1, page) - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

/** Number of pages for a total, never below 1 so an empty listing has page 1. */
export function countPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/**
 * Whether a page query asked for a page past the last one: PostgREST refused
 * the range, or the range started exactly at the row count and came back
 * empty. Page 1 is never out of range — an empty first page is an empty
 * listing.
 */
export function isPastLastPage(page: number, result: PageQueryResult): boolean {
  if (page <= 1) return false
  if (result.error) return result.error.code === RANGE_NOT_SATISFIABLE
  return (result.data ?? []).length === 0
}

/**
 * Runs a paginated query for `page` and, when that page is past the last one,
 * runs it again for page 1 (#383). A stale or hand-edited `?page=` then shows
 * the start of the listing instead of an error or an empty grid. Returns the
 * page actually loaded with its result; the caller still checks the result's
 * error, which is any error other than the out-of-range one.
 */
export async function fetchPageOrFirst<R extends PageQueryResult>(
  page: number,
  runQuery: (page: number) => PromiseLike<R>,
): Promise<{ page: number; result: R }> {
  const requested = Math.max(1, page)
  const result = await runQuery(requested)
  if (!isPastLastPage(requested, result)) return { page: requested, result }
  return { page: 1, result: await runQuery(1) }
}
