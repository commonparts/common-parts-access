'use client'

import { createClient } from '@/lib/supabase/client'
import { toZipSafeName } from '@/lib/storage/path-utils'

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
  requiresAuth?: boolean
}

/**
 * Download a single file
 */
export async function downloadFile(file: ModelFile, modelSlug: string): Promise<DownloadResult> {
  // Check if user is authenticated
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    // Store the current URL to redirect back after login
    const currentUrl = window.location.pathname
    sessionStorage.setItem('redirectAfterLogin', currentUrl)
    
    // Redirect to login
    window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`
    
    return {
      success: false,
      requiresAuth: true,
      error: 'Authentication required'
    }
  }
  try {
    // Get a signed download URL from the API
    const urlResponse = await fetch(`/api/models/${modelSlug}/files/${file.id}/download-url`)
    
    if (!urlResponse.ok) {
      const errorData = await urlResponse.json().catch(() => ({ error: 'Failed to get download URL' }))
      return {
        success: false,
        error: errorData.error || 'Failed to get download URL'
      }
    }

    const { downloadUrl, filename } = await urlResponse.json()

    // Track the download (non-blocking)
    fetch(`/api/models/${modelSlug}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: file.id,
        filename: file.original_filename,
        fileCategory: file.file_category
      })
    }).catch(err => {
      console.warn('Failed to track download:', err)
    })

    // Trigger the download by creating a temporary link
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || file.original_filename
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    
    document.body.appendChild(link)
    link.click()
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(link)
    }, 100)

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
 * Download all model files
 */
export async function downloadAllModelFiles(files: ModelFile[], modelSlug: string, modelName?: string): Promise<DownloadResult> {
  if (!files || files.length === 0) {
    return {
      success: false,
      error: 'No files available for download'
    }
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const currentUrl = window.location.pathname
    sessionStorage.setItem('redirectAfterLogin', currentUrl)
    window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`

    return {
      success: false,
      requiresAuth: true,
      error: 'Authentication required'
    }
  }

  try {
    const response = await fetch(`/api/models/${modelSlug}/files/archive`)

    if (response.status === 401) {
      const currentUrl = window.location.pathname
      sessionStorage.setItem('redirectAfterLogin', currentUrl)
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`

      return {
        success: false,
        requiresAuth: true,
        error: 'Authentication required'
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to download archive' }))
      return {
        success: false,
        error: errorData.error || 'Failed to download archive'
      }
    }

    const blob = await response.blob()
    const archiveName = `${toZipSafeName(modelName || modelSlug, modelSlug)}.zip`
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = archiveName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    return {
      success: true
    }
  } catch (error) {
    console.error('Archive download failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download archive'
    }
  }
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