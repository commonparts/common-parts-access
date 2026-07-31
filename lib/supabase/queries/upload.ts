import { createClient } from '@/lib/supabase/server'
import { ensureUniqueModelSlug } from '@/lib/supabase/queries/model'
import type { Model, ModelDimensions, ModelPrintSettings } from '@/types/database'

/**
 * Draft CRUD for the public upload flow (issue #293) — contributors publishing
 * their own original parts, hosted here.
 *
 * Every query is scoped to `origin_type = 'original'`, the mirror of the
 * `'curated'` scoping in `queries/curation.ts`. That single filter is what
 * keeps the two flows from ever touching each other's drafts: the upload
 * endpoints cannot mutate a curation session, and vice versa.
 */

// Full field set the upload tool reads back into a resumed session.
// user_id must stay in this list — the draft routes compare it against the
// session user, and an absent field reads as undefined (the bug that made
// every curation draft 404 for its own owner, 2026-07-18).
const UPLOAD_DRAFT_SELECT = `
  id, name, slug, user_id, description, instructions, status, origin_type,
  category_id, brand_id, license_id, tags, thumbnail_url, images,
  verification_status, file_hosting_type,
  material, color, dimensions, print_settings,
  estimated_print_time, estimated_material_usage,
  originality_attested, originality_attested_at, created_at, updated_at
`

// The drafts list is a picker, not a browse surface — a hard cap is enough.
const DRAFTS_LIST_LIMIT = 50

// Linked-product and file reads are bounded by the same limits the rest of
// the flow enforces, so neither can grow into an unbounded fetch.
const PRODUCT_LINKS_LIMIT = 50
const MODEL_FILES_LIMIT = 100

export interface UploadDraftListItem {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  updated_at: string | null
}

/**
 * Lists the contributor's own open upload drafts, most recently touched
 * first, so an interrupted session can be resumed. RLS restricts rows to the
 * owner; the explicit user filter documents intent and keeps the query on
 * idx_models_owner_origin_status.
 */
export async function listUploadDrafts(userId: string): Promise<UploadDraftListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('models')
    .select('id, name, slug, thumbnail_url, updated_at')
    .eq('user_id', userId)
    .eq('origin_type', 'original')
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(DRAFTS_LIST_LIMIT)

  if (error) throw error
  return (data ?? []) as UploadDraftListItem[]
}

export interface UploadDraft extends Partial<Model> {
  id: string
  name: string
  slug: string
  product_ids: string[]
  model_file_count: number
  image_file_count: number
}

/**
 * Loads one upload draft with its linked product ids and registered file
 * counts — everything the tool needs to resume a session. Returns null when
 * the row does not exist, is not an original upload, or belongs to another
 * user (RLS hides it).
 */
export async function getUploadDraft(id: string): Promise<UploadDraft | null> {
  const supabase = await createClient()

  const { data: model, error } = await supabase
    .from('models')
    .select(UPLOAD_DRAFT_SELECT)
    .eq('id', id)
    .eq('origin_type', 'original')
    .maybeSingle()

  if (error) throw error
  if (!model) return null

  const [{ data: links, error: linksError }, { data: files, error: filesError }] = await Promise.all([
    supabase.from('model_products').select('product_id').eq('model_id', id).limit(PRODUCT_LINKS_LIMIT),
    supabase.from('model_files').select('id, file_category').eq('model_id', id).limit(MODEL_FILES_LIMIT),
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

export interface CreateUploadDraftInput {
  name: string
  categoryId: string
  licenseId: string
}

/**
 * Creates the draft row once the first step is complete. The originality
 * declaration is recorded at creation rather than at publish: a draft in the
 * public flow only exists because someone claimed authorship, and pinning
 * the timestamp here dates the claim to when it was actually made.
 *
 * origin_type, file_hosting_type and verification_status are set explicitly
 * rather than left to their column defaults — the public flow's whole premise
 * is that these three are not the contributor's to choose.
 *
 * Covered by the "Users can manage own models" RLS policy.
 */
export async function createUploadDraft(
  userId: string,
  input: CreateUploadDraftInput,
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
      origin_type: 'original',
      file_hosting_type: 'hosted',
      verification_status: 'unverified',
      category_id: input.categoryId,
      license_id: input.licenseId,
      originality_attested: true,
      originality_attested_at: new Date().toISOString(),
    })
    .select('id, slug')
    .single()

  if (error) throw error
  return data as { id: string; slug: string }
}

/**
 * Column-shaped patch for an upload draft; only defined keys are written.
 *
 * Deliberately absent: origin_type, file_hosting_type, verification_status
 * and every source-attribution column. They are not editable through this
 * flow at all, so there is no key here for a caller to set — the narrowing
 * is enforced by the type, not only by route validation.
 */
export interface UploadDraftPatch {
  name?: string
  description?: string | null
  instructions?: string | null
  category_id?: string
  brand_id?: string | null
  license_id?: string
  tags?: string[]
  material?: string | null
  color?: string | null
  dimensions?: ModelDimensions | null
  print_settings?: ModelPrintSettings | null
  estimated_print_time?: number | null
  estimated_material_usage?: number | null
  status?: 'draft' | 'published'
}

/**
 * Applies a partial update to an upload draft and, when productIds is given,
 * syncs model_products to exactly that set. Ownership is enforced by RLS plus
 * the explicit user filter; the update is scoped to original rows so the
 * endpoint can never mutate a curation draft.
 */
export async function updateUploadDraft(
  id: string,
  userId: string,
  patch: UploadDraftPatch,
  productIds?: string[],
): Promise<void> {
  const supabase = await createClient()

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('models')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .eq('origin_type', 'original')

    if (error) throw error
  }

  if (productIds) {
    const { data: existing, error: readError } = await supabase
      .from('model_products')
      .select('product_id')
      .eq('model_id', id)
      .limit(PRODUCT_LINKS_LIMIT)

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
