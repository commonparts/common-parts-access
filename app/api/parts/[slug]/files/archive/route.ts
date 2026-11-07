import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKETS } from '@/constants/app'
import { toZipSafeName, buildZipEntryPath } from '@/lib/storage/path-utils'
import { recordPartDownloadForPart } from '@/lib/supabase/queries/part-metrics'
import { PART_UPLOAD_LIMITS } from '@/lib/storage/file-validation'
import { getApiTranslations } from '@/lib/api/translations'

export const runtime = 'nodejs'

// The archive holds the part's model files only. The upload flow caps them at
// PART_UPLOAD_LIMITS.maxModelFiles per part, but its count check and its insert
// are not atomic, so concurrent registrations can exceed that cap. The read is
// bounded by a ceiling well above it, and a part over the ceiling gets an
// explicit error rather than an archive that silently omits files.
const MAX_ARCHIVE_FILES = PART_UPLOAD_LIMITS.maxModelFiles * 10

// GET /api/parts/[slug]/files/archive - Download all model files as a ZIP.
// Anonymous: no account required, only an anonymous download row is recorded (issue #250).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { slug } = await params

    const { data: part, error: partError } = await supabase
      .from('parts')
      .select('id, name, status')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (partError || !part) {
      return NextResponse.json({ error: t('partNotFound') }, { status: 404 })
    }

    const { data: files, error: filesError } = await supabase
      .from('part_files')
      .select('id, original_filename, filename, upload_path')
      .eq('part_id', part.id)
      .eq('file_category', 'model')
      .order('created_at', { ascending: true })
      .limit(MAX_ARCHIVE_FILES + 1)

    if (filesError) {
      console.error('Failed to fetch model files:', filesError)
      return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: t('noFiles') }, { status: 404 })
    }

    if (files.length > MAX_ARCHIVE_FILES) {
      console.error('Archive refused: part has more model files than the archive ceiling', part.id)
      return NextResponse.json(
        { error: t('tooManyArchiveFiles', { max: MAX_ARCHIVE_FILES }) },
        { status: 422 },
      )
    }

    const zip = new JSZip()
    const folderName = toZipSafeName(part.name || slug, slug)
    const folder = zip.folder(folderName) ?? zip
    let addedFiles = 0

    for (const file of files) {
      // upload_path is the file's path in the model-files bucket (#56).
      const storagePath = file.upload_path?.replace(/^\/+/, '')

      if (!storagePath) {
        console.warn('Skipping file without storage path', file.id)
        continue
      }

      const { data: blob, error: downloadError } = await supabase
        .storage
        .from(STORAGE_BUCKETS.MODEL_FILES)
        .download(storagePath)

      if (downloadError || !blob) {
        console.error('Failed to download file from storage', { fileId: file.id, downloadError })
        continue
      }

      const arrayBuffer = await blob.arrayBuffer()
      const fallbackName = file.original_filename || file.filename || `file-${addedFiles + 1}`
      const zipPath = buildZipEntryPath({
        storagePath,
        fallbackName,
        partId: part.id
      })

      folder.file(zipPath, Buffer.from(arrayBuffer))
      addedFiles += 1
    }

    if (addedFiles === 0) {
      return NextResponse.json({ error: t('filesUnavailable') }, { status: 503 })
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      streamFiles: true
    })
    const zipBytes = new Uint8Array(zipBuffer)

    try {
      await recordPartDownloadForPart(part.id, null)
    } catch (trackingError) {
      console.error('Failed to log archive download:', trackingError)
    }
    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folderName}.zip"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Archive download failed:', error)
    return NextResponse.json({ error: t('downloadFailed') }, { status: 500 })
  }
}
