import { createClient } from '@/lib/supabase/client'
import { STORAGE_BUCKETS } from '@/constants/app'
import { inferImageContentType, sanitizeFilename } from '@/lib/storage/image-processing'
import { resolveModelContentType } from '@/lib/storage/upload'
import { getFileExtension } from '@/lib/storage/file-validation'

function uniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName) || ''
  const lastDot = originalName.lastIndexOf('.')
  const base = lastDot === -1 ? originalName : originalName.slice(0, lastDot)
  const safe = sanitizeFilename(base, 'file')
  const suffix = crypto.randomUUID()
  return `${safe}-${suffix}${ext}`
}

export interface ClientUploadedFile {
  bucket: string
  path: string
  filename: string
  originalName: string
  extension: string
  size: number
  category: 'model' | 'image'
}

/**
 * Best-effort removal of uploaded storage objects, grouped by bucket.
 * Swallows errors so the original failure is never masked.
 */
export async function cleanupUploadedFiles(
  files: { bucket: string; path: string }[],
): Promise<void> {
  if (files.length === 0) return

  const supabase = createClient()
  const grouped = files.reduce<Record<string, string[]>>((acc, f) => {
    acc[f.bucket] = acc[f.bucket] || []
    acc[f.bucket].push(f.path)
    return acc
  }, {})

  try {
    await Promise.all(
      Object.entries(grouped).map(([bucket, paths]) =>
        supabase.storage.from(bucket).remove(paths),
      ),
    )
  } catch {
    // Swallow — caller decides how to handle cleanup failures
  }
}

/**
 * Uploads a single file directly from the browser to Supabase Storage.
 * Bypasses the API route body-size limit by going straight to storage.
 */
type BrowserSupabaseClient = ReturnType<typeof createClient>

async function uploadFileToStorage(params: {
  supabase: BrowserSupabaseClient
  file: File
  userId: string
  modelId: string
  kind: 'model' | 'thumbnail'
}): Promise<ClientUploadedFile> {
  const extension = getFileExtension(params.file.name)
  const filename = uniqueFilename(params.file.name)
  const folder = params.kind === 'thumbnail' ? 'thumbnails' : 'files'
  const path = `${params.userId}/${params.modelId}/${folder}/${filename}`
  const bucket = params.kind === 'thumbnail'
    ? STORAGE_BUCKETS.MODEL_THUMBNAILS
    : STORAGE_BUCKETS.MODEL_FILES

  const contentType = params.kind === 'thumbnail'
    ? (inferImageContentType(extension) || 'image/jpeg')
    : resolveModelContentType(extension)

  const { error } = await params.supabase.storage
    .from(bucket)
    .upload(path, params.file, { upsert: false, contentType })

  if (error) {
    throw new Error(`Failed to upload ${params.file.name}: ${error.message}`)
  }

  return {
    bucket,
    path,
    filename,
    originalName: params.file.name,
    extension: extension.replace(/^\./, ''),
    size: params.file.size,
    category: params.kind === 'thumbnail' ? 'image' : 'model',
  }
}

export interface UploadProgress {
  phase: 'model-files' | 'thumbnails'
  current: number
  total: number
  fileName: string
}

/**
 * Uploads all model files and thumbnails directly to Supabase Storage from the browser.
 * Calls onProgress for each file to support progress indication.
 * On failure, cleans up any files already uploaded in this batch.
 */
export async function uploadFilesFromClient(params: {
  userId: string
  modelId: string
  modelFiles: File[]
  thumbnails: File[]
  onProgress?: (progress: UploadProgress) => void
}): Promise<{ modelFiles: ClientUploadedFile[]; thumbnails: ClientUploadedFile[] }> {
  const supabase = createClient()
  const uploaded: ClientUploadedFile[] = []
  const modelResults: ClientUploadedFile[] = []
  const thumbnailResults: ClientUploadedFile[] = []

  try {
    const totalFiles = params.modelFiles.length + params.thumbnails.length

    for (let i = 0; i < params.modelFiles.length; i++) {
      const file = params.modelFiles[i]
      params.onProgress?.({
        phase: 'model-files',
        current: i + 1,
        total: totalFiles,
        fileName: file.name,
      })

      const result = await uploadFileToStorage({
        supabase,
        file,
        userId: params.userId,
        modelId: params.modelId,
        kind: 'model',
      })
      uploaded.push(result)
      modelResults.push(result)
    }

    for (let i = 0; i < params.thumbnails.length; i++) {
      const thumb = params.thumbnails[i]
      params.onProgress?.({
        phase: 'thumbnails',
        current: params.modelFiles.length + i + 1,
        total: totalFiles,
        fileName: thumb.name,
      })

      const result = await uploadFileToStorage({
        supabase,
        file: thumb,
        userId: params.userId,
        modelId: params.modelId,
        kind: 'thumbnail',
      })
      uploaded.push(result)
      thumbnailResults.push(result)
    }

    return { modelFiles: modelResults, thumbnails: thumbnailResults }
  } catch (error) {
    // Best-effort cleanup — don't let cleanup errors mask the original failure
    await cleanupUploadedFiles(uploaded)
    throw error
  }
}
