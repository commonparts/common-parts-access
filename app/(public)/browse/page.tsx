import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { BrowseNavSections } from '@/components/browse/browse-nav-sections'
import { BrowsePartsGrid } from '@/components/browse/browse-parts-grid'
import { fetchBrowseNav, type BrowseNav } from '@/lib/supabase/queries/browse-nav'
import { APP_NAME } from '@/lib/utils/constants'

// This page uses cookies() via the Supabase server client,
// so it cannot be statically rendered at build time.
export const dynamic = 'force-dynamic'

const PAGE_TITLE = 'Browse parts'
const PAGE_DESCRIPTION =
  'Explore printable spare parts by category and brand, or filter the full parts catalog.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: '/browse',
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: '/browse',
    siteName: APP_NAME,
    type: 'website',
  },
}

/**
 * The /browse navigation hub (Flow P2): server-rendered entry navigation by
 * category and by brand, alongside the existing filterable parts grid. The
 * hub is pure exploration — /search owns everything query-related, and no
 * element here carries query-result semantics.
 */
export default async function BrowsePage() {
  // The hub must stay up even if the navigation RPC is unavailable (e.g. the
  // migration has not been applied yet): fall back to an empty nav — the
  // sections hide themselves — rather than failing the catalog entry point.
  let nav: BrowseNav = { brands: [], categories: [] }
  try {
    nav = await fetchBrowseNav()
  } catch (error) {
    // Log the message text, not the raw object: Supabase errors serialize to
    // "{}" in the Next.js dev overlay, hiding the actual cause (most likely
    // "fetch_browse_nav not found" while the migration is not applied yet).
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)
    console.error('Failed to load browse navigation:', message)
  }

  return (
    <Section>
      <Container size="xl" className="space-y-xl">
        <div className="space-y-xs">
          <h1 className="text-heading-md font-heading font-semibold text-text-primary">
            {PAGE_TITLE}
          </h1>
          <p className="text-body text-text-secondary">
            Discover and download parts and replacement components
          </p>
        </div>

        <BrowseNavSections nav={nav} />

        <section aria-labelledby="browse-all-parts" className="space-y-sm">
          <h2
            id="browse-all-parts"
            className="font-heading text-heading-sm font-semibold text-text-primary"
          >
            All parts
          </h2>
          <Suspense>
            <BrowsePartsGrid />
          </Suspense>
        </section>
      </Container>
    </Section>
  )
}
