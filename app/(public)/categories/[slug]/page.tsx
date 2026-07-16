import type { Metadata } from 'next'
import Link from 'next/link'
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
import { pluralize } from '@/lib/utils/formatters'
import {
  brandCategoryCanonicalPath,
  buildBreadcrumbJsonLd,
  buildCategorySeoDescription,
  buildCategorySeoTitle,
  categoryCanonicalPath,
  serializeJsonLd,
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
  try {
    const { slug } = await params
    const data = await fetchCategoryPage(slug)
    if (!data) {
      return {
        title: 'Category not found',
        description: 'The requested category could not be found.',
      }
    }

    const title = buildCategorySeoTitle(data.category.name)
    const description = buildCategorySeoDescription({
      categoryName: data.category.name,
      partsCount: data.category.parts_count,
      productCount: data.category.product_count,
    })
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
      title: `${APP_NAME} — Categories`,
      description: 'Browse printable spare parts by category.',
    }
  }
}

/**
 * Sub-hint for a child tile: how it drills further ("2 subcategories"), so a
 * visitor can tell a branch from a leaf before clicking. pluralize() cannot
 * inflect -y/-ies, hence the manual form.
 */
function childDrillHint(childrenCount: number): string | null {
  if (childrenCount === 0) return null
  return `${childrenCount} ${childrenCount === 1 ? 'subcategory' : 'subcategories'}`
}

/**
 * Hierarchical category drill-down page (issue #276, Flow P2): one crawlable
 * server-rendered route per category at any depth. Shows the direct children
 * with subtree-aggregated counts and, when the category has direct products,
 * the brands covering them (mixed nodes render both sections). Single-child
 * chains are collapsed by inlining the lone child's content — a click never
 * reveals only one option. Zero-count entries stay visible but muted (P-3).
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

  const canonicalPath = categoryCanonicalPath(data.category.slug)
  const crumbAncestors = data.ancestors.map((ancestor) => ({
    name: ancestor.name,
    path: categoryCanonicalPath(ancestor.slug),
  }))
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(canonicalPath, [
    { name: 'Home', path: '/' },
    { name: 'Browse', path: '/browse' },
    ...crumbAncestors,
    { name: data.category.name },
  ])

  const isEmpty = effective.children.length === 0 && effective.brands.length === 0
  // Upward escape for empty nodes: the nearest ancestor, or the hub.
  const parent = data.ancestors[data.ancestors.length - 1]
  const upwardHref = parent ? categoryCanonicalPath(parent.slug) : '/browse'
  const upwardLabel = parent ? `Back to ${parent.name}` : 'Back to browse'

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
            ...crumbAncestors.map((ancestor) => ({
              label: ancestor.name,
              href: ancestor.path,
            })),
            { label: data.category.name },
          ]}
        />

        <div className="space-y-xs">
          <h1 className="font-heading text-heading-lg font-semibold text-text-primary">
            {data.category.name}
          </h1>
          <p className="text-body text-text-secondary">
            {pluralize(data.category.parts_count, 'printable spare part')} across{' '}
            {pluralize(data.category.product_count, 'product')}
          </p>
        </div>

        {inlinedFrom && (
          <p className="text-body text-text-secondary">
            Everything in {data.category.name} currently sits under{' '}
            <Link
              href={categoryCanonicalPath(inlinedFrom.slug)}
              className="font-medium text-text-primary underline underline-offset-2 transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {inlinedFrom.name}
            </Link>
            .
          </p>
        )}

        {isEmpty && (
          <div className="space-y-sm rounded-lg border border-border-subtle bg-bg-subtle p-lg">
            <p className="text-body text-text-secondary">
              No parts currently available in {data.category.name}. The catalog grows
              with demand.
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
              Subcategories
            </h2>
            <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
              {effective.children.map((child) => (
                <CategoryTile
                  key={child.id}
                  name={child.name}
                  href={categoryCanonicalPath(child.slug)}
                  partsCount={child.parts_count}
                  productCount={child.product_count}
                  hint={childDrillHint(child.children_count)}
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
              Brands
            </h2>
            <ul className="flex flex-wrap gap-sm">
              {effective.brands.map((brand) => (
                <li key={brand.id}>
                  <NavChip
                    href={brandCategoryCanonicalPath(brand.slug, effective.category.slug)}
                    label={brand.name}
                    caption={pluralize(brand.parts_count, 'part')}
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
