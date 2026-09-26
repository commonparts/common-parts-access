import type { MetadataRoute } from 'next'

import { fetchSitemapParts, fetchSitemapProducts } from '@/lib/supabase/queries/sitemap'
import { buildSitemapPaths } from '@/lib/utils/sitemap'
import { absoluteAppUrl } from '@/lib/utils/validation'

// Reads the catalog through the cookie-based Supabase server client, so it
// cannot be rendered at build time.
export const dynamic = 'force-dynamic'

/**
 * /sitemap.xml (issue #257): brand pages, category pages, brand-scoped
 * category listings, product pages and part pages — only what public
 * navigation shows. Referenced from /robots.txt.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, parts] = await Promise.all([fetchSitemapProducts(), fetchSitemapParts()])

  return buildSitemapPaths(products, parts).map(({ path, lastModified }) => ({
    url: absoluteAppUrl(path),
    ...(lastModified ? { lastModified } : {}),
  }))
}
