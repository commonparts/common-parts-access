'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PartRequestCount } from '@/types/database'

interface DemandPanelProps {
  productIds: string[]
  productNames: Record<string, string>
  className?: string
}

interface ProductDemand {
  productId: string
  requests: PartRequestCount[]
}

/**
 * Read-only demand context (Flow P3 §4.3.5): open part-request counts for
 * each product selected in the curation session, so curation can be steered
 * by captured demand. Fetches per product and caches within the session.
 */
export function DemandPanel({ productIds, productNames, className }: DemandPanelProps) {
  const [demand, setDemand] = React.useState<ProductDemand[]>([])
  const [loading, setLoading] = React.useState(false)
  const cacheRef = React.useRef(new Map<string, PartRequestCount[]>())

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      if (productIds.length === 0) {
        setDemand([])
        return
      }

      setLoading(true)
      try {
        const results = await Promise.all(
          productIds.map(async (productId) => {
            const cached = cacheRef.current.get(productId)
            if (cached) return { productId, requests: cached }

            const res = await fetch(`/api/curation/demand?productId=${encodeURIComponent(productId)}`)
            const json = await res.json().catch(() => ({ requests: [] }))
            const requests: PartRequestCount[] = res.ok && Array.isArray(json.requests) ? json.requests : []
            cacheRef.current.set(productId, requests)
            return { productId, requests }
          }),
        )
        if (!cancelled) setDemand(results)
      } catch (error) {
        console.error('Failed to load demand context', error)
        if (!cancelled) setDemand([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [productIds])

  if (productIds.length === 0) return null

  const totalRequests = demand.reduce(
    (sum, d) => sum + d.requests.reduce((s, r) => s + r.request_count, 0),
    0,
  )

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Captured demand</CardTitle>
        {totalRequests > 0 && <Badge variant="secondary">{totalRequests} open requests</Badge>}
      </CardHeader>
      <CardContent className="space-y-sm">
        {loading && <p className="text-sm text-text-secondary">Loading demand…</p>}
        {!loading && totalRequests === 0 && (
          <p className="text-sm text-text-secondary">No open part requests for the selected products.</p>
        )}
        {!loading &&
          demand
            .filter((d) => d.requests.length > 0)
            .map((d) => (
              <div key={d.productId} className="space-y-2xs">
                <p className="text-sm font-medium text-text-primary">
                  {productNames[d.productId] ?? 'Selected product'}
                </p>
                <ul className="space-y-2xs">
                  {d.requests.map((r) => (
                    <li
                      key={`${d.productId}-${r.description}`}
                      className="flex items-center justify-between gap-sm rounded-md border border-border-subtle bg-bg-subtle px-sm py-2xs text-sm text-text-primary"
                    >
                      <span className="min-w-0 truncate">{r.description}</span>
                      <Badge variant="outline">{r.request_count}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
      </CardContent>
    </Card>
  )
}
