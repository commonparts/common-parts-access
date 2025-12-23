import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { ModelDetails } from '@/components/model/model-details'
import { createClient } from '@/lib/supabase/server'

interface ModelPageProps {
  params: Promise<{
    slug: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const supabase = await createClient()
    
    // Fetch basic model info for metadata
    const { data: model, error } = await supabase
      .from('models')
      .select(`
        name,
        description,
        thumbnail_url,
        user_profiles!inner(username, display_name),
        tags
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !model) {
      return {
        title: 'Model Not Found',
        description: 'The requested 3D model could not be found.'
      }
    }

    const userProfile = Array.isArray(model.user_profiles) ? model.user_profiles[0] : model.user_profiles
    const authorName = userProfile?.display_name || userProfile?.username || 'Unknown'
    
    return {
      title: `${model.name} - 3D Model by ${authorName}`,
      description: model.description || `Download ${model.name}, a 3D model created by ${authorName}. Find replacement parts and 3D printable models.`,
      keywords: model.tags ? model.tags.join(', ') : undefined,
      openGraph: {
        title: `${model.name} - 3D Model`,
        description: model.description || `3D model created by ${authorName}`,
        images: model.thumbnail_url ? [
          {
            url: model.thumbnail_url,
            width: 1200,
            height: 630,
            alt: model.name
          }
        ] : undefined,
        type: 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title: `${model.name} - 3D Model`,
        description: model.description || `3D model created by ${authorName}`,
        images: model.thumbnail_url ? [model.thumbnail_url] : undefined
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'PartHarbor - 3D Models',
      description: 'Browse and download 3D models and replacement parts.'
    }
  }
}

// Pre-validate that the model exists (optional, for better UX)
async function validateModel(slug: string) {
  try {
    const supabase = await createClient()
    
    const { data: model, error } = await supabase
      .from('models')
      .select('id, slug')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    return { exists: !error && !!model, model }
  } catch (error) {
    console.error('Error validating model:', error)
    return { exists: false, model: null }
  }
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params
  
  // Validate the model exists before rendering
  const { exists } = await validateModel(slug)
  
  if (!exists) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/browse" className="hover:text-foreground transition-colors">
            Browse
          </Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-foreground font-medium">Model</span>
        </nav>

        {/* Model Details Component */}
        <ModelDetails slug={slug} />

        {/* Back to Browse Button */}
        <div className="mt-12 text-center">
          <Button asChild variant="outline" className="inline-flex items-center gap-2">
            <Link href="/browse">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Browse More Models
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}

// Generate static params for popular models (optional, for better performance)
export async function generateStaticParams() {
  try {
    const supabase = await createClient()
    
    // Get the most popular models for static generation
    const { data: models, error } = await supabase
      .from('models')
      .select('slug')
      .eq('status', 'published')
      .order('download_count', { ascending: false })
      .limit(50) // Pre-generate top 50 models

    if (error || !models) {
      console.error('Error fetching models for static generation:', error)
      return []
    }

    return models.map((model) => ({
      slug: model.slug
    }))
  } catch (error) {
    console.error('Error in generateStaticParams:', error)
    return []
  }
}
