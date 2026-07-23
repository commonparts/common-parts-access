import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurationDraft } from '@/lib/supabase/queries/curation'
import { parsePrintablesModelId } from '@/lib/curation/prefill-parsing'
import { fetchPrintablesImageUrls, numberedImageFilename } from '@/lib/curation/source-images'
import { inferImageContentType } from '@/lib/storage/image-processing'
import { MODEL_UPLOAD_LIMITS } from '@/lib/storage/file-validation'
import { mergeImageUrls } from '@/lib/utils/images'
import { isValidUuid } from '@/lib/utils/validation'
import { MAX_FILENAME_LENGTH, STORAGE_BUCKETS } from '@/constants/app'

export const runtime = 'nodejs'

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15000

// POST /api/curation/drafts/[id]/import-images — imports the source's
// gallery images into the draft: downloaded server-side, stored under
// numbered filenames (00-…, 01-…) so the canonical filename sort makes the
// source's first image the thumbnail and preserves the slideshow order.
// Best-effort per image: an unreachable or invalid image is skipped, never
// a failure of the whole import. Printables sources only for now.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    const draft = await getCurationDraft(id)
    if (!draft || draft.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: 'Only drafts can import images' }, { status: 409 })
    }

    // Idempotency: the import targets a fresh draft. Once any image exists
    // (imported or manual), re-running would duplicate or reorder — skip.
    if (draft.image_file_count > 0) {
      return NextResponse.json({ imported: 0, skipped: 'Images already registered for this draft' })
    }

    let printId: string | null = null
    try {
      printId = draft.source_url ? parsePrintablesModelId(new URL(draft.source_url)) : null
    } catch {
      printId = null
    }
    if (!printId) {
      return NextResponse.json({ error: 'Image import is only available for Printables model sources' }, { status: 400 })
    }

    const imageUrls = (await fetchPrintablesImageUrls(printId)).slice(
      0,
      MODEL_UPLOAD_LIMITS.maxThumbnailFiles,
    )
    if (imageUrls.length === 0) {
      return NextResponse.json({ imported: 0 })
    }

    const fileRows: {
      model_id: string
      filename: string
      original_filename: string
      file_type: string
      file_size: number
      file_url: string
      file_category: 'image'
      upload_path: string
    }[] = []

    for (const imageUrl of imageUrls) {
      // Numbering follows successful imports so the sequence stays gapless
      // even when an individual image is skipped.
      const filename = numberedImageFilename(fileRows.length, imageUrl)
      if (!filename) continue

      let bytes: ArrayBuffer
      try {
        const res = await fetch(imageUrl, {
          cache: 'no-store',
          signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
        })
        if (!res.ok) continue
        bytes = await res.arrayBuffer()
      } catch {
        continue
      }
      if (bytes.byteLength === 0 || bytes.byteLength > MODEL_UPLOAD_LIMITS.maxThumbnailSize) continue

      const extension = filename.slice(filename.lastIndexOf('.'))
      const path = `${user.id}/${id}/thumbnails/${filename}`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.MODEL_THUMBNAILS)
        .upload(path, bytes, {
          upsert: false,
          contentType: inferImageContentType(extension) ?? 'image/jpeg',
        })
      if (uploadError) {
        console.error(`Image import: upload failed for ${filename}`, uploadError)
        continue
      }

      const { data: publicData } = supabase.storage.from(STORAGE_BUCKETS.MODEL_THUMBNAILS).getPublicUrl(path)
      const originalName = imageUrl.split('/').pop() ?? filename
      fileRows.push({
        model_id: id,
        filename,
        original_filename: originalName.slice(0, MAX_FILENAME_LENGTH),
        file_type: extension.replace(/^\./, ''),
        file_size: bytes.byteLength,
        file_url: publicData.publicUrl,
        file_category: 'image',
        upload_path: path,
      })
    }

    if (fileRows.length === 0) {
      return NextResponse.json({ imported: 0 })
    }

    const { error: insertError } = await supabase.from('model_files').insert(fileRows)
    if (insertError) {
      console.error('Image import: failed to register files', insertError)
      // Best-effort storage rollback so a retry does not hit upsert conflicts.
      await supabase.storage
        .from(STORAGE_BUCKETS.MODEL_THUMBNAILS)
        .remove(fileRows.map((f) => f.upload_path))
        .catch(() => {})
      return NextResponse.json({ error: 'Failed to register imported images' }, { status: 500 })
    }

    const sortedImages = mergeImageUrls(draft.thumbnail_url, draft.images, fileRows.map((f) => f.file_url))
    const { error: updateError } = await supabase
      .from('models')
      .update({ images: sortedImages, thumbnail_url: sortedImages[0] })
      .eq('id', id)
    if (updateError) {
      console.error('Image import: failed to update model thumbnail', updateError)
    }

    return NextResponse.json({ imported: fileRows.length })
  } catch (error) {
    console.error('Curation image import failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
