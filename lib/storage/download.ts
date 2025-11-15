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
 * Download multiple files as a ZIP
 */
export async function downloadMultipleFiles(files: ModelFile[], modelSlug: string): Promise<DownloadResult> {
  try {
    // For now, we'll download files individually
    // In the future, this could create a ZIP file on the server
    const results = await Promise.allSettled(
      files.map(file => downloadFile(file, modelSlug))
    )

    // Check if any result requires auth (user was redirected)
    const authRequired = results.find(result => 
      result.status === 'fulfilled' && result.value.requiresAuth
    )
    
    if (authRequired) {
      return {
        success: false,
        requiresAuth: true,
        error: 'Authentication required'
      }
    }

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