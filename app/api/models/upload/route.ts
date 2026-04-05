import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slug'
import { MODEL_UPLOAD_LIMITS, getFileExtension } from '@/lib/storage/file-validation'
import { FILE_TYPES, MAX_FILENAME_LENGTH } from '@/constants/app'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

export const runtime = 'nodejs'

const MODEL_EXTENSIONS = new Set(FILE_TYPES.MODEL_FILES.map((ext) => ext.toLowerCase()))
const IMAGE_EXTENSIONS = new Set(FILE_TYPES.IMAGE_FILES.map((ext) => ext.toLowerCase()))

interface FileInfo {
  name: string
  size: number
}

/**
 * Validates file metadata (names, sizes, counts) without requiring actual file bytes.
 * Used to pre-validate before the client uploads files directly to storage.
 */
function validateFileMetadata(
  modelFiles: FileInfo[],
  thumbnails: FileInfo[],
): { ok: boolean; issues: { field: string; message: string }[] } {
  const issues: { field: string; message: string }[] = []

  if (!modelFiles || modelFiles.length === 0) {
    issues.push({ field: 'files', message: 'At least one model file is required' })
  }
  if (modelFiles.length > MODEL_UPLOAD_LIMITS.maxModelFiles) {
    issues.push({ field: 'files', message: `Too many model files. Max ${MODEL_UPLOAD_LIMITS.maxModelFiles}` })
  }
  if (thumbnails.length > MODEL_UPLOAD_LIMITS.maxThumbnailFiles) {
    issues.push({ field: 'thumbnails', message: `Too many thumbnails. Max ${MODEL_UPLOAD_LIMITS.maxThumbnailFiles}` })
  }

  let totalSize = 0
  for (const file of modelFiles) {
    if (!Number.isFinite(file.size) || file.size < 0) {
      issues.push({ field: 'files', message: `File ${file.name} has an invalid size` })
      continue
    }
    if (file.name.length > MAX_FILENAME_LENGTH) {
      issues.push({ field: 'files', message: `Filename too long (max ${MAX_FILENAME_LENGTH} characters)` })
    }
    const ext = getFileExtension(file.name)
    if (!MODEL_EXTENSIONS.has(ext)) {
      issues.push({ field: 'files', message: `File ${file.name} has unsupported extension ${ext || '(none)'}` })
    }
    if (file.size > MODEL_UPLOAD_LIMITS.maxModelFileSize) {
      issues.push({ field: 'files', message: `File ${file.name} exceeds limit (${Math.round(MODEL_UPLOAD_LIMITS.maxModelFileSize / (1024 * 1024))}MB)` })
    }
    totalSize += file.size
  }
  for (const file of thumbnails) {
    if (!Number.isFinite(file.size) || file.size < 0) {
      issues.push({ field: 'thumbnails', message: `File ${file.name} has an invalid size` })
      continue
    }
    if (file.name.length > MAX_FILENAME_LENGTH) {
      issues.push({ field: 'thumbnails', message: `Filename too long (max ${MAX_FILENAME_LENGTH} characters)` })
    }
    const ext = getFileExtension(file.name)
    if (!IMAGE_EXTENSIONS.has(ext)) {
      issues.push({ field: 'thumbnails', message: `File ${file.name} has unsupported extension ${ext || '(none)'}` })
    }
    if (file.size > MODEL_UPLOAD_LIMITS.maxThumbnailSize) {
      issues.push({ field: 'thumbnails', message: `File ${file.name} exceeds limit (${Math.round(MODEL_UPLOAD_LIMITS.maxThumbnailSize / (1024 * 1024))}MB)` })
    }
    totalSize += file.size
  }
  if (totalSize > MODEL_UPLOAD_LIMITS.maxTotalSize) {
    issues.push({ field: 'files', message: 'Total upload size exceeds limit' })
  }

  return { ok: issues.length === 0, issues }
}

async function ensureUniqueSlug(name: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const base = slugify(name) || `model-${Date.now().toString(36)}`
  let candidate = base
  let counter = 1

  while (true) {
    const { data } = await supabase
      .from('models')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (!data) return candidate
    candidate = `${base}-${counter}`
    counter += 1
    if (counter > 50) {
      candidate = `${base}-${Date.now().toString(36)}`
      break
    }
  }

  return candidate
}


const VALID_ORIGIN_TYPES = ['original', 'curated', 'manufacturer'] as const
const VALID_VERIFICATION_STATUSES = ['unverified', 'author_tested', 'community_validated', 'certified'] as const
const ALLOWED_DIMENSION_UNITS = ['mm', 'cm', 'in'] as const
const ALLOWED_SUPPORT_TYPES = ['none', 'buildplate_only', 'everywhere'] as const

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string }

interface ValidDimensions {
  length?: number
  width?: number
  height?: number
  unit?: string
}

interface ValidPrintSettings {
  layer_height?: number
  infill?: number
  supports?: string
}

function parseNonNegativeInt(value: string, field: string): ParseResult<number> {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return { ok: false, error: `${field} must be a valid integer` }
  if (parsed < 0) return { ok: false, error: `${field} must be a non-negative number` }
  return { ok: true, data: parsed }
}

function parseNonNegativeFloat(value: string, field: string): ParseResult<number> {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return { ok: false, error: `${field} must be a valid number` }
  if (parsed < 0) return { ok: false, error: `${field} must be a non-negative number` }
  return { ok: true, data: parsed }
}

/**
 * Validates and parses a JSON dimensions string.
 * Expects { length?, width?, height? } as non-negative numbers and unit as mm|cm|in.
 */
function parseDimensions(raw: string): ParseResult<ValidDimensions> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON in dimensions' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'dimensions must be a JSON object' }
  }
  const obj = parsed as Record<string, unknown>
  if (obj.unit !== undefined && (typeof obj.unit !== 'string' || !(ALLOWED_DIMENSION_UNITS as readonly string[]).includes(obj.unit))) {
    return { ok: false, error: 'dimensions.unit must be one of: mm, cm, in' }
  }
  for (const key of ['length', 'width', 'height'] as const) {
    const val = obj[key]
    if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val) || val < 0)) {
      return { ok: false, error: `dimensions.${key} must be a non-negative finite number` }
    }
  }
  const result: ValidDimensions = {}
  if (obj.length !== undefined) result.length = obj.length as number
  if (obj.width !== undefined) result.width = obj.width as number
  if (obj.height !== undefined) result.height = obj.height as number
  if (obj.unit !== undefined) result.unit = obj.unit as string
  return { ok: true, data: result }
}

/**
 * Validates and parses a JSON print settings string.
 * Expects { layer_height?, infill?, supports? } with appropriate constraints.
 */
function parsePrintSettings(raw: string): ParseResult<ValidPrintSettings> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON in print_settings' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'print_settings must be a JSON object' }
  }
  const ps = parsed as Record<string, unknown>
  if (ps.layer_height !== undefined && (typeof ps.layer_height !== 'number' || !Number.isFinite(ps.layer_height) || ps.layer_height < 0)) {
    return { ok: false, error: 'print_settings.layer_height must be a non-negative finite number' }
  }
  if (ps.infill !== undefined && (typeof ps.infill !== 'number' || !Number.isFinite(ps.infill) || ps.infill < 0 || ps.infill > 100)) {
    return { ok: false, error: 'print_settings.infill must be a finite number between 0 and 100' }
  }
  if (ps.supports !== undefined && (typeof ps.supports !== 'string' || !(ALLOWED_SUPPORT_TYPES as readonly string[]).includes(ps.supports))) {
    return { ok: false, error: 'print_settings.supports must be one of: none, buildplate_only, everywhere' }
  }
  const result: ValidPrintSettings = {}
  if (ps.layer_height !== undefined) result.layer_height = ps.layer_height as number
  if (ps.infill !== undefined) result.infill = ps.infill as number
  if (ps.supports !== undefined) result.supports = ps.supports as string
  return { ok: true, data: result }
}

/**
 * Creates a model record from metadata only (no file bytes).
 * Files are uploaded directly to Supabase Storage by the client, then
 * registered via POST /api/models/[slug]/files.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const payload = body as Record<string, unknown>

    const name = typeof payload.title === 'string' ? payload.title.trim() : ''
    const description = typeof payload.description === 'string' ? payload.description.trim() || null : null
    const categoryId = typeof payload.category === 'string' ? payload.category.trim() || null : null
    const brandId = typeof payload.brand === 'string' ? payload.brand.trim() || null : null
    const productId = typeof payload.product === 'string' ? payload.product.trim() || null : null
    const licenseId = typeof payload.license_id === 'string' ? payload.license_id.trim() || null : null
    const isPublic = typeof payload.isPublic === 'boolean' ? payload.isPublic : true

    // Attribution & License fields
    const originType = typeof payload.origin_type === 'string' ? payload.origin_type.trim() : 'original'
    const sourceUrl = typeof payload.source_url === 'string' ? payload.source_url.trim() || null : null
    const sourcePlatform = typeof payload.source_platform === 'string' ? payload.source_platform.trim() || null : null
    const originalAuthor = typeof payload.original_author === 'string' ? payload.original_author.trim() || null : null
    const originalAuthorUrl = typeof payload.original_author_url === 'string' ? payload.original_author_url.trim() || null : null
    const sourceLicenseId = typeof payload.source_license_id === 'string' ? payload.source_license_id.trim() || null : null
    const verificationStatus = typeof payload.verification_status === 'string' ? payload.verification_status.trim() : 'unverified'

    // Advanced — print metadata fields
    const material = typeof payload.material === 'string' ? payload.material.trim() || null : null
    const color = typeof payload.color === 'string' ? payload.color.trim() || null : null
    const dimensionsRaw = typeof payload.dimensions === 'string' ? payload.dimensions.trim() : ''
    const printSettingsRaw = typeof payload.print_settings === 'string' ? payload.print_settings.trim() : ''
    const estimatedPrintTimeRaw = typeof payload.estimated_print_time === 'string' ? payload.estimated_print_time.trim() : ''
    const estimatedMaterialUsageRaw = typeof payload.estimated_material_usage === 'string' ? payload.estimated_material_usage.trim() : ''

    const tags = Array.isArray(payload.tags)
      ? payload.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
      : []

    if (tags.length > VALIDATION_LIMITS.MODEL.TAGS_MAX_COUNT) {
      return NextResponse.json({ error: `Too many tags (max ${VALIDATION_LIMITS.MODEL.TAGS_MAX_COUNT})` }, { status: 400 })
    }
    for (const tag of tags) {
      if (tag.length < VALIDATION_LIMITS.MODEL.TAG_MIN_LENGTH || tag.length > VALIDATION_LIMITS.MODEL.TAG_MAX_LENGTH) {
        return NextResponse.json(
          { error: `Tag \"${tag.slice(0, 30)}\" must be between ${VALIDATION_LIMITS.MODEL.TAG_MIN_LENGTH} and ${VALIDATION_LIMITS.MODEL.TAG_MAX_LENGTH} characters` },
          { status: 400 },
        )
      }
    }

    // File metadata validation (names and sizes only — no file bytes)
    const modelFileInfos: FileInfo[] = Array.isArray(payload.modelFiles)
      ? payload.modelFiles
          .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
          .map((f) => ({ name: String(f.name ?? ''), size: Number(f.size ?? 0) }))
      : []
    const thumbnailInfos: FileInfo[] = Array.isArray(payload.thumbnails)
      ? payload.thumbnails
          .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
          .map((f) => ({ name: String(f.name ?? ''), size: Number(f.size ?? 0) }))
      : []

    if (!name || name.length < 3) {
      return NextResponse.json({ error: 'Validation failed', issues: [{ field: 'title', message: 'Title must be at least 3 characters' }] }, { status: 400 })
    }

    const fileValidation = validateFileMetadata(modelFileInfos, thumbnailInfos)
    if (!fileValidation.ok) {
      return NextResponse.json({ error: 'Validation failed', issues: fileValidation.issues }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    if (productId && !brandId) {
      return NextResponse.json({ error: 'Brand is required when selecting a product' }, { status: 400 })
    }

    if (!(VALID_ORIGIN_TYPES as readonly string[]).includes(originType)) {
      return NextResponse.json({ error: 'Invalid origin type' }, { status: 400 })
    }

    if (!(VALID_VERIFICATION_STATUSES as readonly string[]).includes(verificationStatus)) {
      return NextResponse.json({ error: 'Invalid verification status' }, { status: 400 })
    }

    if (originType === 'curated') {
      if (!sourceUrl) {
        return NextResponse.json({ error: 'Source URL is required for curated models' }, { status: 400 })
      }
      if (!originalAuthor) {
        return NextResponse.json({ error: 'Original author is required for curated models' }, { status: 400 })
      }
      if (!sourceLicenseId) {
        return NextResponse.json({ error: 'Source license is required for curated models' }, { status: 400 })
      }
    }

    if (sourceUrl && sourceUrl.length > 2048) {
      return NextResponse.json({ error: 'Source URL is too long (max 2048 characters)' }, { status: 400 })
    }
    if (originalAuthorUrl && originalAuthorUrl.length > 2048) {
      return NextResponse.json({ error: 'Original author URL is too long (max 2048 characters)' }, { status: 400 })
    }
    if (originalAuthor && originalAuthor.length > 200) {
      return NextResponse.json({ error: 'Original author name is too long (max 200 characters)' }, { status: 400 })
    }
    if (material && material.length > 100) {
      return NextResponse.json({ error: 'Material is too long (max 100 characters)' }, { status: 400 })
    }
    if (color && color.length > 50) {
      return NextResponse.json({ error: 'Color is too long (max 50 characters)' }, { status: 400 })
    }

    let dimensions: ValidDimensions | null = null
    if (dimensionsRaw) {
      const result = parseDimensions(dimensionsRaw)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      dimensions = result.data
    }

    let printSettings: ValidPrintSettings | null = null
    if (printSettingsRaw) {
      const result = parsePrintSettings(printSettingsRaw)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      printSettings = result.data
    }

    let estimatedPrintTime: number | null = null
    if (estimatedPrintTimeRaw) {
      const result = parseNonNegativeInt(estimatedPrintTimeRaw, 'estimated_print_time')
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      estimatedPrintTime = result.data
    }

    let estimatedMaterialUsage: number | null = null
    if (estimatedMaterialUsageRaw) {
      const result = parseNonNegativeFloat(estimatedMaterialUsageRaw, 'estimated_material_usage')
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      estimatedMaterialUsage = result.data
    }

    const [categoryRow, brandRow, productRow, licenseRow, sourceLicenseRow] = await Promise.all([
      supabase.from('categories').select('id').eq('id', categoryId).maybeSingle(),
      brandId ? supabase.from('brands').select('id').eq('id', brandId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      productId
        ? supabase
          .from('products')
          .select('id, brand_id, category_id')
          .eq('id', productId)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      licenseId ? supabase.from('licenses').select('id').eq('id', licenseId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      sourceLicenseId ? supabase.from('licenses').select('id').eq('id', sourceLicenseId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ])

    if (categoryRow.error || !categoryRow.data) {
      return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 })
    }

    if (brandId && (brandRow.error || !brandRow.data)) {
      return NextResponse.json({ error: 'Invalid brand selected' }, { status: 400 })
    }

    if (licenseId && (licenseRow.error || !licenseRow.data)) {
      return NextResponse.json({ error: 'Invalid license selected' }, { status: 400 })
    }

    if (sourceLicenseId && (sourceLicenseRow.error || !sourceLicenseRow.data)) {
      return NextResponse.json({ error: 'Invalid source license selected' }, { status: 400 })
    }

    if (productId) {
      if (productRow.error || !productRow.data) {
        return NextResponse.json({ error: 'Invalid product selected' }, { status: 400 })
      }
      const prod = productRow.data
      if (brandId && prod.brand_id && prod.brand_id !== brandId) {
        return NextResponse.json({ error: 'Product does not belong to the selected brand' }, { status: 400 })
      }
      if (prod.category_id && prod.category_id !== categoryId) {
        return NextResponse.json({ error: 'Product does not belong to the selected category' }, { status: 400 })
      }
    }

    const slug = await ensureUniqueSlug(name, supabase)
    const intendedStatus = isPublic ? 'published' : 'draft'

    // Always create as draft — status is promoted after files are registered
    const { data: model, error: modelError } = await supabase
      .from('models')
      .insert({
        name,
        slug,
        description,
        category_id: categoryId,
        brand_id: brandId || null,
        product_id: productId || null,
        tags,
        license_id: licenseId,
        status: 'draft',
        user_id: user.id,
        // Attribution & origin
        origin_type: originType,
        source_url: sourceUrl,
        source_platform: sourcePlatform,
        original_author: originalAuthor,
        original_author_url: originalAuthorUrl,
        source_license_id: sourceLicenseId,
        verification_status: verificationStatus,
        // Print metadata
        material,
        color,
        dimensions,
        print_settings: printSettings,
        estimated_print_time: estimatedPrintTime,
        estimated_material_usage: estimatedMaterialUsage,
      })
      .select('id, slug')
      .single()

    if (modelError || !model) {
      console.error('Failed to insert model row', modelError)
      const isSourceUrlUniqueViolation =
        modelError?.code === '23505' &&
        (
          modelError?.message?.includes('idx_models_source_url') ||
          modelError?.message?.includes('source_url') ||
          modelError?.details?.includes('idx_models_source_url') ||
          modelError?.details?.includes('source_url')
        )
      if (isSourceUrlUniqueViolation) {
        return NextResponse.json({ error: 'A model with this source URL already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create model' }, { status: 500 })
    }

    return NextResponse.json({
      modelId: model.id,
      slug: model.slug,
      userId: user.id,
      intendedStatus,
    }, { status: 201 })
  } catch (error) {
    console.error('Model upload failed', error)
    return NextResponse.json({ error: 'Unexpected error while creating model' }, { status: 500 })
  }
}