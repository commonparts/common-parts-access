import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
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
  partCanonicalPath,
  partFitLabel,
  rootBreadcrumbTrail,
  seoDescription,
  serializeJsonLd,
  toBreadcrumbLinks,
} from '@/lib/utils/seo'
import type { PartSeoData } from '@/types/parts'
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
 * Title and meta description of a part page, in the page's locale: the part
 * name with the brand and product it fits, then the part's own description.
 */
async function partSeoCopy(part: PartSeoData): Promise<{ title: string; description: string }> {
  const t = await getTranslations('Seo')
  const fit = partFitLabel(part)
  const body = part.description?.trim() || t('partDescriptionBody', { app: APP_NAME })
  return {
    title: fit ? t('partTitleFit', { part: part.name, fit }) : t('partTitle', { part: part.name }),
    description: seoDescription(
      fit
        ? t('partDescriptionFit', { part: part.name, fit, body })
        : t('partDescription', { part: part.name, body }),
    ),
  }
}

/**
 * SEO metadata per part (issue #252): title/description carrying the brand
 * and product name, Open Graph tags, and the canonical URL. Shares the
 * cached fetchPartSeoBySlug query with the page component.
 */
export async function generateMetadata({ params }: PartPageProps): Promise<Metadata> {
  const t = await getTranslations('Seo')
  try {
    const { slug } = await params
    const part = await fetchPartSeoBySlug(slug)

    if (!part) {
      return { title: t('partNotFoundTitle'), description: t('partNotFoundDescription') }
    }

    const { title, description } = await partSeoCopy(part)
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
    return { title: t('partFallbackTitle', { app: APP_NAME }), description: t('partFallbackDescription') }
  }
}

export default async function PartPage({ params }: PartPageProps) {
  const { slug } = await params

  // Cached — reuses the generateMetadata query within the same request.
  const part = await fetchPartSeoBySlug(slug)

  if (!part) {
    notFound()
  }

  const [t, crumbs, { description }] = await Promise.all([
    getTranslations('PartPage'),
    getTranslations('Breadcrumbs'),
    partSeoCopy(part),
  ])
  const rootTrail = rootBreadcrumbTrail({ home: crumbs('home'), browse: crumbs('browse') })

  return (
    <Section>
      <Container size="xl" className="space-y-lg">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildPartJsonLd(part, description, rootTrail)) }}
        />

        {/* Brand › Category › Product › Part — same trail as the JSON-LD. */}
        <Breadcrumbs
          items={toBreadcrumbLinks(buildPartBreadcrumbTrail(part, rootTrail))}
          className="text-text-secondary"
        />

        <PartDetails slug={slug} />

        <div className="text-center">
          <Button asChild variant="outline" className="inline-flex items-center gap-sm">
            <Link href="/browse">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              {t('browseMore')}
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
