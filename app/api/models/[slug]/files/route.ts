import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FILE_TYPES, MAX_FILENAME_LENGTH, STORAGE_BUCKETS } from '@/constants/app'
import { MODEL_UPLOAD_LIMITS } from '@/lib/storage/file-validation'
import { sortImageUrls } from '@/lib/utils/images'

export const runtime = 'nodejs'

const MAX_FILES_PER_REQUEST =
  MODEL_UPLOAD_LIMITS.maxModelFiles + MODEL_UPLOAD_LIMITS.maxThumbnailFiles
const MAX_PATH_LENGTH = 500

const MODEL_EXTENSIONS = new Set(FILE_TYPES.MODEL_FILES.map((ext) => ext.toLowerCase()))
const IMAGE_EXTENSIONS = new Set(FILE_TYPES.IMAGE_FILES.map((ext) => ext.toLowerCase()))

const CATEGORY_BUCKET_MAP: Record<string, string> = {
  model: STORAGE_BUCKETS.MODEL_FILES,
  image: STORAGE_BUCKETS.MODEL_THUMBNAILS,
} as const

const CATEGORY_FOLDER_MAP: Record<string, string> = {
  model: 'files',
  image: 'thumbnails',
} as const

/**
 * Registers uploaded files for an existing model after the client has uploaded
 * them directly to Supabase Storage. Also updates model thumbnail/images.
 *
 * Uses the [slug] route param to look up the model.
 * Derives public URLs server-side from bucket + path — never trusts client URLs.
 *
 * Requires: authenticated user who owns the model.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = await context.params

    if (!slug || slug.length > 200) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
    }

    // Look up the model by slug — include images fields for merge on update
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, user_id, thumbnail_url, images')
      .eq('slug', slug)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (model.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const modelId = model.id

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
    const files = Array.isArray(payload.files) ? payload.files : []

    // Optional: promote model status after files are registered
    const intendedStatus = payload.intendedStatus === 'published' ? 'published' : null

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `Too many files (max ${MAX_FILES_PER_REQUEST})` }, { status: 400 })
    }

    // Validate and build each file row
    const fileRows: {
      model_id: string
      filename: string
      original_filename: string
      file_type: string
      file_size: number
      file_url: string
      file_category: string
      upload_path: string
    }[] = []

    for (const raw of files) {
      if (typeof raw !== 'object' || raw === null) {
        return NextResponse.json({ error: 'Invalid file entry' }, { status: 400 })
      }
      const entry = raw as Record<string, unknown>

      const originalName = typeof entry.originalName === 'string' ? entry.originalName.trim() : ''
      const filename = typeof entry.filename === 'string' ? entry.filename.trim() : ''
      const extension = typeof entry.extension === 'string' ? entry.extension.trim().toLowerCase() : ''
      const size = typeof entry.size === 'number' && Number.isFinite(entry.size) && entry.size >= 0
        ? entry.size
        : -1
      const path = typeof entry.path === 'string' ? entry.path.trim() : ''
      const bucket = typeof entry.bucket === 'string' ? entry.bucket.trim() : ''
      const category = typeof entry.category === 'string' ? entry.category.trim() : ''

      if (!originalName || originalName.length > MAX_FILENAME_LENGTH) {
        return NextResponse.json({ error: `Invalid original filename: ${originalName.slice(0, 50)}` }, { status: 400 })
      }
      if (/[\/\\]|\.\./.test(originalName)) {
        return NextResponse.json({ error: 'Original filename contains invalid characters' }, { status: 400 })
      }
      if (!filename || filename.length > MAX_FILENAME_LENGTH) {
        return NextResponse.json({ error: `Invalid filename: ${filename.slice(0, 50)}` }, { status: 400 })
      }
      if (/[\/\\]|\.\./.test(filename)) {
        return NextResponse.json({ error: 'Filename contains invalid path characters' }, { status: 400 })
      }
      if (size < 0) {
        return NextResponse.json({ error: `Invalid file size for ${originalName.slice(0, 50)}` }, { status: 400 })
      }
      if (!path || path.length > MAX_PATH_LENGTH) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
      }

      // Validate category and matching bucket before applying category-specific limits
      const expectedBucket = CATEGORY_BUCKET_MAP[category]
      if (!expectedBucket) {
        return NextResponse.json({ error: `Invalid file category: ${category}` }, { status: 400 })
      }
      if (bucket !== expectedBucket) {
        return NextResponse.json({ error: `Bucket mismatch for category "${category}"` }, { status: 400 })
      }

      // Enforce per-file size limits matching phase-1 validation
      const maxFileSize = category === 'model'
        ? MODEL_UPLOAD_LIMITS.maxModelFileSize
        : MODEL_UPLOAD_LIMITS.maxThumbnailSize
      if (size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${originalName.slice(0, 50)} exceeds size limit (${Math.round(maxFileSize / (1024 * 1024))}MB)` },
          { status: 400 },
        )
      }

      // Validate extension against category allowlist
      const extWithDot = extension.startsWith('.') ? extension : `.${extension}`
      // Store extension without leading dot for DB consistency
      const normalizedExtension = extension.replace(/^\./, '')
      const allowedExtensions = category === 'model' ? MODEL_EXTENSIONS : IMAGE_EXTENSIONS
      if (!allowedExtensions.has(extWithDot)) {
        return NextResponse.json({ error: `Extension "${extension}" not allowed for category "${category}"` }, { status: 400 })
      }

      // Verify extension matches the filename
      if (!filename.toLowerCase().endsWith(extWithDot)) {
        return NextResponse.json({ error: `Extension "${extension}" does not match filename "${filename.slice(0, 50)}"` }, { status: 400 })
      }

      // Verify the path exactly matches the expected structure
      const expectedFolder = CATEGORY_FOLDER_MAP[category]
      const expectedPath = `${user.id}/${modelId}/${expectedFolder}/${filename}`
      if (path !== expectedPath) {
        return NextResponse.json({ error: 'File path does not match authenticated user, model, and filename' }, { status: 403 })
      }

      // Derive public URL server-side — never trust client-provided URLs
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)

      fileRows.push({
        model_id: modelId,
        filename,
        original_filename: originalName,
        file_type: normalizedExtension,
        file_size: size,
        file_url: publicData.publicUrl,
        file_category: category,
        upload_path: path,
      })
    }

    // Enforce total size limit across all files in this request
    const newBatchSize = fileRows.reduce((sum, f) => sum + f.file_size, 0)
    if (newBatchSize > MODEL_UPLOAD_LIMITS.maxTotalSize) {
      return NextResponse.json({ error: 'Total upload size exceeds limit' }, { status: 400 })
    }

    // Enforce per-category counts within this request
    const modelCount = fileRows.filter((f) => f.file_category === 'model').length
    const imageCount = fileRows.filter((f) => f.file_category === 'image').length

    if (modelCount > MODEL_UPLOAD_LIMITS.maxModelFiles) {
      return NextResponse.json(
        { error: `Too many model files (max ${MODEL_UPLOAD_LIMITS.maxModelFiles})` },
        { status: 400 },
      )
    }
    if (imageCount > MODEL_UPLOAD_LIMITS.maxThumbnailFiles) {
      return NextResponse.json(
        { error: `Too many thumbnails (max ${MODEL_UPLOAD_LIMITS.maxThumbnailFiles})` },
        { status: 400 },
      )
    }

    // Check cumulative counts and total size against existing files for this model
    const [
      { count: existingModelCountRaw, error: modelCountError },
      { count: existingImageCountRaw, error: imageCountError },
      { data: existingSizeData, error: existingSizeError },
    ] = await Promise.all([
      supabase
        .from('model_files')
        .select('id', { count: 'exact', head: true })
        .eq('model_id', modelId)
        .eq('file_category', 'model'),
      supabase
        .from('model_files')
        .select('id', { count: 'exact', head: true })
        .eq('model_id', modelId)
        .eq('file_category', 'image'),
      supabase
        .from('model_files')
        .select('file_size')
        .eq('model_id', modelId)
        .limit(MODEL_UPLOAD_LIMITS.maxModelFiles + MODEL_UPLOAD_LIMITS.maxThumbnailFiles),
    ])

    if (modelCountError || imageCountError || existingSizeError) {
      console.error('Failed to check existing file counts', modelCountError ?? imageCountError ?? existingSizeError)
      return NextResponse.json({ error: 'Failed to validate file limits' }, { status: 500 })
    }

    const existingModelCount = existingModelCountRaw ?? 0
    const existingImageCount = existingImageCountRaw ?? 0

    if (existingModelCount + modelCount > MODEL_UPLOAD_LIMITS.maxModelFiles) {
      return NextResponse.json(
        { error: `Adding ${modelCount} model file(s) would exceed the limit of ${MODEL_UPLOAD_LIMITS.maxModelFiles} (${existingModelCount} already registered)` },
        { status: 400 },
      )
    }
    if (existingImageCount + imageCount > MODEL_UPLOAD_LIMITS.maxThumbnailFiles) {
      return NextResponse.json(
        { error: `Adding ${imageCount} thumbnail(s) would exceed the limit of ${MODEL_UPLOAD_LIMITS.maxThumbnailFiles} (${existingImageCount} already registered)` },
        { status: 400 },
      )
    }

    // Enforce cumulative total size across existing + new files
    const existingTotalSize = (existingSizeData ?? []).reduce(
      (sum, f) => sum + (typeof f.file_size === 'number' ? f.file_size : 0),
      0,
    )
    if (existingTotalSize + newBatchSize > MODEL_UPLOAD_LIMITS.maxTotalSize) {
      return NextResponse.json({ error: 'Adding these files would exceed the total upload size limit' }, { status: 400 })
    }

    // Check publish eligibility before inserting — avoids DB writes that a 400 would orphan
    if (intendedStatus === 'published' && modelCount === 0 && existingModelCount === 0) {
      return NextResponse.json(
        { error: 'At least one model file is required before publishing' },
        { status: 400 },
      )
    }

    // Insert file rows
    const { error: insertError } = await supabase.from('model_files').insert(fileRows)
    if (insertError) {
      console.error('Failed to insert model_files rows', insertError)
      return NextResponse.json({ error: 'Failed to register uploaded files' }, { status: 500 })
    }

    // Update model: thumbnails and/or status promotion
    const modelUpdate: Record<string, unknown> = {}

    const imageFiles = fileRows.filter((f) => f.file_category === 'image')
    if (imageFiles.length > 0) {
      const newImageUrls = imageFiles.map((f) => f.file_url)
      const existingImages = Array.isArray(model.images)
        ? model.images.filter((img): img is string => typeof img === 'string')
        : []
      const existingThumbnail = typeof model.thumbnail_url === 'string' && model.thumbnail_url ? [model.thumbnail_url] : []
      const merged = [...new Set([...existingThumbnail, ...existingImages, ...newImageUrls])]
      const sortedImages = sortImageUrls(merged)
      modelUpdate.images = sortedImages
      modelUpdate.thumbnail_url = sortedImages[0]
    }

    if (intendedStatus === 'published') {
      modelUpdate.status = 'published'
    }

    if (Object.keys(modelUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from('models')
        .update(modelUpdate)
        .eq('id', modelId)
        .select('id')
        .single()

      if (updateError) {
        console.error('Failed to update model after file registration', updateError)
        return NextResponse.json(
          { registered: fileRows.length, warning: 'Files were registered, but the model could not be updated' },
          { status: 201 },
        )
      }
    }

    return NextResponse.json({ registered: fileRows.length }, { status: 201 })
  } catch (error) {
    console.error('File registration failed', error)
    return NextResponse.json({ error: 'Unexpected error while registering files' }, { status: 500 })
  }
}

// GET /api/models/[slug]/files - List model files
// Not yet implemented — tracked in GitHub issues
export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ slug: string }> },
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}