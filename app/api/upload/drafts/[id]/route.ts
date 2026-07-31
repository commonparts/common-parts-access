import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getUploadDraft,
  updateUploadDraft,
  type UploadDraftPatch,
} from '@/lib/supabase/queries/upload'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { findForbiddenField, forbiddenFieldError } from '@/lib/upload/payload'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import {
  COLOR_MAX_LENGTH,
  MATERIAL_MAX_LENGTH,
  parseDimensions,
  parseNonNegativeFloat,
  parseNonNegativeInt,
  parsePrintSettings,
} from '@/lib/utils/model-metadata'
import { isValidUuid, trimmedString } from '@/lib/utils/validation'

type RouteContext = { params: Promise<{ id: string }> }

async function requireOwnDraft(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, draft: null }

  if (!isValidUuid(id)) return { user, draft: null }

  const draft = await getUploadDraft(id)
  if (!draft || draft.user_id !== user.id) return { user, draft: null }
  return { user, draft }
}

// GET /api/upload/drafts/[id] — full draft state for session resume.
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
    console.error('Failed to load upload draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/upload/drafts/[id] — partial autosave of the upload session.
// Accepts any subset of the editable fields; only provided keys are written.
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: 'Only drafts can be edited by the upload flow' }, { status: 409 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const payload = body as Record<string, unknown>

    const forbidden = findForbiddenField(payload)
    if (forbidden) {
      return NextResponse.json({ error: forbiddenFieldError(forbidden) }, { status: 400 })
    }

    const supabase = await createClient()
    const patch: UploadDraftPatch = {}

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

    // Category and license are set at creation and stay required — unlike the
    // curation draft, neither can be cleared back to null here.
    if (payload.categoryId !== undefined) {
      const categoryId = trimmedString(payload.categoryId)
      if (!isValidUuid(categoryId)) {
        return NextResponse.json({ error: 'A category is required' }, { status: 400 })
      }
      const { data: category, error } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle()
      if (error || !category) return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 })
      patch.category_id = categoryId
    }

    if (payload.licenseId !== undefined) {
      const licenseId = trimmedString(payload.licenseId)
      if (!isValidUuid(licenseId)) {
        return NextResponse.json({ error: 'A license is required' }, { status: 400 })
      }
      const license = await getLicenseById(licenseId)
      if (!license) return NextResponse.json({ error: 'Invalid license selected' }, { status: 400 })
      if (!isHostableLicenseRow(license)) {
        return NextResponse.json(
          { error: 'Hosting requires a license allowing commercial use and modification (no NC/ND restrictions)' },
          { status: 400 },
        )
      }
      patch.license_id = licenseId
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

    // Physical / print metadata, sent the way the shared serializer emits it:
    // dimensions and print_settings as JSON strings, estimates as numeric
    // strings. Each must be a string when present; an empty string clears the
    // column. A non-string is rejected rather than coerced, so a malformed
    // payload never silently wipes stored data on a partial autosave.
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

    await updateUploadDraft(id, user.id, patch, productIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update upload draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
