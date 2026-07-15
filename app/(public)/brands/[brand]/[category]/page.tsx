import type { Metadata } from 'next'
import Link from 'next/link'
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
import { pluralize } from '@/lib/utils/formatters'
import { parsePageParam } from '@/lib/utils/validation'
import {
  brandCanonicalPath,
  brandCategoryCanonicalPath,
  buildBrandCategorySeoDescription,
  buildBrandCategorySeoTitle,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
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
  try {
    const [{ brand: brandSlug, category: categorySlug }, { page: rawPage }] =
      await Promise.all([params, searchParams])
    const brand = await fetchBrandBySlug(brandSlug)
    if (!brand) {
      return {
        title: 'Brand not found',
        description: 'The requested brand could not be found.',
      }
    }

    const listing = await fetchBrandCategoryListing(
      brand.id,
      categorySlug,
      parsePageParam(rawPage),
    )
    if (!listing) {
      return {
        title: 'Category not found',
        description: 'The requested category could not be found.',
      }
    }

    const title = buildBrandCategorySeoTitle(brand.name, listing.category.name)
    const description = buildBrandCategorySeoDescription({
      brandName: brand.name,
      categoryName: listing.category.name,
      productCount: listing.total,
    })
    // The canonical never carries the page param — paginated views are
    // variants of the same listing.
    const canonicalPath = brandCategoryCanonicalPath(brand.slug, listing.category.slug)

    // Relative URLs resolve against metadataBase (set in the root layout).
    return {
      title,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title,
        description,
        url: canonicalPath,
        siteName: APP_NAME,
        type: 'website',
      },
    }
  } catch (error) {
    console.error('Error generating brand category page metadata:', error)
    return {
      title: `${APP_NAME} — Brands`,
      description: 'Browse printable spare parts by brand and category.',
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

  const canonicalPath = brandCategoryCanonicalPath(brand.slug, category.slug)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(canonicalPath, [
    { name: 'Home', path: '/' },
    { name: 'Browse', path: '/browse' },
    { name: brand.name, path: brandCanonicalPath(brand.slug) },
    { name: category.name },
  ])

  return (
    <Section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <Container size="lg" className="space-y-xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Browse', href: '/browse' },
            { label: brand.name, href: brandCanonicalPath(brand.slug) },
            { label: category.name },
          ]}
        />

        <div className="space-y-xs">
          <h1 className="font-heading text-heading-lg font-semibold text-text-primary">
            {brand.name} — {category.name}
          </h1>
          <p className="text-body text-text-secondary">
            {pluralize(total, 'product')} in this category
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-sm sm:grid-cols-2">
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
              No parts currently available for {brand.name} in {category.name}. The
              catalog grows with demand.
            </p>
            <Button asChild variant="outline">
              <Link href={brandCanonicalPath(brand.slug)}>View all {brand.name} products</Link>
            </Button>
          </div>
        )}

        <PaginationLinks basePath={canonicalPath} page={page} totalPages={totalPages} />
      </Container>
    </Section>
  )
}
