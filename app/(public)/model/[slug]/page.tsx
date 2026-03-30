import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { ModelDetails } from '@/components/model/model-details'
import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

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
      title: 'Common Parts Access — 3D Models',
      description: 'Browse and download verified 3D models and repair parts.'
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
    <Section>
      <Container size="xl" className="space-y-lg">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Browse', href: '/browse' },
            { label: 'Model' },
          ]}
          className="text-text-secondary"
        />

        <ModelDetails slug={slug} />

        <div className="text-center">
          <Button asChild variant="outline" className="inline-flex items-center gap-sm">
            <Link href="/browse">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Browse more models
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}

// Generate static params for popular models (optional, for better performance)
export async function generateStaticParams() {
  // Use a cookie-free client — generateStaticParams runs at build time
  // before any HTTP request exists, so cookies() cannot be called here.
  // Guard env vars: on Vercel preview builds they may be absent;
  // returning [] is safe — Next.js will render those paths on demand.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return []
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

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
