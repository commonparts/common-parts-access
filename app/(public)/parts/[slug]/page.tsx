import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { ModelDetails } from '@/components/model/model-details'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { fetchModelSeoBySlug } from '@/lib/supabase/queries/model'
import {
  buildModelJsonLd,
  buildModelSeoDescription,
  buildModelSeoTitle,
  serializeJsonLd,
} from '@/lib/utils/seo'
import { resolveStorageUrl } from '@/lib/storage/url'
import { APP_NAME } from '@/lib/utils/constants'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

interface ModelPageProps {
  params: Promise<{
    slug: string
  }>
}

/**
 * SEO metadata per part (issue #252): title/description carrying the brand
 * and product name, Open Graph tags, and the canonical URL. Shares the
 * cached fetchModelSeoBySlug query with the page component.
 */
export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const model = await fetchModelSeoBySlug(slug)

    if (!model) {
      return {
        title: 'Part not found',
        description: 'The requested part could not be found.',
      }
    }

    const title = buildModelSeoTitle(model)
    const description = buildModelSeoDescription(model)
    const canonicalPath = `/parts/${model.slug}`
    const image = resolveStorageUrl(model.thumbnailUrl)

    // Relative URLs resolve against metadataBase (set in the root layout).
    return {
      title,
      description,
      keywords: model.tags.length > 0 ? model.tags.join(', ') : undefined,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title,
        description,
        url: canonicalPath,
        siteName: APP_NAME,
        type: 'website',
        images: image ? [{ url: image, alt: model.name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
    }
  } catch (error) {
    console.error('Error generating part page metadata:', error)
    return {
      title: `${APP_NAME} — Parts`,
      description: 'Browse and download verified parts and repair components.',
    }
  }
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params

  // Cached — reuses the generateMetadata query within the same request.
  const model = await fetchModelSeoBySlug(slug)

  if (!model) {
    notFound()
  }

  return (
    <Section>
      <Container size="xl" className="space-y-lg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildModelJsonLd(model)) }}
        />

        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Browse', href: '/browse' },
            { label: model.name },
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
