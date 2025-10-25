'use client'

import { createClient } from '@/lib/supabase/client'

interface ModelFile {
  id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  file_url: string
  file_category: string
  created_at: string
}

interface DownloadResult {
  success: boolean
  error?: string
  downloadUrl?: string
}

/**
 * Download a single file
 */
export async function downloadFile(file: ModelFile, modelSlug: string): Promise<DownloadResult> {
  try {
    // Track the download
    const trackingResponse = await fetch(`/api/models/${modelSlug}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: file.id,
        filename: file.original_filename,
        fileCategory: file.file_category
      })
    })

    if (!trackingResponse.ok) {
      console.warn('Failed to track download, but continuing with download')
    }

    // Get the file URL - this could be a direct URL or a signed URL from Supabase
    let downloadUrl = file.file_url

    // If the URL is a Supabase storage URL, create a signed URL for secure download
    if (file.file_url.includes('supabase')) {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('model-files')
        .createSignedUrl(file.filename, 60) // 60 seconds expiry

      if (error) {
        console.error('Failed to create signed URL:', error)
        // Fall back to direct URL
      } else if (data) {
        downloadUrl = data.signedUrl
      }
    }

    // Trigger the download
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = file.original_filename
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return {
      success: true,
      downloadUrl
    }
  } catch (error) {
    console.error('Download failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    }
  }
}

/**
 * Download multiple files as a ZIP
 */
export async function downloadMultipleFiles(files: ModelFile[], modelSlug: string): Promise<DownloadResult> {
  try {
    // For now, we'll download files individually
    // In the future, this could create a ZIP file on the server
    const results = await Promise.allSettled(
      files.map(file => downloadFile(file, modelSlug))
    )

    const failures = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.success)
    )

    if (failures.length > 0) {
      return {
        success: false,
        error: `Failed to download ${failures.length} of ${files.length} files`
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Bulk download failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bulk download failed'
    }
  }
}

/**
 * Download all model files
 */
export async function downloadAllModelFiles(files: ModelFile[], modelSlug: string): Promise<DownloadResult> {
  const modelFiles = files.filter(file => file.file_category === 'model')
  
  if (modelFiles.length === 0) {
    return {
      success: false,
      error: 'No 3D model files available for download'
    }
  }

  return downloadMultipleFiles(modelFiles, modelSlug)
}

/**
 * Get download statistics
 */
export async function getDownloadStats(modelSlug: string) {
  try {
    const response = await fetch(`/api/models/${modelSlug}/stats`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch download stats:', error)
  }
  return null
}