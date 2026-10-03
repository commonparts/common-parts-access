/** A visitor's language and region, as far as the request tells us. */
export interface VisitorLocale {
  /** Lowercase primary language subtag of the top preference ("fr"), or null. */
  language: string | null
  /** Uppercase ISO 3166-1 alpha-2 region ("FR"), or null when none is stated. */
  region: string | null
}

// Upper bound on Accept-Language entries considered — the header is
// client-controlled, and real browsers send a handful at most.
const MAX_ACCEPT_LANGUAGE_ENTRIES = 20

const LANGUAGE_SUBTAG = /^[a-z]{2,3}$/i
const REGION_SUBTAG = /^[a-z]{2}$/i

/**
 * Reads the visitor's language and region from an Accept-Language header.
 *
 * The app has no geo-IP source (Railway sets no country header) and no region
 * setting, so the browser's language preferences are the region signal: the
 * region comes from the most preferred tag that states one ("fr-FR" → FR,
 * "zh-Hant-TW" → TW), so "fr, en-GB;q=0.8" yields language fr, region GB.
 * Malformed entries and the "*" wildcard are ignored; never throws.
 */
export function parseAcceptLanguage(header: string | null | undefined): VisitorLocale {
  if (!header) return { language: null, region: null }

  const entries = header
    .split(',')
    .slice(0, MAX_ACCEPT_LANGUAGE_ENTRIES)
    .map((entry, index) => {
      const [tag, ...params] = entry.trim().split(';')
      const qParam = params.find((param) => param.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1
      return { subtags: tag.trim().split('-'), q: Number.isFinite(q) ? q : 0, index }
    })
    .filter((entry) => entry.q > 0 && LANGUAGE_SUBTAG.test(entry.subtags[0]))
    // Highest q first; header order breaks ties.
    .sort((a, b) => b.q - a.q || a.index - b.index)

  const language = entries[0]?.subtags[0].toLowerCase() ?? null
  const region =
    entries
      .map((entry) => entry.subtags.slice(1).find((subtag) => REGION_SUBTAG.test(subtag)))
      .find((subtag): subtag is string => Boolean(subtag))
      ?.toUpperCase() ?? null

  return { language, region }
}

/**
 * Compact tag for a visitor locale: "fr-FR", "fr", or null when the language
 * is unknown. The region may come from a lower-ranked Accept-Language entry
 * (see parseAcceptLanguage), so this is the locale as the app understands it,
 * not necessarily a tag the browser sent.
 */
export function formatLocaleTag(locale: VisitorLocale): string | null {
  if (!locale.language) return null
  return locale.region ? `${locale.language}-${locale.region}` : locale.language
}
