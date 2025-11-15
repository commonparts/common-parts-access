import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKETS } from '@/constants/app'

/**
 * Extracts the storage path from a Supabase storage URL (signed or public)
 * Handles both signed URLs with tokens and public URLs
 * @param url - The full Supabase storage URL
 * @returns The extracted path after /model-files/ or null if not found
 */
function extractStoragePath(url: string | null): string | null {
  if (!url || !url.includes('/model-files/')) {
    return null
  }
  
  const match = url.match(/\/model-files\/(.+?)(\?|$)/)
  return match ? match[1] : null
}

/**
 * Constructs a public storage URL for a file in Supabase Storage
 * @param storagePath - The path within the bucket (e.g., "user-id/model-id/file.stl")
 * @returns The full public URL
 */
function getPublicStorageUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKETS.MODEL_FILES}/${storagePath}`
}

// GET /api/models/[slug]/files/[fileId]/download-url - Get a download URL for a file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  try {
    const { slug, fileId } = await params
    const supabase = await createClient()
    
    // Find the model by slug
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // Get the file details
    const { data: file, error: fileError } = await supabase
      .from('model_files')
      .select('*')
      .eq('id', fileId)
      .eq('model_id', model.id)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Extract the storage path from the stored URL
    // Try upload_path first (more likely to have full path), then fallback to file_url
    const storagePath = extractStoragePath(file.upload_path) || 
                       extractStoragePath(file.file_url) || 
                       file.filename

    // Construct public URL for the file
    const publicUrl = getPublicStorageUrl(storagePath)

    return NextResponse.json({
      downloadUrl: publicUrl,
      filename: file.original_filename,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('Error generating download URL:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
