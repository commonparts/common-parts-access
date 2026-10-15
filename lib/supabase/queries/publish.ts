import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Moves an owner's draft to `published`. Called only by the two publish
 * gates (`POST /api/upload/drafts/[id]/publish` and
 * `POST /api/curation/drafts/[id]/publish`), after they have verified the
 * session, the ownership and every blocking condition.
 *
 * Uses the service role: the status transition is reserved to the gates, so
 * that the database can refuse it from the public API keys (#403). No RLS
 * policy is involved. The update writes `status` only and is scoped to the
 * part, its owner and `status = 'draft'`, so it can neither publish another
 * user's part nor publish a part twice.
 *
 * Returns false when no row matched: the part was published concurrently or
 * is no longer a draft of this owner.
 */
export async function publishDraftPart(partId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('parts')
    .update({ status: 'published' })
    .eq('id', partId)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data !== null
}
