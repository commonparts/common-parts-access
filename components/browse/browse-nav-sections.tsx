import Link from 'next/link'

import { pluralize } from '@/lib/utils/formatters'
import type { BrowseNav, BrowseNavBrand } from '@/lib/supabase/queries/browse-nav'

// Shared card-link styling for navigation tiles, consistent with the result
// cards used on /search.
const tileClassName =
  'group flex items-center justify-between gap-sm rounded-lg border border-border-subtle bg-bg-surface p-md shadow-surface transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface'

function BrandTile({ brand }: { brand: BrowseNavBrand }) {
  return (
    <Link href={`/brands/${brand.slug}`} className={tileClassName}>
      <span className="truncate font-heading text-sm font-semibold text-text-primary">
        {brand.name}
      </span>
      <span className="shrink-0 text-caption text-text-secondary">
        {pluralize(brand.parts_count, 'part')}
      </span>
    </Link>
  )
}

/**
 * Server-rendered navigation sections of the /browse hub (Flow P2): entry by
 * category and by brand, with denormalized parts_count aggregates displayed
 * as-is. Every link targets a dedicated crawlable route — category entries
 * resolve to brand-scoped listings (/brands/[brand]/[category]) since those
 * are the navigation pages; nothing here is a client-side filter state.
 */
export function BrowseNavSections({ nav }: { nav: BrowseNav }) {
  const hasCategories = nav.categories.length > 0
  const hasBrands = nav.brands.length > 0

  if (!hasCategories && !hasBrands) return null

  return (
    <div className="space-y-xl">
      {hasCategories && (
        <section aria-labelledby="browse-by-category" className="space-y-sm">
          <h2
            id="browse-by-category"
            className="font-heading text-heading-sm font-semibold text-text-primary"
          >
            Browse by category
          </h2>
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
            {nav.categories.map((category) => (
              <div
                key={category.id}
                className="space-y-sm rounded-lg border border-border-subtle bg-bg-surface p-md shadow-surface"
              >
                <div className="flex items-center justify-between gap-sm">
                  <h3 className="truncate font-heading text-sm font-semibold text-text-primary">
                    {category.name}
                  </h3>
                  <span className="shrink-0 text-caption text-text-secondary">
                    {pluralize(category.parts_count, 'part')}
                  </span>
                </div>
                <ul className="space-y-xs">
                  {category.brands.map((brand) => (
                    <li key={brand.id}>
                      <Link
                        href={`/brands/${brand.slug}/${category.slug}`}
                        className="inline-flex items-baseline gap-xs text-body text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <span className="font-medium">{brand.name}</span>
                        <span className="text-caption">{pluralize(brand.parts_count, 'part')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
            {nav.brands.map((brand) => (
              <BrandTile key={brand.id} brand={brand} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
