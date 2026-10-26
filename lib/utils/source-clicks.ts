/**
 * Where a click on a part's source link happened (issue #375): the part page
 * (primary button or Original post link) or a part card (provenance line).
 * Mirrors the check constraint on `part_source_clicks.context`.
 */
export const SOURCE_CLICK_CONTEXTS = ['part_page', 'card'] as const

export type SourceClickContext = (typeof SOURCE_CLICK_CONTEXTS)[number]

export function isSourceClickContext(value: unknown): value is SourceClickContext {
  return typeof value === 'string' && (SOURCE_CLICK_CONTEXTS as readonly string[]).includes(value)
}

export function sourceClickEndpoint(slug: string): string {
  return `/api/parts/${encodeURIComponent(slug)}/source-click`
}

/**
 * Records an anonymous click on a part's source link, without delaying the
 * navigation. The beacon is queued by the browser and survives the page being
 * left; fetch with keepalive is the fallback when the beacon is unavailable or
 * refused. Failures are logged and never block the link.
 */
export function sendSourceClick(slug: string, context: SourceClickContext): void {
  const url = sourceClickEndpoint(slug)
  const body = JSON.stringify({ context })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const queued = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    if (queued) return
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch((error: unknown) => {
    console.error('Source click tracking failed:', error)
  })
}
