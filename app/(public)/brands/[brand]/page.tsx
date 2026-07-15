import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { PaginationLinks } from '@/components/browse/pagination-links'
import { ProductResultCard } from '@/components/search/product-result-card'
import {
  fetchBrandBySlug,
  fetchBrandNav,
  fetchBrandProductsPage,
} from '@/lib/supabase/queries/brand-page'
import { APP_NAME } from '@/lib/utils/constants'
import { pluralize } from '@/lib/utils/formatters'
import { parsePageParam } from '@/lib/utils/validation'
import {
  brandCanonicalPath,
  brandCategoryCanonicalPath,
  buildBrandSeoDescription,
  buildBrandSeoTitle,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/utils/seo'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

interface BrandPageProps {
  params: Promise<{ brand: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  try {
    const { brand: brandSlug } = await params
    const brand = await fetchBrandBySlug(brandSlug)

    if (!brand) {
      return {
        title: 'Brand not found',
        description: 'The requested brand could not be found.',
      }
    }

    const nav = await fetchBrandNav(brand.id)

    const title = buildBrandSeoTitle(brand.name)
    const description = buildBrandSeoDescription({
      brandName: brand.name,
      partsCount: nav.parts_count,
      brandDescription: brand.description,
    })
    // The canonical never carries the page param — paginated views are
    // variants of the same listing.
    const canonicalPath = brandCanonicalPath(brand.slug)

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
    console.error('Error generating brand page metadata:', error)
    return {
      title: `${APP_NAME} — Brands`,
      description: 'Browse printable spare parts by brand.',
    }
  }
}

/**
 * Brand navigation page (Flow P2): covered categories and the brand's
 * products with their denormalized parts counts. Totals and categories come
 * from the fetch_brand_nav aggregate so they stay accurate regardless of the
 * paginated product list. Text-only brand name — no logo (rights question
 * not settled). A brand with no remaining published parts keeps its page
 * with an availability notice as long as it exists in the index; only
 * unknown slugs 404.
 */
export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const [{ brand: brandSlug }, { page: rawPage }] = await Promise.all([params, searchParams])
  const brand = await fetchBrandBySlug(brandSlug)
  if (!brand) notFound()

  const [nav, listing] = await Promise.all([
    fetchBrandNav(brand.id),
    fetchBrandProductsPage(brand.id, parsePageParam(rawPage)),
  ])

  const canonicalPath = brandCanonicalPath(brand.slug)
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(canonicalPath, [
    { name: 'Home', path: '/' },
    { name: 'Browse', path: '/browse' },
    { name: brand.name },
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
            { label: brand.name },
          ]}
        />

        <div className="space-y-xs">
          <h1 className="font-heading text-heading-lg font-semibold text-text-primary">
            {brand.name}
          </h1>
          <p className="text-body text-text-secondary">
            {pluralize(nav.parts_count, 'printable spare part')} across{' '}
            {pluralize(nav.product_count, 'product')}
          </p>
          {brand.description && (
            <p className="text-body text-text-secondary">{brand.description}</p>
          )}
        </div>

        {nav.parts_count === 0 && (
          <p className="rounded-lg border border-border-subtle bg-bg-subtle p-md text-body text-text-secondary">
            No parts currently available for {brand.name}. The catalog grows with demand.
          </p>
        )}

        {nav.categories.length > 0 && (
          <section aria-labelledby="brand-categories" className="space-y-sm">
            <h2
              id="brand-categories"
              className="font-heading text-heading-sm font-semibold text-text-primary"
            >
              Categories
            </h2>
            <ul className="flex flex-wrap gap-sm">
              {nav.categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={brandCategoryCanonicalPath(brand.slug, category.slug)}
                    className="inline-flex items-baseline gap-xs rounded-lg border border-border-subtle bg-bg-surface px-md py-xs text-body text-text-primary transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                  >
                    <span className="font-medium">{category.name}</span>
                    <span className="text-caption text-text-secondary">
                      {pluralize(category.parts_count, 'part')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {listing.products.length > 0 && (
          <section aria-labelledby="brand-products" className="space-y-sm">
            <h2
              id="brand-products"
              className="font-heading text-heading-sm font-semibold text-text-primary"
            >
              Products
            </h2>
            <div className="grid gap-sm sm:grid-cols-2">
              {listing.products.map((product) => (
                <ProductResultCard
                  key={product.id}
                  product={{
                    name: product.name,
                    slug: product.slug,
                    image_url: product.image_url,
                    category: product.category?.name ?? null,
                    parts_count: product.parts_count,
                  }}
                />
              ))}
            </div>
            <PaginationLinks
              basePath={canonicalPath}
              page={listing.page}
              totalPages={listing.totalPages}
            />
          </section>
        )}
      </Container>
    </Section>
  )
}
