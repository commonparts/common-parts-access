import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKETS } from '@/constants/app'
import { extractModelStoragePath, toZipSafeName, buildZipEntryPath } from '@/lib/storage/path-utils'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, name, status')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const { data: files, error: filesError } = await supabase
      .from('model_files')
      .select('id, original_filename, filename, upload_path, file_url')
      .eq('model_id', model.id)
      .order('created_at', { ascending: true })

    if (filesError) {
      console.error('Failed to fetch model files:', filesError)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files available for download' }, { status: 404 })
    }

    const zip = new JSZip()
    const folderName = toZipSafeName(model.name || slug, slug)
    const folder = zip.folder(folderName) ?? zip
    let addedFiles = 0

    for (const file of files) {
      const storagePath = extractModelStoragePath(file.upload_path) ||
        extractModelStoragePath(file.file_url)

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
        modelId: model.id
      })

      folder.file(zipPath, Buffer.from(arrayBuffer))
      addedFiles += 1
    }

    if (addedFiles === 0) {
      return NextResponse.json({ error: 'Files are unavailable at the moment' }, { status: 503 })
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      streamFiles: true
    })
    const zipBytes = new Uint8Array(zipBuffer)

    try {
      const headersList = await headers()
      const userAgent = headersList.get('user-agent') || ''
      const forwardedFor = headersList.get('x-forwarded-for')
      const clientIp = forwardedFor?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'

      await supabase
        .from('model_downloads')
        .insert({
          model_id: model.id,
          file_id: null,
          user_id: user.id,
          ip_address: clientIp,
          user_agent: userAgent,
          downloaded_at: new Date().toISOString()
        })
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
    return NextResponse.json({ error: 'Failed to prepare download' }, { status: 500 })
  }
}
