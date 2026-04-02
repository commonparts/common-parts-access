import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slug'
import { uploadModelAssets } from '@/lib/storage/upload'
import { validateModelUpload } from '@/lib/storage/file-validation'

export const runtime = 'nodejs'

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

async function cleanupUploadedAssets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: { bucket: string; path: string }[],
) {
  const grouped = paths.reduce<Record<string, string[]>>((acc, asset) => {
    acc[asset.bucket] = acc[asset.bucket] || []
    acc[asset.bucket].push(asset.path)
    return acc
  }, {})

  await Promise.all(
    Object.entries(grouped).map(([bucket, bucketPaths]) =>
      supabase.storage.from(bucket).remove(bucketPaths),
    ),
  )
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

function parseIntOrNull(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseFloatOrNull(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
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
    if (val !== undefined && (typeof val !== 'number' || Number.isNaN(val) || val < 0)) {
      return { ok: false, error: `dimensions.${key} must be a non-negative number` }
    }
  }
  return { ok: true, data: parsed as ValidDimensions }
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
  if (ps.layer_height !== undefined && (typeof ps.layer_height !== 'number' || Number.isNaN(ps.layer_height) || ps.layer_height < 0)) {
    return { ok: false, error: 'print_settings.layer_height must be a non-negative number' }
  }
  if (ps.infill !== undefined && (typeof ps.infill !== 'number' || Number.isNaN(ps.infill) || ps.infill < 0 || ps.infill > 100)) {
    return { ok: false, error: 'print_settings.infill must be a number between 0 and 100' }
  }
  if (ps.supports !== undefined && (typeof ps.supports !== 'string' || !(ALLOWED_SUPPORT_TYPES as readonly string[]).includes(ps.supports))) {
    return { ok: false, error: 'print_settings.supports must be one of: none, buildplate_only, everywhere' }
  }
  return { ok: true, data: parsed as ValidPrintSettings }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const name = (formData.get('title') || formData.get('name') || '').toString().trim()
    const description = (formData.get('description') || '').toString().trim() || null
    const categoryId = (formData.get('category') || '').toString().trim() || null
    const brandId = (formData.get('brand') || '').toString().trim() || null
    const productId = (formData.get('product') || '').toString().trim() || null
    const licenseId = (formData.get('license_id') || '').toString().trim() || null
    const isPublic = String(formData.get('isPublic') ?? 'true') === 'true'

    // Attribution & License fields
    const originType = (formData.get('origin_type') || 'original').toString().trim()
    const sourceUrl = (formData.get('source_url') || '').toString().trim() || null
    const sourcePlatform = (formData.get('source_platform') || '').toString().trim() || null
    const originalAuthor = (formData.get('original_author') || '').toString().trim() || null
    const originalAuthorUrl = (formData.get('original_author_url') || '').toString().trim() || null
    const sourceLicenseId = (formData.get('source_license_id') || '').toString().trim() || null
    const verificationStatus = (formData.get('verification_status') || 'unverified').toString().trim()

    // Advanced — print metadata fields
    const material = (formData.get('material') || '').toString().trim() || null
    const color = (formData.get('color') || '').toString().trim() || null
    const dimensionsRaw = (formData.get('dimensions') || '').toString().trim()
    const printSettingsRaw = (formData.get('print_settings') || '').toString().trim()
    const estimatedPrintTimeRaw = (formData.get('estimated_print_time') || '').toString().trim()
    const estimatedMaterialUsageRaw = (formData.get('estimated_material_usage') || '').toString().trim()

    const tags = formData.getAll('tags').map((tag) => tag.toString().trim()).filter(Boolean)
    const modelFiles = formData.getAll('files').filter((value): value is File => value instanceof File)
    const thumbnails = formData.getAll('thumbnails').filter((value): value is File => value instanceof File)

    const validation = validateModelUpload({
      name,
      category: categoryId,
      tags,
      modelFiles,
      thumbnails,
    })

    if (!validation.ok) {
      return NextResponse.json({ error: 'Validation failed', issues: validation.issues }, { status: 400 })
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

    const estimatedPrintTime = estimatedPrintTimeRaw ? parseIntOrNull(estimatedPrintTimeRaw) : null
    const estimatedMaterialUsage = estimatedMaterialUsageRaw ? parseFloatOrNull(estimatedMaterialUsageRaw) : null

    if (estimatedPrintTime !== null && estimatedPrintTime < 0) {
      return NextResponse.json({ error: 'estimated_print_time must be a non-negative number' }, { status: 400 })
    }

    if (estimatedMaterialUsage !== null && estimatedMaterialUsage < 0) {
      return NextResponse.json({ error: 'estimated_material_usage must be a non-negative number' }, { status: 400 })
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
    const status = isPublic ? 'published' : 'draft'

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
        status,
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

    const uploads = await uploadModelAssets({
      supabase,
      userId: user.id,
      modelId: model.id,
      modelFiles: validation.modelFiles,
      thumbnails: validation.thumbnails,
    })

    const fileRows = [
      ...uploads.modelFiles.map((asset) => ({
        model_id: model.id,
        filename: asset.filename,
        original_filename: asset.originalName,
        file_type: asset.extension,
        file_size: asset.size,
        file_url: asset.publicUrl,
        file_category: 'model',
        upload_path: asset.path,
      })),
      ...uploads.thumbnails.map((asset) => ({
        model_id: model.id,
        filename: asset.filename,
        original_filename: asset.originalName,
        file_type: asset.extension,
        file_size: asset.size,
        file_url: asset.publicUrl,
        file_category: 'image',
        upload_path: asset.path,
      })),
    ]

    if (fileRows.length > 0) {
      const { error: filesError } = await supabase.from('model_files').insert(fileRows)
      if (filesError) {
        await cleanupUploadedAssets(supabase, [...uploads.modelFiles, ...uploads.thumbnails])
        console.error('Failed to insert model_files rows', filesError)
        return NextResponse.json({ error: 'Failed to persist uploaded files' }, { status: 500 })
      }
    }

    if (uploads.primaryThumbnailUrl || uploads.imageUrls.length) {
      const { error: updateError } = await supabase
        .from('models')
        .update({
          thumbnail_url: uploads.primaryThumbnailUrl,
          images: uploads.imageUrls,
        })
        .eq('id', model.id)
        .select('id')
        .single()

      if (updateError) {
        console.warn('Uploaded but failed to update thumbnail/images', updateError)
      }
    }

    return NextResponse.json({
      modelId: model.id,
      slug: model.slug,
      status,
      fileCount: uploads.modelFiles.length,
      thumbnailUrl: uploads.primaryThumbnailUrl,
      images: uploads.imageUrls,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while uploading model'
    const isUnsupported = message.toLowerCase().includes('unsupported content type') || message.toLowerCase().includes('mime type')
    console.error('Model upload failed', error)
    return NextResponse.json({ error: message }, { status: isUnsupported ? 400 : 500 })
  }
}