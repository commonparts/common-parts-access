import type { MetadataRoute } from 'next'

import { absoluteAppUrl } from '@/lib/utils/validation'

/**
 * /robots.txt (issue #257): points crawlers at the sitemap. Nothing is
 * disallowed, on purpose:
 * - /search pages carry a noindex robots meta tag, which a crawler can only
 *   read if it is allowed to fetch the page;
 * - part pages render their details client-side from /api/parts/[slug]/details,
 *   so blocking /api/ would keep crawlers from rendering them.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteAppUrl('/sitemap.xml'),
  }
}
