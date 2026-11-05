import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { partFileBucket, toStorageReference } from '@/lib/storage/path-utils'
import { resolveStorageUrl } from '@/lib/storage/url'
import { isValidUuid } from '@/lib/utils/validation'

const MAX_SLUG_LENGTH = 200

/**
 * GET /api/parts/[slug]/files/[fileId]/download-url — the public URL of one
 * file of a published part.
 *
 * The URL is built from the file's bucket (derived from its category) and its
 * `upload_path`, the storage path stored on the row (#56). Anonymous: RLS on
 * `parts` and `part_files` exposes the files of published parts to everyone.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  try {
    const { slug, fileId } = await params
    if (!slug || slug.length > MAX_SLUG_LENGTH) {
      return NextResponse.json({ error: 'Invalid part slug' }, { status: 400 })
    }
    if (!isValidUuid(fileId)) {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: part, error: partError } = await supabase
      .from('parts')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (partError || !part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    const { data: file, error: fileError } = await supabase
      .from('part_files')
      .select('original_filename, file_category, upload_path')
      .eq('id', fileId)
      .eq('part_id', part.id)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const bucket = partFileBucket(file.file_category)
    const storagePath = file.upload_path?.replace(/^\/+/, '')
    if (!bucket || !storagePath) {
      console.error('Download URL: file has no resolvable storage location', fileId)
      return NextResponse.json({ error: 'This file is not available for download' }, { status: 404 })
    }

    return NextResponse.json({
      downloadUrl: resolveStorageUrl(toStorageReference(bucket, storagePath)),
      filename: file.original_filename,
    })
  } catch (error) {
    console.error('Error generating download URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
