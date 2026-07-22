import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCurationDraft,
  updateCurationDraft,
  type CurationDraftPatch,
} from '@/lib/supabase/queries/curation'
import { sanitizeChecklist, CURATION_FLAGS } from '@/lib/curation/checklist'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { validateSourceUrlMatchesPlatform } from '@/lib/supabase/queries/platforms'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import {
  COLOR_MAX_LENGTH,
  MATERIAL_MAX_LENGTH,
  parseDimensions,
  parseNonNegativeFloat,
  parseNonNegativeInt,
  parsePrintSettings,
} from '@/lib/utils/model-metadata'
import { isValidHttpUrl, isValidUuid, trimmedString } from '@/lib/utils/validation'

const SOURCE_URL_MAX_LENGTH = 2048
const AUTHOR_MAX_LENGTH = 200
const JUSTIFICATION_MAX_LENGTH = 1000

type RouteContext = { params: Promise<{ id: string }> }

async function requireOwnDraft(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, draft: null }

  if (!isValidUuid(id)) return { user, draft: null }

  const draft = await getCurationDraft(id)
  if (!draft || draft.user_id !== user.id) return { user, draft: null }
  return { user, draft }
}

// GET /api/curation/drafts/[id] — full draft state for session resume.
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    // user_id is fetched for the ownership check only — never echoed back.
    const clientDraft = { ...draft }
    delete clientDraft.user_id
    return NextResponse.json({ draft: clientDraft })
  } catch (error) {
    console.error('Failed to load curation draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/curation/drafts/[id] — partial autosave of the curation session.
// Accepts any subset of the editable fields; only provided keys are written.
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: 'Only drafts can be edited by the curation tool' }, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const supabase = await createClient()
    const patch: CurationDraftPatch = {}

    if (payload.title !== undefined) {
      const name = trimmedString(payload.title)
      if (name.length < VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH || name.length > VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Title must be between ${VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH} and ${VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH} characters` },
          { status: 400 },
        )
      }
      patch.name = name
    }

    if (payload.description !== undefined) {
      const description = trimmedString(payload.description)
      if (description.length > VALIDATION_LIMITS.MODEL.DESCRIPTION_MAX_LENGTH) {
        return NextResponse.json({ error: `Description must be at most ${VALIDATION_LIMITS.MODEL.DESCRIPTION_MAX_LENGTH} characters` }, { status: 400 })
      }
      patch.description = description || null
    }

    if (payload.instructions !== undefined) {
      const instructions = trimmedString(payload.instructions)
      if (instructions.length > VALIDATION_LIMITS.MODEL.INSTRUCTIONS_MAX_LENGTH) {
        return NextResponse.json({ error: `Instructions must be at most ${VALIDATION_LIMITS.MODEL.INSTRUCTIONS_MAX_LENGTH} characters` }, { status: 400 })
      }
      patch.instructions = instructions || null
    }

    if (payload.categoryId !== undefined) {
      const categoryId = trimmedString(payload.categoryId)
      if (categoryId) {
        if (!isValidUuid(categoryId)) {
          return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
        }
        const { data: category, error } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle()
        if (error || !category) return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 })
      }
      patch.category_id = categoryId || null
    }

    if (payload.brandId !== undefined) {
      const brandId = trimmedString(payload.brandId)
      if (brandId) {
        if (!isValidUuid(brandId)) {
          return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
        }
        const { data: brand, error } = await supabase.from('brands').select('id').eq('id', brandId).maybeSingle()
        if (error || !brand) return NextResponse.json({ error: 'Invalid brand selected' }, { status: 400 })
      }
      patch.brand_id = brandId || null
    }

    if (payload.licenseId !== undefined) {
      const licenseId = trimmedString(payload.licenseId)
      if (licenseId) {
        if (!isValidUuid(licenseId)) {
          return NextResponse.json({ error: 'Invalid license' }, { status: 400 })
        }
        const { data: license, error } = await supabase.from('licenses').select('id').eq('id', licenseId).maybeSingle()
        if (error || !license) return NextResponse.json({ error: 'Invalid license selected' }, { status: 400 })
      }
      patch.license_id = licenseId || null
    }

    if (payload.sourceLicenseId !== undefined) {
      const sourceLicenseId = trimmedString(payload.sourceLicenseId)
      if (!isValidUuid(sourceLicenseId)) {
        return NextResponse.json({ error: 'Source license is required for curated parts' }, { status: 400 })
      }
      const license = await getLicenseById(sourceLicenseId)
      if (!license) return NextResponse.json({ error: 'Invalid source license selected' }, { status: 400 })
      patch.source_license_id = sourceLicenseId
    }

    if (payload.sourcePlatform !== undefined) {
      // Shape only here — platform existence is validated once in the
      // cross-field invariant below, which knows the resulting hosting type.
      patch.source_platform = trimmedString(payload.sourcePlatform) || null
    }

    if (payload.fileHostingType !== undefined) {
      const fileHostingType = trimmedString(payload.fileHostingType)
      if (fileHostingType !== 'hosted' && fileHostingType !== 'link_out') {
        return NextResponse.json({ error: 'Invalid file hosting type' }, { status: 400 })
      }
      // Files already registered in storage contradict link-out (the whole
      // point is NOT hosting them) — and NC/ND licenses forbid hosting.
      if (fileHostingType === 'link_out' && draft.model_file_count > 0) {
        return NextResponse.json(
          { error: 'Model files are already uploaded — a link-out part must not host files' },
          { status: 409 },
        )
      }
      patch.file_hosting_type = fileHostingType
    }

    if (payload.originalAuthor !== undefined) {
      const originalAuthor = trimmedString(payload.originalAuthor)
      if (!originalAuthor || originalAuthor.length > AUTHOR_MAX_LENGTH) {
        return NextResponse.json({ error: `Original author is required (max ${AUTHOR_MAX_LENGTH} characters)` }, { status: 400 })
      }
      patch.original_author = originalAuthor
    }

    if (payload.originalAuthorUrl !== undefined) {
      const originalAuthorUrl = trimmedString(payload.originalAuthorUrl)
      if (originalAuthorUrl && (originalAuthorUrl.length > SOURCE_URL_MAX_LENGTH || !isValidHttpUrl(originalAuthorUrl))) {
        return NextResponse.json({ error: 'Original author URL must be a valid http(s) URL' }, { status: 400 })
      }
      patch.original_author_url = originalAuthorUrl || null
    }

    if (payload.tags !== undefined) {
      if (!Array.isArray(payload.tags)) {
        return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 })
      }
      const tags = payload.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
      if (tags.length > VALIDATION_LIMITS.MODEL.TAGS_MAX_COUNT) {
        return NextResponse.json({ error: `Too many tags (max ${VALIDATION_LIMITS.MODEL.TAGS_MAX_COUNT})` }, { status: 400 })
      }
      for (const tag of tags) {
        if (tag.length < VALIDATION_LIMITS.MODEL.TAG_MIN_LENGTH || tag.length > VALIDATION_LIMITS.MODEL.TAG_MAX_LENGTH) {
          return NextResponse.json(
            { error: `Tags must be between ${VALIDATION_LIMITS.MODEL.TAG_MIN_LENGTH} and ${VALIDATION_LIMITS.MODEL.TAG_MAX_LENGTH} characters` },
            { status: 400 },
          )
        }
      }
      patch.tags = tags
    }

    // Physical / print metadata — applies to any part (hosted or link-out).
    // Sent the same way the upload form serializes it: dimensions and
    // print_settings as JSON strings, estimates as numeric strings. Each field
    // must be a string when present; an empty string clears the column. A
    // non-string is rejected (not coerced) so a malformed payload never
    // silently wipes stored data on a partial autosave.
    if (payload.material !== undefined) {
      if (typeof payload.material !== 'string') {
        return NextResponse.json({ error: 'Material must be a string' }, { status: 400 })
      }
      const material = payload.material.trim()
      if (material.length > MATERIAL_MAX_LENGTH) {
        return NextResponse.json({ error: `Material is too long (max ${MATERIAL_MAX_LENGTH} characters)` }, { status: 400 })
      }
      patch.material = material || null
    }

    if (payload.color !== undefined) {
      if (typeof payload.color !== 'string') {
        return NextResponse.json({ error: 'Color must be a string' }, { status: 400 })
      }
      const color = payload.color.trim()
      if (color.length > COLOR_MAX_LENGTH) {
        return NextResponse.json({ error: `Color is too long (max ${COLOR_MAX_LENGTH} characters)` }, { status: 400 })
      }
      patch.color = color || null
    }

    if (payload.dimensions !== undefined) {
      if (typeof payload.dimensions !== 'string') {
        return NextResponse.json({ error: 'dimensions must be a JSON string' }, { status: 400 })
      }
      const raw = payload.dimensions.trim()
      if (!raw) {
        patch.dimensions = null
      } else {
        const result = parseDimensions(raw)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        patch.dimensions = result.data
      }
    }

    if (payload.print_settings !== undefined) {
      if (typeof payload.print_settings !== 'string') {
        return NextResponse.json({ error: 'print_settings must be a JSON string' }, { status: 400 })
      }
      const raw = payload.print_settings.trim()
      if (!raw) {
        patch.print_settings = null
      } else {
        const result = parsePrintSettings(raw)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        patch.print_settings = result.data
      }
    }

    if (payload.estimated_print_time !== undefined) {
      if (typeof payload.estimated_print_time !== 'string') {
        return NextResponse.json({ error: 'estimated_print_time must be a string' }, { status: 400 })
      }
      const raw = payload.estimated_print_time.trim()
      if (!raw) {
        patch.estimated_print_time = null
      } else {
        const result = parseNonNegativeInt(raw, 'estimated_print_time')
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        patch.estimated_print_time = result.data
      }
    }

    if (payload.estimated_material_usage !== undefined) {
      if (typeof payload.estimated_material_usage !== 'string') {
        return NextResponse.json({ error: 'estimated_material_usage must be a string' }, { status: 400 })
      }
      const raw = payload.estimated_material_usage.trim()
      if (!raw) {
        patch.estimated_material_usage = null
      } else {
        const result = parseNonNegativeFloat(raw, 'estimated_material_usage')
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        patch.estimated_material_usage = result.data
      }
    }

    if (payload.checklist !== undefined) {
      const checklist = sanitizeChecklist(payload.checklist)
      if (!checklist) {
        return NextResponse.json({ error: 'Checklist must be an object of criterion booleans' }, { status: 400 })
      }
      patch.curation_checklist = checklist
    }

    for (const flag of CURATION_FLAGS) {
      const raw = payload[flag.column]
      if (raw !== undefined) {
        if (typeof raw !== 'boolean') {
          return NextResponse.json({ error: `${flag.column} must be a boolean` }, { status: 400 })
        }
        patch[flag.column] = raw
      }
    }

    if (payload.needs_legal_review !== undefined) {
      if (typeof payload.needs_legal_review !== 'boolean') {
        return NextResponse.json({ error: 'needs_legal_review must be a boolean' }, { status: 400 })
      }
      patch.needs_legal_review = payload.needs_legal_review
    }

    if (payload.legalReviewJustification !== undefined) {
      const justification = trimmedString(payload.legalReviewJustification)
      if (justification.length > JUSTIFICATION_MAX_LENGTH) {
        return NextResponse.json({ error: `Justification must be at most ${JUSTIFICATION_MAX_LENGTH} characters` }, { status: 400 })
      }
      patch.legal_review_justification = justification || null
    }

    // Cross-field invariant: the resulting state of a link-out draft must name
    // a source platform whose domain matches the (immutable) source URL. This
    // is also the single place platform existence is checked (one round trip).
    const nextHostingType = patch.file_hosting_type ?? draft.file_hosting_type ?? 'hosted'
    const nextPlatform = patch.source_platform !== undefined ? patch.source_platform : draft.source_platform ?? null
    if (nextHostingType === 'link_out') {
      if (!nextPlatform) {
        return NextResponse.json({ error: 'A source platform is required for link-out parts' }, { status: 400 })
      }
      const platformCheck = await validateSourceUrlMatchesPlatform(nextPlatform, draft.source_url ?? '')
      if (!platformCheck.ok) {
        return NextResponse.json({ error: platformCheck.error }, { status: platformCheck.status })
      }
    } else if (patch.source_platform) {
      const { data: platform, error } = await supabase
        .from('source_platforms')
        .select('slug')
        .eq('slug', patch.source_platform)
        .maybeSingle()
      if (error || !platform) return NextResponse.json({ error: 'Unknown source platform' }, { status: 400 })
    }

    // Cross-field invariant: a hosted draft cannot carry an NC/ND source
    // license — those terms forbid hosting the files here (link-out only).
    if (nextHostingType === 'hosted') {
      const nextSourceLicenseId = patch.source_license_id ?? draft.source_license_id ?? null
      if (nextSourceLicenseId) {
        const sourceLicense = await getLicenseById(nextSourceLicenseId)
        if (sourceLicense && !isHostableLicenseRow(sourceLicense)) {
          return NextResponse.json(
            { error: 'The declared source license (NC/ND) does not allow hosting files here — switch to link-out' },
            { status: 400 },
          )
        }
      }
    }

    // The DB constraint also enforces this pair; failing early gives a clean 400.
    const nextNeedsLegalReview = patch.needs_legal_review ?? draft.needs_legal_review ?? false
    const nextJustification = patch.legal_review_justification !== undefined
      ? patch.legal_review_justification
      : draft.legal_review_justification ?? null
    if (nextNeedsLegalReview && !nextJustification) {
      return NextResponse.json({ error: 'A justification is required when flagging for legal review' }, { status: 400 })
    }

    let productIds: string[] | undefined
    if (payload.productIds !== undefined) {
      if (!Array.isArray(payload.productIds)) {
        return NextResponse.json({ error: 'productIds must be an array' }, { status: 400 })
      }
      const ids = [...new Set(payload.productIds.filter((p): p is string => typeof p === 'string' && isValidUuid(p)))]
      if (ids.length !== payload.productIds.length) {
        return NextResponse.json({ error: 'productIds must be unique product UUIDs' }, { status: 400 })
      }
      if (ids.length > VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT) {
        return NextResponse.json({ error: `Too many products (max ${VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT})` }, { status: 400 })
      }
      if (ids.length > 0) {
        const { data: rows, error } = await supabase.from('products').select('id').in('id', ids)
        if (error || !rows || rows.length !== ids.length) {
          return NextResponse.json({ error: 'One or more selected products are invalid' }, { status: 400 })
        }
      }
      productIds = ids
    }

    if (Object.keys(patch).length === 0 && productIds === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    await updateCurationDraft(id, user.id, patch, productIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update curation draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
