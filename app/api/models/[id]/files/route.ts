import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_FILES_PER_REQUEST = 20
const MAX_FILENAME_LENGTH = 300
const MAX_PATH_LENGTH = 500
const VALID_CATEGORIES = new Set(['model', 'image'])

interface FileRow {
  originalName: string
  filename: string
  extension: string
  size: number
  path: string
  publicUrl: string
  bucket: string
  category: string
}

/**
 * Registers uploaded files for an existing model after the client has uploaded
 * them directly to Supabase Storage. Also updates model thumbnail/images.
 *
 * Requires: authenticated user who owns the model.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: modelId } = await params

    if (!modelId || typeof modelId !== 'string' || modelId.length > 36) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 })
    }

    // Verify the model exists and belongs to this user
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, user_id')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (model.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const files = Array.isArray(payload.files) ? payload.files : []

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `Too many files (max ${MAX_FILES_PER_REQUEST})` }, { status: 400 })
    }

    // Validate and sanitize each file entry
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
      const extension = typeof entry.extension === 'string' ? entry.extension.trim() : ''
      const size = typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : -1
      const path = typeof entry.path === 'string' ? entry.path.trim() : ''
      const publicUrl = typeof entry.publicUrl === 'string' ? entry.publicUrl.trim() : ''
      const category = typeof entry.category === 'string' ? entry.category.trim() : ''

      if (!originalName || originalName.length > MAX_FILENAME_LENGTH) {
        return NextResponse.json({ error: `Invalid original filename: ${originalName.slice(0, 50)}` }, { status: 400 })
      }
      if (!filename || filename.length > MAX_FILENAME_LENGTH) {
        return NextResponse.json({ error: `Invalid filename: ${filename.slice(0, 50)}` }, { status: 400 })
      }
      if (size < 0) {
        return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
      }
      if (!path || path.length > MAX_PATH_LENGTH) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
      }
      if (!publicUrl) {
        return NextResponse.json({ error: 'Missing file URL' }, { status: 400 })
      }
      if (!VALID_CATEGORIES.has(category)) {
        return NextResponse.json({ error: `Invalid file category: ${category}` }, { status: 400 })
      }

      // Verify the path starts with the user's ID to prevent path manipulation
      if (!path.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: 'File path does not match authenticated user' }, { status: 403 })
      }

      fileRows.push({
        model_id: modelId,
        filename,
        original_filename: originalName,
        file_type: extension,
        file_size: size,
        file_url: publicUrl,
        file_category: category,
        upload_path: path,
      })
    }

    // Insert file rows
    const { error: insertError } = await supabase.from('model_files').insert(fileRows)
    if (insertError) {
      console.error('Failed to insert model_files rows', insertError)
      return NextResponse.json({ error: 'Failed to register uploaded files' }, { status: 500 })
    }

    // Update model thumbnail and images from uploaded thumbnails
    const imageFiles = fileRows.filter((f) => f.file_category === 'image')
    if (imageFiles.length > 0) {
      const imageUrls = imageFiles.map((f) => f.file_url)
      const primaryThumbnailUrl = imageUrls[0]

      const { error: updateError } = await supabase
        .from('models')
        .update({ thumbnail_url: primaryThumbnailUrl, images: imageUrls })
        .eq('id', modelId)
        .select('id')
        .single()

      if (updateError) {
        console.error('Failed to update model thumbnails', updateError)
      }
    }

    return NextResponse.json({ registered: fileRows.length }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while registering files'
    console.error('File registration failed', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
