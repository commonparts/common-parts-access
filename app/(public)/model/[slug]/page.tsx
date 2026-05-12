import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { ModelDetails } from '@/components/model/model-details'
import { createClient } from '@/lib/supabase/server'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

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
        title: 'Part Not Found',
        description: 'The requested part could not be found.'
      }
    }

    const userProfile = Array.isArray(model.user_profiles) ? model.user_profiles[0] : model.user_profiles
    const authorName = userProfile?.display_name || userProfile?.username || 'Unknown'
    
    return {
      title: `${model.name} - Part by ${authorName}`,
      description: model.description || `Download ${model.name}, a part created by ${authorName}. Find replacement parts and printable components.`,
      keywords: model.tags ? model.tags.join(', ') : undefined,
      openGraph: {
        title: `${model.name} - Part`,
        description: model.description || `Part created by ${authorName}`,
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
        title: `${model.name} - Part`,
        description: model.description || `Part created by ${authorName}`,
        images: model.thumbnail_url ? [model.thumbnail_url] : undefined
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Common Parts Access — Parts',
      description: 'Browse and download verified parts and repair components.'
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
            { label: 'Part' },
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
              Browse more parts
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
