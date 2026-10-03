import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { notFound } from 'next/navigation'
import { PartDetails } from '@/components/part/part-details'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { fetchPartSeoBySlug } from '@/lib/supabase/queries/part'
import {
  buildPartBreadcrumbTrail,
  buildPartJsonLd,
  buildPartSeoDescription,
  buildPartSeoTitle,
  partCanonicalPath,
  serializeJsonLd,
  toBreadcrumbLinks,
} from '@/lib/utils/seo'
import { resolveStorageUrl } from '@/lib/storage/url'
import { APP_NAME } from '@/lib/utils/constants'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

interface PartPageProps {
  params: Promise<{
    slug: string
  }>
}

/**
 * SEO metadata per part (issue #252): title/description carrying the brand
 * and product name, Open Graph tags, and the canonical URL. Shares the
 * cached fetchPartSeoBySlug query with the page component.
 */
export async function generateMetadata({ params }: PartPageProps): Promise<Metadata> {
  try {
    const { slug } = await params
    const part = await fetchPartSeoBySlug(slug)

    if (!part) {
      return {
        title: 'Part not found',
        description: 'The requested part could not be found.',
      }
    }

    const title = buildPartSeoTitle(part)
    const description = buildPartSeoDescription(part)
    const canonicalPath = partCanonicalPath(part.slug)
    const image = resolveStorageUrl(part.thumbnailUrl)

    // Relative URLs resolve against metadataBase (set in the root layout).
    return {
      title,
      description,
      keywords: part.tags.length > 0 ? part.tags.join(', ') : undefined,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title,
        description,
        url: canonicalPath,
        siteName: APP_NAME,
        type: 'website',
        images: image ? [{ url: image, alt: part.name }] : undefined,
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

export default async function PartPage({ params }: PartPageProps) {
  const { slug } = await params

  // Cached — reuses the generateMetadata query within the same request.
  const part = await fetchPartSeoBySlug(slug)

  if (!part) {
    notFound()
  }

  return (
    <Section>
      <Container size="xl" className="space-y-lg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildPartJsonLd(part)) }}
        />

        {/* Brand › Category › Product › Part — same trail as the JSON-LD. */}
        <Breadcrumbs
          items={toBreadcrumbLinks(buildPartBreadcrumbTrail(part))}
          className="text-text-secondary"
        />

        <PartDetails slug={slug} />

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
