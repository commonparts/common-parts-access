import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { CategoryTile } from '@/components/browse/category-tile'
import { pluralize } from '@/lib/utils/formatters'
import { categoryCanonicalPath } from '@/lib/utils/seo'
import type { BrowseNav, BrowseNavBrand } from '@/lib/supabase/queries/browse-nav'

/**
 * One line of the compact brand index. Brands with parts carry an emphasized
 * count badge; zero-count brands stay present as quiet links (their pages are
 * kept alive per Flow P2) so availability is signalled by emphasis, not by
 * hiding entries.
 */
function BrandIndexLink({ brand }: { brand: BrowseNavBrand }) {
  const hasParts = brand.parts_count > 0

  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="flex items-center justify-between gap-xs break-inside-avoid rounded-md py-xs pr-xs transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span
        className={
          hasParts ? 'truncate font-medium text-text-primary' : 'truncate text-text-secondary'
        }
      >
        {brand.name}
      </span>
      {hasParts && <Badge className="shrink-0">{pluralize(brand.parts_count, 'part')}</Badge>}
    </Link>
  )
}

/**
 * Server-rendered navigation sections of the /browse hub (Flow P2, reworked
 * for the hierarchical drill-down of issue #276): the level-0 category roots
 * as tiles with subtree-aggregated counts and example-leaf microcopy, and a
 * compact multi-column alphabetical brand index. Every link targets a
 * dedicated crawlable route (/categories/[slug], /brands/[brand]); nothing
 * here is a client-side filter state.
 */
export function BrowseNavSections({ nav }: { nav: BrowseNav }) {
  const hasRoots = nav.roots.length > 0
  const hasBrands = nav.brands.length > 0

  if (!hasRoots && !hasBrands) return null

  return (
    <div className="space-y-xl">
      {hasRoots && (
        <section aria-labelledby="browse-by-category" className="space-y-sm">
          <h2
            id="browse-by-category"
            className="font-heading text-heading-sm font-semibold text-text-primary"
          >
            Browse by category
          </h2>
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
            {nav.roots.map((root) => (
              <CategoryTile
                key={root.id}
                name={root.name}
                href={categoryCanonicalPath(root.slug)}
                partsCount={root.parts_count}
                productCount={root.product_count}
                hint={root.example_leaves.length > 0 ? root.example_leaves.join(', ') : null}
              />
            ))}
          </div>
        </section>
      )}

      {hasBrands && (
        <section aria-labelledby="browse-by-brand" className="space-y-sm">
          <h2
            id="browse-by-brand"
            className="font-heading text-heading-sm font-semibold text-text-primary"
          >
            Browse by brand
          </h2>
          <div className="columns-2 gap-md text-body sm:columns-3 lg:columns-4">
            {nav.brands.map((brand) => (
              <BrandIndexLink key={brand.id} brand={brand} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
