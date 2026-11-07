import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { NavChip } from '@/components/browse/nav-chip'
import { PaginationLinks } from '@/components/browse/pagination-links'
import { ProductResultCard } from '@/components/search/product-result-card'
import {
  fetchBrandBySlug,
  fetchBrandNav,
  fetchBrandProductsPage,
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

interface BrandPageProps {
  params: Promise<{ brand: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const t = await getTranslations('Seo')
  try {
    const { brand: brandSlug } = await params
    const brand = await fetchBrandBySlug(brandSlug)

    if (!brand) {
      return { title: t('brandNotFoundTitle'), description: t('brandNotFoundDescription') }
    }

    const nav = await fetchBrandNav(brand.id)

    const title = t('brandTitle', { brand: brand.name })
    // Zero-part brands get generic copy rather than "0 parts" in a snippet.
    const description = seoDescription(
      t('brandDescription', {
        brand: brand.name,
        count: nav.parts_count,
        body: brand.description?.trim() || t('brandDescriptionBody', { app: APP_NAME }),
      }),
    )
    // The canonical never carries the page param — paginated views are
    // variants of the same listing.
    return {
      title,
      description,
      ...localizedPageMetadata(brandCanonicalPath(brand.slug), await getLocale(), {
        title,
        description,
        siteName: APP_NAME,
        type: 'website',
      }),
    }
  } catch (error) {
    console.error('Error generating brand page metadata:', error)
    return { title: t('brandFallbackTitle', { app: APP_NAME }), description: t('brandFallbackDescription') }
  }
}

/**
 * Brand navigation page (Flow P2): covered categories and the brand's
 * products with their denormalized parts counts. Totals and categories come
 * from the fetch_brand_nav aggregate so they stay accurate regardless of the
 * paginated product list. Text-only brand name — no logo (rights question
 * not settled). A brand with no remaining listed product keeps its page
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

  const [t, counts, crumbs, locale] = await Promise.all([
    getTranslations('BrandPage'),
    getTranslations('Counts'),
    getTranslations('Breadcrumbs'),
    getLocale(),
  ])
  const canonicalPath = brandCanonicalPath(brand.slug)
  const breadcrumbTrail = [
    ...rootBreadcrumbTrail({ home: crumbs('home'), browse: crumbs('browse') }),
    { name: brand.name },
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
            {brand.name}
          </h1>
          <p className="text-body text-text-secondary">
            {counts('printableAcrossProducts', { parts: nav.parts_count, products: nav.product_count })}
          </p>
          {brand.description && (
            <p className="text-body text-text-secondary">{brand.description}</p>
          )}
        </div>

        {nav.parts_count === 0 && (
          <p className="rounded-lg border border-border-subtle bg-bg-subtle p-md text-body text-text-secondary">
            {t('empty', { brand: brand.name })}
          </p>
        )}

        {nav.categories.length > 0 && (
          <section aria-labelledby="brand-categories" className="space-y-sm">
            <h2
              id="brand-categories"
              className="font-heading text-heading-sm font-semibold text-text-primary"
            >
              {t('categories')}
            </h2>
            <ul className="flex flex-wrap gap-sm">
              {nav.categories.map((category) => (
                <li key={category.id}>
                  <NavChip
                    href={brandCategoryCanonicalPath(brand.slug, category.slug)}
                    label={category.name}
                    caption={counts('parts', { count: category.parts_count })}
                  />
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
              {t('products')}
            </h2>
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
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
