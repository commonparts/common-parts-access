import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

interface DownloadTrackingData {
  fileId: string
  filename: string
  fileCategory: string
}

// POST /api/models/[slug]/download - Track model download
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body: DownloadTrackingData = await request.json()
    const { fileId, filename, fileCategory } = body
    const supabase = await createClient()
    
    // Get client IP and user agent for analytics
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0] || headersList.get('x-real-ip') || 'unknown'

    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // Find the model by slug
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, name')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // Insert download tracking record
    const { error: trackingError } = await supabase
      .from('model_downloads')
      .insert({
        model_id: model.id,
        file_id: fileId,
        user_id: user?.id || null,
        ip_address: clientIp,
        user_agent: userAgent,
        filename: filename,
        file_category: fileCategory,
        downloaded_at: new Date().toISOString()
      })

    if (trackingError) {
      console.error('Failed to track download:', trackingError)
      // Don't fail the request if tracking fails
    }

    // Update model download count
    const { error: updateError } = await supabase
      .rpc('increment_model_downloads', { model_id: model.id })

    if (updateError) {
      console.error('Failed to update download count:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Download tracked successfully',
      modelName: model.name,
      filename: filename
    })

  } catch (error) {
    console.error('Download tracking error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to track download',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}