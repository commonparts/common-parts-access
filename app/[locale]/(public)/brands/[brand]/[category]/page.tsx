import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { PaginationLinks } from '@/components/browse/pagination-links'
import { ProductResultCard } from '@/components/search/product-result-card'
import { Button } from '@/components/ui/button'
import {
  fetchBrandBySlug,
  fetchBrandCategoryListing,
} from '@/lib/supabase/queries/brand-page'
import { APP_NAME } from '@/lib/utils/constants'
import { parsePageParam } from '@/lib/utils/validation'
import {
  brandCanonicalPath,
  brandCategoryCanonicalPath,
  buildBreadcrumbJsonLd,
  localizedPageMetadata,
  rootBreadcrumbTrail,
  seoDescription,
  serializeJsonLd,
  toBreadcrumbLinks,
} from '@/lib/utils/seo'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

interface BrandCategoryPageProps {
  params: Promise<{ brand: string; category: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({
  params,
  searchParams,
}: BrandCategoryPageProps): Promise<Metadata> {
  const t = await getTranslations('Seo')
  try {
    const [{ brand: brandSlug, category: categorySlug }, { page: rawPage }] =
      await Promise.all([params, searchParams])
    const brand = await fetchBrandBySlug(brandSlug)
    if (!brand) {
      return { title: t('brandNotFoundTitle'), description: t('brandNotFoundDescription') }
    }

    const listing = await fetchBrandCategoryListing(
      brand.id,
      categorySlug,
      parsePageParam(rawPage),
    )
    if (!listing) {
      return { title: t('categoryNotFoundTitle'), description: t('categoryNotFoundDescription') }
    }

    const names = { brand: brand.name, category: listing.category.name }
    const title = t('brandCategoryTitle', names)
    const description = seoDescription(
      t('brandCategoryDescription', { ...names, count: listing.total, app: APP_NAME }),
    )
    // The canonical never carries the page param — paginated views are
    // variants of the same listing.
    return {
      title,
      description,
      ...localizedPageMetadata(brandCategoryCanonicalPath(brand.slug, listing.category.slug), await getLocale(), {
        title,
        description,
        siteName: APP_NAME,
        type: 'website',
      }),
    }
  } catch (error) {
    console.error('Error generating brand category page metadata:', error)
    return {
      title: t('brandFallbackTitle', { app: APP_NAME }),
      description: t('brandCategoryFallbackDescription'),
    }
  }
}

/**
 * Brand-scoped category listing (Flow P2): the products of a brand within a
 * category, paginated. Target of the category crumb on product pages and a
 * primary SEO entry point ("spare part [brand] [category]"). An empty listing
 * for a known brand and category renders an availability notice — breadcrumbs
 * must never dead-end.
 */
export default async function BrandCategoryPage({
  params,
  searchParams,
}: BrandCategoryPageProps) {
  const [{ brand: brandSlug, category: categorySlug }, { page: rawPage }] =
    await Promise.all([params, searchParams])

  const brand = await fetchBrandBySlug(brandSlug)
  if (!brand) notFound()

  const listing = await fetchBrandCategoryListing(
    brand.id,
    categorySlug,
    parsePageParam(rawPage),
  )
  if (!listing) notFound()

  const { category, products, total, page, totalPages } = listing

  const [t, counts, crumbs, locale] = await Promise.all([
    getTranslations('BrandCategoryPage'),
    getTranslations('Counts'),
    getTranslations('Breadcrumbs'),
    getLocale(),
  ])
  const canonicalPath = brandCategoryCanonicalPath(brand.slug, category.slug)
  const breadcrumbTrail = [
    ...rootBreadcrumbTrail({ home: crumbs('home'), browse: crumbs('browse') }),
    { name: brand.name, path: brandCanonicalPath(brand.slug) },
    { name: category.name },
  ]
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(canonicalPath, breadcrumbTrail, locale)

  return (
    <Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Container size="lg" className="space-y-xl">
        <Breadcrumbs items={toBreadcrumbLinks(breadcrumbTrail)} />

        <div className="space-y-xs">
          <h1 className="font-heading text-heading-lg font-semibold text-text-primary">
            {t('title', { brand: brand.name, category: category.name })}
          </h1>
          <p className="text-body text-text-secondary">{counts('productsInCategory', { count: total })}</p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            {products.map((product) => (
              <ProductResultCard
                key={product.id}
                product={{
                  name: product.name,
                  slug: product.slug,
                  image_url: product.image_url,
                  // The category is already the page context — repeating it on
                  // every card adds nothing.
                  category: null,
                  parts_count: product.parts_count,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-sm rounded-lg border border-border-subtle bg-bg-subtle p-lg">
            <p className="text-body text-text-secondary">
              {t('empty', { brand: brand.name, category: category.name })}
            </p>
            <Button asChild variant="outline">
              <Link href={brandCanonicalPath(brand.slug)}>{t('viewAll', { brand: brand.name })}</Link>
            </Button>
          </div>
        )}

        <PaginationLinks basePath={canonicalPath} page={page} totalPages={totalPages} />
      </Container>
    </Section>
  )
}
