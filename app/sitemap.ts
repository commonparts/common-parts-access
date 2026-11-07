import type { MetadataRoute } from 'next'

import { fetchSitemapParts, fetchSitemapProducts } from '@/lib/supabase/queries/sitemap'
import { buildSitemap } from '@/lib/utils/sitemap'

// Reads the catalog through the cookie-based Supabase server client, so it
// cannot be rendered at build time.
export const dynamic = 'force-dynamic'

/**
 * /sitemap.xml (issue #257): brand pages, category pages, brand-scoped
 * category listings, product pages and part pages — only what public
 * navigation shows — and the contributor guide, once per locale. Referenced from /robots.txt.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, parts] = await Promise.all([fetchSitemapProducts(), fetchSitemapParts()])

  return buildSitemap(products, parts)
}
