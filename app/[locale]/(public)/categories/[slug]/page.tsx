import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { CategoryTile } from '@/components/browse/category-tile'
import { NavChip } from '@/components/browse/nav-chip'
import { Button } from '@/components/ui/button'
import {
  fetchCategoryPage,
  type CategoryPageData,
} from '@/lib/supabase/queries/category-page'
import { APP_NAME } from '@/lib/utils/constants'
import {
  brandCategoryCanonicalPath,
  buildBreadcrumbJsonLd,
  categoryCanonicalPath,
  rootBreadcrumbTrail,
  seoDescription,
  serializeJsonLd,
  toBreadcrumbLinks,
} from '@/lib/utils/seo'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

// Upper bound when collapsing single-child chains: the tree is 4 levels deep
// today, and the guard keeps a corrupted (cyclic) path column from looping.
const MAX_CHAIN_DEPTH = 4

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const t = await getTranslations('Seo')
  try {
    const { slug } = await params
    const data = await fetchCategoryPage(slug)
    if (!data) {
      return { title: t('categoryNotFoundTitle'), description: t('categoryNotFoundDescription') }
    }

    const title = t('categoryTitle', { category: data.category.name })
    // Zero-part categories get generic copy rather than "0 parts" in a
    // snippet; the show-zeros rule (Flow P2) governs on-page counts only.
    const description = seoDescription(
      t('categoryDescription', {
        category: data.category.name,
        parts: data.category.parts_count,
        products: data.category.product_count,
        app: APP_NAME,
      }),
    )
    const canonicalPath = categoryCanonicalPath(data.category.slug)

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
    console.error('Error generating category page metadata:', error)
    return {
      title: t('categoryFallbackTitle', { app: APP_NAME }),
      description: t('categoryFallbackDescription'),
    }
  }
}

/**
 * Hierarchical category drill-down page (issue #276, Flow P2): one crawlable
 * server-rendered route per category at any depth. Shows the direct children
 * with subtree-aggregated counts and, when the category has direct products,
 * the brands covering them (mixed nodes render both sections). Only children
 * and brands holding a listed product are shown (issues #312, #321); a category with
 * none renders the availability notice and an upward link. Single-child
 * chains are collapsed by inlining the lone child's content — a click never
 * reveals only one option.
 */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const data = await fetchCategoryPage(slug)
  if (!data) notFound()

  // Collapse single-child chains (e.g. Furniture → Storage Unit): while the
  // node has exactly one child and nothing else to show, descend and render
  // the descendant's content on this page instead of a one-option click.
  let effective: CategoryPageData = data
  let inlinedFrom: CategoryPageData['category'] | null = null
  for (
    let depth = 0;
    depth < MAX_CHAIN_DEPTH &&
    effective.children.length === 1 &&
    effective.brands.length === 0;
    depth++
  ) {
    const child = await fetchCategoryPage(effective.children[0].slug)
    if (!child) break
    inlinedFrom = child.category
    effective = child
  }

  const [t, counts, crumbs] = await Promise.all([
    getTranslations('CategoryPage'),
    getTranslations('Counts'),
    getTranslations('Breadcrumbs'),
  ])
  const canonicalPath = categoryCanonicalPath(data.category.slug)
  const breadcrumbTrail = [
    ...rootBreadcrumbTrail({ home: crumbs('home'), browse: crumbs('browse') }),
    ...data.ancestors.map((ancestor) => ({
      name: ancestor.name,
      path: categoryCanonicalPath(ancestor.slug),
    })),
    { name: data.category.name },
  ]
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(canonicalPath, breadcrumbTrail)

  // The "no parts" notice must never contradict the counts in the header:
  // if inconsistent data ever yields parts without navigable children or
  // brands, show nothing extra rather than a false claim (P-3).
  const isEmpty =
    effective.children.length === 0 &&
    effective.brands.length === 0 &&
    data.category.parts_count === 0
  // Upward escape for empty nodes: the nearest ancestor, or the hub.
  const parent = data.ancestors[data.ancestors.length - 1]
  const upwardHref = parent ? categoryCanonicalPath(parent.slug) : '/browse'
  const upwardLabel = parent ? t('backTo', { name: parent.name }) : t('backToBrowse')

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
            {data.category.name}
          </h1>
          <p className="text-body text-text-secondary">
            {counts('printableAcrossProducts', {
              parts: data.category.parts_count,
              products: data.category.product_count,
            })}
          </p>
        </div>

        {inlinedFrom && (
          <p className="text-body text-text-secondary">
            {t.rich('inlined', {
              category: data.category.name,
              child: inlinedFrom.name,
              link: (chunks) => (
                <Link
                  href={categoryCanonicalPath(inlinedFrom.slug)}
                  className="font-medium text-text-primary underline underline-offset-2 transition-colors hover:text-text-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}

        {isEmpty && (
          <div className="space-y-sm rounded-lg border border-border-subtle bg-bg-subtle p-lg">
            <p className="text-body text-text-secondary">
              {t('empty', { category: data.category.name })}
            </p>
            <Button asChild variant="outline">
              <Link href={upwardHref}>{upwardLabel}</Link>
            </Button>
          </div>
        )}

        {effective.children.length > 0 && (
          <section aria-labelledby="category-children" className="space-y-sm">
            <h2
              id="category-children"
              className="font-heading text-heading-sm font-semibold text-text-primary"
            >
              {t('subcategories')}
            </h2>
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
              {effective.children.map((child) => (
                <CategoryTile
                  key={child.id}
                  name={child.name}
                  href={categoryCanonicalPath(child.slug)}
                  partsCount={child.parts_count}
                  productCount={child.product_count}
                  // How the child drills further, so a visitor can tell a
                  // branch from a leaf before clicking.
                  hint={
                    child.children_count > 0
                      ? counts('subcategories', { count: child.children_count })
                      : null
                  }
                />
              ))}
            </div>
          </section>
        )}

        {effective.brands.length > 0 && (
          <section aria-labelledby="category-brands" className="space-y-sm">
            <h2
              id="category-brands"
              className="font-heading text-heading-sm font-semibold text-text-primary"
            >
              {t('brands')}
            </h2>
            <ul className="flex flex-wrap gap-sm">
              {effective.brands.map((brand) => (
                <li key={brand.id}>
                  <NavChip
                    href={brandCategoryCanonicalPath(brand.slug, effective.category.slug)}
                    label={brand.name}
                    caption={counts('parts', { count: brand.parts_count })}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </Section>
  )
}
