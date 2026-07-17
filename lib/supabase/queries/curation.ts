import { createClient } from '@/lib/supabase/server'
import { ensureUniqueModelSlug } from '@/lib/supabase/queries/model'
import type { CurationChecklist, Model } from '@/types/database'

// Full field set the curation tool reads back into a resumed session.
const CURATION_DRAFT_SELECT = `
  id, name, slug, description, instructions, status, origin_type,
  category_id, brand_id, license_id, tags, thumbnail_url,
  source_url, source_platform, original_author, original_author_url, source_license_id,
  verification_status, file_hosting_type,
  needs_verification, needs_print_settings, needs_photo, needs_instructions,
  needs_category, needs_legal_review, legal_review_justification,
  curation_checklist, created_at, updated_at
`

// Drafts list is a picker, not a browse surface — a hard cap is enough.
const DRAFTS_LIST_LIMIT = 50

export interface SourceUrlMatch {
  id: string
  name: string
  slug: string
  status: string
}

/**
 * Finds a model with the given source_url — the duplicate check behind the
 * source step (unique index idx_models_source_url enforces this at the DB).
 * RLS scope: published models plus the caller's own rows. A draft owned by a
 * different user is invisible here but still rejected by the unique index on
 * insert, which callers must handle.
 */
export async function findModelBySourceUrl(sourceUrl: string): Promise<SourceUrlMatch | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('models')
    .select('id, name, slug, status')
    .eq('source_url', sourceUrl)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as SourceUrlMatch | null) ?? null
}

export interface CurationDraftListItem {
  id: string
  name: string
  slug: string
  source_url: string | null
  curation_checklist: CurationChecklist
  updated_at: string | null
}

/**
 * Lists the caller's curated drafts, most recently touched first, so an
 * interrupted session can be resumed. RLS restricts rows to the owner; the
 * explicit user filter documents intent and keeps the query index-friendly.
 */
export async function listCurationDrafts(userId: string): Promise<CurationDraftListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('models')
    .select('id, name, slug, source_url, curation_checklist, updated_at')
    .eq('user_id', userId)
    .eq('origin_type', 'curated')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(DRAFTS_LIST_LIMIT)

  if (error) throw error
  return (data ?? []) as CurationDraftListItem[]
}

export interface CurationDraft extends Partial<Model> {
  id: string
  name: string
  slug: string
  product_ids: string[]
  model_file_count: number
  image_file_count: number
}

/**
 * Loads one curated draft with its linked product ids and registered file
 * counts — everything the tool needs to resume a session. Returns null when
 * the row does not exist or belongs to another user (RLS hides it).
 */
export async function getCurationDraft(id: string): Promise<CurationDraft | null> {
  const supabase = await createClient()

  const { data: model, error } = await supabase
    .from('models')
    .select(CURATION_DRAFT_SELECT)
    .eq('id', id)
    .eq('origin_type', 'curated')
    .maybeSingle()

  if (error) throw error
  if (!model) return null

  const [{ data: links, error: linksError }, { data: files, error: filesError }] = await Promise.all([
    supabase.from('model_products').select('product_id').eq('model_id', id).limit(50),
    supabase.from('model_files').select('id, file_category').eq('model_id', id).limit(100),
  ])

  if (linksError) throw linksError
  if (filesError) throw filesError

  const fileRows = files ?? []
  return {
    ...(model as unknown as Model),
    product_ids: (links ?? []).map((l) => l.product_id as string),
    model_file_count: fileRows.filter((f) => f.file_category === 'model').length,
    image_file_count: fileRows.filter((f) => f.file_category === 'image').length,
  }
}

export interface CreateCurationDraftInput {
  name: string
  sourceUrl: string
  originalAuthor: string
  sourceLicenseId: string
  sourcePlatform?: string | null
  originalAuthorUrl?: string | null
}

/**
 * Creates the persistent draft row as soon as the source step is complete.
 * origin_type 'curated' requires source_url + original_author +
 * source_license_id at the DB level (curated_requires_source), which is why
 * these three are the creation minimum — everything else arrives via PATCH.
 * Covered by the "Users can manage own models" RLS policy.
 */
export async function createCurationDraft(
  userId: string,
  input: CreateCurationDraftInput,
): Promise<{ id: string; slug: string }> {
  const supabase = await createClient()
  const slug = await ensureUniqueModelSlug(input.name, supabase)

  const { data, error } = await supabase
    .from('models')
    .insert({
      name: input.name,
      slug,
      user_id: userId,
      status: 'draft',
      origin_type: 'curated',
      source_url: input.sourceUrl,
      source_platform: input.sourcePlatform ?? null,
      original_author: input.originalAuthor,
      original_author_url: input.originalAuthorUrl ?? null,
      source_license_id: input.sourceLicenseId,
      file_hosting_type: 'hosted',
    })
    .select('id, slug')
    .single()

  if (error) throw error
  return data as { id: string; slug: string }
}

/** Column-shaped patch for a curated draft; only defined keys are written. */
export interface CurationDraftPatch {
  name?: string
  description?: string | null
  instructions?: string | null
  category_id?: string | null
  brand_id?: string | null
  license_id?: string | null
  tags?: string[]
  source_platform?: string | null
  original_author?: string
  original_author_url?: string | null
  source_license_id?: string
  curation_checklist?: CurationChecklist
  needs_verification?: boolean
  needs_print_settings?: boolean
  needs_photo?: boolean
  needs_instructions?: boolean
  needs_category?: boolean
  needs_legal_review?: boolean
  legal_review_justification?: string | null
  status?: 'draft' | 'published'
}

/**
 * Applies a partial update to a curated draft and, when productIds is given,
 * syncs model_products to exactly that set. Ownership is enforced by RLS plus
 * the explicit user filter; the update is scoped to curated rows so the
 * endpoint can never mutate a regular upload.
 */
export async function updateCurationDraft(
  id: string,
  userId: string,
  patch: CurationDraftPatch,
  productIds?: string[],
): Promise<void> {
  const supabase = await createClient()

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('models')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .eq('origin_type', 'curated')

    if (error) throw error
  }

  if (productIds) {
    const { data: existing, error: readError } = await supabase
      .from('model_products')
      .select('product_id')
      .eq('model_id', id)
      .limit(50)

    if (readError) throw readError

    const current = new Set((existing ?? []).map((l) => l.product_id as string))
    const target = new Set(productIds)
    const toAdd = productIds.filter((pid) => !current.has(pid))
    const toRemove = [...current].filter((pid) => !target.has(pid))

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('model_products')
        .delete()
        .eq('model_id', id)
        .in('product_id', toRemove)
      if (error) throw error
    }

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('model_products')
        .insert(toAdd.map((pid) => ({ model_id: id, product_id: pid })))
      if (error) throw error
    }
  }
}

export interface CurationRejectionInput {
  sourceUrl: string
  reason: string
  failedCriteria: string[]
}

/**
 * Records a curation rejection for traceability. Insert-only: the
 * "Authenticated can record rejections" RLS policy pins created_by to the
 * session user.
 */
export async function insertCurationRejection(
  userId: string,
  input: CurationRejectionInput,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('curation_rejections').insert({
    source_url: input.sourceUrl,
    reason: input.reason,
    failed_criteria: input.failedCriteria,
    created_by: userId,
  })

  if (error) throw error
}
