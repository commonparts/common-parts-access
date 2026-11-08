import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Moves an owner's draft to `published`. Called only by the two publish
 * gates (`publishPublication` in `lib/actions/publish.ts`), after they have verified the
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

/** Public category read under Categories are publicly readable; filtered by its primary key. */
export async function isDraftCategoryValid(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('categories').select('id').eq('id', id).maybeSingle()
  return !error && Boolean(data)
}

/** Public product read under Products are publicly readable; bounded by the validated id list. */
export async function areDraftProductsValid(ids: string[]): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('products').select('id').in('id', ids).limit(ids.length)
  return !error && data?.length === ids.length
}
