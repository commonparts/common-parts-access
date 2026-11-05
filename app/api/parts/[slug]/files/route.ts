import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FILE_TYPES } from '@/constants/app'
import { PART_UPLOAD_LIMITS } from '@/lib/storage/file-validation'
import { mergeImageUrls } from '@/lib/utils/images'
import { partFileBucket, toStorageReference } from '@/lib/storage/path-utils'
import { resolveStorageUrls } from '@/lib/storage/url'
import { parseJsonBody } from '@/lib/api/parse'
import { registerFilesSchema } from '@/lib/schemas/parts'

export const runtime = 'nodejs'

const MAX_FILES_PER_REQUEST =
  PART_UPLOAD_LIMITS.maxModelFiles + PART_UPLOAD_LIMITS.maxThumbnailFiles
const REGISTER_FILES_SCHEMA = registerFilesSchema(MAX_FILES_PER_REQUEST)

const MODEL_EXTENSIONS = new Set(FILE_TYPES.MODEL_FILES.map((ext) => ext.toLowerCase()))
const IMAGE_EXTENSIONS = new Set(FILE_TYPES.IMAGE_FILES.map((ext) => ext.toLowerCase()))

const CATEGORY_FOLDER_MAP: Record<string, string> = {
  model: 'files',
  image: 'thumbnails',
} as const

/**
 * Registers uploaded files for an existing part after the client has uploaded
 * them directly to Supabase Storage. Also updates part thumbnail/images.
 *
 * Uses the [slug] route param to look up the part.
 * Stores the storage path of each file (`upload_path`) and adds each photo to
 * the gallery as a relative `bucket/path` reference built server-side (#56),
 * never from a client-provided URL. The response resolves the gallery to
 * public URLs.
 * Never changes the part's status: publishing goes through the publish gate
 * of the part's track only (#403). Refuses model files for a curated part,
 * whose files stay at the source (#396); photos are accepted.
 *
 * Requires: authenticated user who owns the part.
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

    // Look up the part by slug — include images fields for merge on update
    const { data: part, error: partError } = await supabase
      .from('parts')
      .select('id, user_id, origin_type, thumbnail_url, images')
      .eq('slug', slug)
      .single()

    if (partError || !part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    if (part.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const partId = part.id

    // Shape is checked by the schema; the rules that depend on the category,
    // the owner and the part are checked per file below.
    const body = await parseJsonBody(request, REGISTER_FILES_SCHEMA, 'Invalid JSON body')
    if (!body.ok) return body.response
    const { files } = body.data

    // Validate and build each file row
    const fileRows: {
      part_id: string
      filename: string
      original_filename: string
      file_type: string
      file_size: number
      file_category: string
      upload_path: string
    }[] = []
    // Storage reference of each registered image, in registration order, for
    // the part's gallery (parts.images).
    const newImageRefs: string[] = []

    for (const { originalName, filename, extension, size, path, bucket, category } of files) {
      // Validate the bucket of the category before applying category-specific limits
      const expectedBucket = partFileBucket(category)
      if (bucket !== expectedBucket) {
        return NextResponse.json({ error: `Bucket mismatch for category "${category}"` }, { status: 400 })
      }

      // Enforce per-file size limits matching phase-1 validation
      const maxFileSize = category === 'model'
        ? PART_UPLOAD_LIMITS.maxModelFileSize
        : PART_UPLOAD_LIMITS.maxThumbnailSize
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
      const expectedPath = `${user.id}/${partId}/${expectedFolder}/${filename}`
      if (path !== expectedPath) {
        return NextResponse.json({ error: 'File path does not match authenticated user, part, and filename' }, { status: 403 })
      }

      // The gallery stores a relative reference derived from the validated
      // bucket and path — never a client-provided URL
      if (category === 'image') {
        newImageRefs.push(toStorageReference(bucket, path))
      }

      fileRows.push({
        part_id: partId,
        filename,
        original_filename: originalName,
        file_type: normalizedExtension,
        file_size: size,
        file_category: category,
        upload_path: path,
      })
    }

    // Enforce total size limit across all files in this request
    const newBatchSize = fileRows.reduce((sum, f) => sum + f.file_size, 0)
    if (newBatchSize > PART_UPLOAD_LIMITS.maxTotalSize) {
      return NextResponse.json({ error: 'Total upload size exceeds limit' }, { status: 400 })
    }

    // Enforce per-category counts within this request
    const modelFileCount = fileRows.filter((f) => f.file_category === 'model').length
    const imageCount = fileRows.filter((f) => f.file_category === 'image').length

    if (modelFileCount > PART_UPLOAD_LIMITS.maxModelFiles) {
      return NextResponse.json(
        { error: `Too many model files (max ${PART_UPLOAD_LIMITS.maxModelFiles})` },
        { status: 400 },
      )
    }
    if (imageCount > PART_UPLOAD_LIMITS.maxThumbnailFiles) {
      return NextResponse.json(
        { error: `Too many thumbnails (max ${PART_UPLOAD_LIMITS.maxThumbnailFiles})` },
        { status: 400 },
      )
    }

    // A curated part references a publication made elsewhere: its files stay
    // at the source and are never hosted here (#396). Only photos are accepted.
    if (part.origin_type === 'curated' && modelFileCount > 0) {
      return NextResponse.json(
        { error: 'A part published elsewhere does not host model files: its files stay at the source. Upload photos only.' },
        { status: 400 },
      )
    }

    // Check cumulative counts and total size against existing files for this part
    const [
      { count: existingModelFileCountRaw, error: modelFileCountError },
      { count: existingImageCountRaw, error: imageCountError },
      { data: existingSizeData, error: existingSizeError },
    ] = await Promise.all([
      supabase
        .from('part_files')
        .select('id', { count: 'exact', head: true })
        .eq('part_id', partId)
        .eq('file_category', 'model'),
      supabase
        .from('part_files')
        .select('id', { count: 'exact', head: true })
        .eq('part_id', partId)
        .eq('file_category', 'image'),
      supabase
        .from('part_files')
        .select('file_size')
        .eq('part_id', partId)
        .limit(PART_UPLOAD_LIMITS.maxModelFiles + PART_UPLOAD_LIMITS.maxThumbnailFiles),
    ])

    if (modelFileCountError || imageCountError || existingSizeError) {
      console.error('Failed to check existing file counts', modelFileCountError ?? imageCountError ?? existingSizeError)
      return NextResponse.json({ error: 'Failed to validate file limits' }, { status: 500 })
    }

    const existingModelFileCount = existingModelFileCountRaw ?? 0
    const existingImageCount = existingImageCountRaw ?? 0

    if (existingModelFileCount + modelFileCount > PART_UPLOAD_LIMITS.maxModelFiles) {
      return NextResponse.json(
        { error: `Adding ${modelFileCount} model file(s) would exceed the limit of ${PART_UPLOAD_LIMITS.maxModelFiles} (${existingModelFileCount} already registered)` },
        { status: 400 },
      )
    }
    if (existingImageCount + imageCount > PART_UPLOAD_LIMITS.maxThumbnailFiles) {
      return NextResponse.json(
        { error: `Adding ${imageCount} thumbnail(s) would exceed the limit of ${PART_UPLOAD_LIMITS.maxThumbnailFiles} (${existingImageCount} already registered)` },
        { status: 400 },
      )
    }

    // Enforce cumulative total size across existing + new files
    const existingTotalSize = (existingSizeData ?? []).reduce((sum, f) => sum + f.file_size, 0)
    if (existingTotalSize + newBatchSize > PART_UPLOAD_LIMITS.maxTotalSize) {
      return NextResponse.json({ error: 'Adding these files would exceed the total upload size limit' }, { status: 400 })
    }

    // Insert file rows
    const { error: insertError } = await supabase.from('part_files').insert(fileRows)
    if (insertError) {
      console.error('Failed to insert part_files rows', insertError)
      return NextResponse.json({ error: 'Failed to register uploaded files' }, { status: 500 })
    }

    // Update the part's gallery when photos were registered
    // The current gallery in canonical order — returned to the client so it
    // can preview registered images without a refetch.
    const existingImages = part.images ?? []
    let images = existingImages
    if (newImageRefs.length > 0) {
      images = mergeImageUrls(part.thumbnail_url, part.images, newImageRefs)
      const { error: updateError } = await supabase
        .from('parts')
        .update({ images, thumbnail_url: images[0] })
        .eq('id', partId)
        .select('id')
        .single()

      if (updateError) {
        console.error('Failed to update part after file registration', updateError)
        return NextResponse.json(
          { registered: fileRows.length, images: resolveStorageUrls(existingImages), warning: 'Files were registered, but the part could not be updated' },
          { status: 201 },
        )
      }
    }

    return NextResponse.json({ registered: fileRows.length, images: resolveStorageUrls(images) }, { status: 201 })
  } catch (error) {
    console.error('File registration failed', error)
    return NextResponse.json({ error: 'Unexpected error while registering files' }, { status: 500 })
  }
}
