import type { Tables } from '@/types/supabase'
import type { PartColumnDomains } from '@/types/database'

/** The columns of `Row` that `PartColumnDomains` narrows, replaced by their domain types. */
type NarrowedPartRow<Row extends Partial<Tables<'parts'>>> = Omit<Row, keyof PartColumnDomains> &
  Pick<PartColumnDomains, Extract<keyof Row, keyof PartColumnDomains>>

/**
 * Narrows the constrained columns of a selected `parts` row to their domain
 * types (`PartStatus`, `PartDimensions`…), keeping every other column as the
 * generated type has it.
 *
 * This is the single place where the narrowing is asserted rather than
 * checked. The generator types a text column as `string` even when a CHECK
 * constraint restricts it to a fixed list (status, origin_type,
 * verification_status, file_hosting_type), and a jsonb column as `Json`. The
 * database enforces the text domains; the jsonb columns are only written
 * through the API routes, whose Zod schemas give them their shape.
 */
export function narrowPartRow<Row extends Partial<Tables<'parts'>>>(row: Row): NarrowedPartRow<Row> {
  // Cast: see above — the values are the ones the constraints allow, which
  // the generated types cannot express.
  return row as unknown as NarrowedPartRow<Row>
}
